# Updating the Database for itwêwina
This document describes the current process to generate a complete `inputjson` file for morphodict from the available sources (most of them described in the main README of this repo).

As referenced in UAlbertaALTLab/crk-db#108, the process is:

1. Update dictionary sources
2. Update LEXC sources based on updated dictionary sources
3. Compile new FSTs in giellalt/lang-crk
4. Aggregate and process dictionary sources into an `importjson` file for uploading to the intelligent dictionary
5. Update the internal database for the intelligent dictionary, including whatever genration of forms in paradigms or English translation equivalents.

## 1. Update dictionary sources

(From UAlbertaALTLab/crk-db#108): ***The following steps should be equivalent to running the `altlab/crk/bin/update-crk-dictionary-sources-2-lexc.sh` script from the private repo.***

0. Update Cree Words (CW) source file CreeDict-x in Carleton repo

```
svn up
```

1. Remove Windows-style CR characters from CW source, and copy this over to ALTLab repo

```
cat PlainsLexUni/CreeDict-x | tr -d '\r' > altlab/crk/dicts/Wolvengrey_altlab.toolbox
```
***Note: A version of this file lives in the private altlab repo at `crk/dicts/`***

2. Convert this Toolbox file into TSV format:

```
cat altlab/crk/dicts/Wolvengrey_altlab.toolbox | altlab/crk/bin/toolbox2tsv.sh > altlab/crk/generated/Wolvengrey_altlab.tsv
```

3. Compare against Maskwacîs Dictionary content, and add unique entries (and associated stem and inflectional class information) after the CW entries:

```
altlab/crk/bin/add-md-entries-2-after-cw-tsv.sh altlab/crk/generated/Wolvengrey_altlab.tsv altlab/crk/dicts/Maskwacis_altlab.tsv > altlab/crk/generated/altlab.tsv
```

## 2. Update LEXC sources based on updated dictionary sources

4. Generate LEXC source for individual parts-of-speech from this ALTLab aggregated TSV file:

```
cat altlab/crk/generated/altlab.tsv | altlab/crk/bin/altlab2lexc.sh 'N' > altlab/crk/generated/noun_stems.lexc
cat altlab/crk/generated/altlab.tsv | altlab/crk/bin/altlab2lexc.sh 'V' > altlab/crk/generated/verb_stems.lexc
```

5. Add copyright headers to LEXC sources, and copy over giellalt/lang-crk/src/fst/stems/

```
cat giellalt/lang-crk/src/fst/stems/noun_header.lexc altlab/crk/generated/noun_stems.lexc > giellalt/lang-crk/src/fst/stems/noun_stems.lexc
cat giellalt/lang-crk/src/fst/stems/verb_header.lexc altlab/crk/generated/verb_stems.lexc > giellalt/lang-crk/src/fst/stems/verb_stems.lexc
```

## 3. Compile new FSTs in `giellalt/lang-crk`
Follow the instructions from https://github.com/giellalt/lang-crk, once you are in the repo:

```
./autogen-sh
./configure
make
```

Make sure you have provided the desired configuration options to `./configure` to generate the FSTs you are interested in.

From both  UAlbertaALTLab/morphodict/257 and  UAlbertaALTLab/crk-db#109, the process can also be performed with the 

The following are explicit instructions on creating a descriptive analyzer and normative generator (with morpheme boundaries) from updated LEXC source (undertaken in #108):

1. Create basic morphological model

If one has compiled the aggregate LEXC file, `lexicon.tmp.lexc`, with the regular GiellaLT compilation scheme, one can use that file as the primary source.

```
read lexc src/fst/lexicon.tmp.lexc
define Morphology
```

Otherwise, one can compile the aggregate file as follows:

`cat src/fst/root.lexc src/fst/stems/noun_stems.lexc src/fst/stems/verb_stems.lexc src/fst/stems/particles.lexc src/fst/stems/pronouns.lexc src/fst/stems/numerals.lexc src/fst/affixes/noun_affixes.lexc src/fst/affixes/verb_affixes.lexc > lexicon.tmp.lexc `

2. Create basic phonological model

```
source src/fst/phonology.xfscript
define Phonology
```

 3. Create filters for removing a) word fragments and b) orthographically non-standard forms.

```
regex ~[ $[ "+Err/Frag" ]];
define removeFragments

regex ~[ $[ "+Err/Orth" ]];
define removeNonStandardForms
```

 4. Create filter to select only forms belonging to dictionary parts-of-speech.

```
regex $[ "+N" | "+V" | "+Ipc" | "+Pron" ];
define selectDictPOS
```

 5. Compose normative generator.

```
set flag-is-epsilon ON
regex [ selectDictPOS .o. removeNonStandardForms .o. removeFragments .o. Morphology .o. Phonology ];
save stack generator-gt-dict-norm.hfst
define NormativeGenerator
```

 6. Specify transcriptor to remove special morpheme boundary characters.

```
regex [ [ "<" | ">" | "/" ] -> 0 ];
define removeBoundaries
```

 7. Load in basic model for spell relaxation.

```
load src/orthography/spellrelax.compose.hfst
define SpellRelax
```

 8. Compose descriptive analyzer

```
regex [ selectDictPOS .o. removeFragments .o. Morphology .o. Phonology .o. removeBoundaries .o. SpellRelax ];
# regex [ NormativeGenerator .o. removeBoundaries .o. SpellRelax ];
invert net
save stack analyser-gt-dict-desc.hfst
define DescriptiveAnalyser
```

Normally, the necessary FSTs would be created according to the standard GiellaLT compilation configruration, with the option `--enable-dicts`.

## 4. Aggregate and process dictionary sources into an `importjson` file for uploading to the intelligent dictionary

This process is described on the `README.md` file in https://github.com/UAlbertaALTLab/crk-db but we currently document it here for completeness:

0. Install node.js and run `npm install` in the repo.

1. Collect the "original" data sources created from previous steps, in the `$CRK_DB_REPO/data` folder:
   - The `altlab.tsv` file
   - The `Maskwacis.tsv` file
   - The `Wolvengrey.toolbox` file
   
2. Run the following command:
```
node rpm build
```

After this command is run, the `data/crkeng_dictionary.importjson` file will be generated.

***NOTE: The scripts currently pull via LFS two HFSTs:  `src/crkeng/resources/fst/crk-relaxed-analyzer-for-dictionary.hfstol` and `src/crkeng/resoures/fst/crk-strict-analyzer-for-dictionary.hfstol`.***.  These FSTs are used in the `lib/aggregate/index.js` file.

## 5. Update the internal database for the intelligent dictionary, including whatever genration of forms in paradigms or English translation equivalents.

For updating the server, please follow the instructions on https://github.com/fbanados/crk-db/tree/update-db-docs#steps-to-incrementally-update-the-production-database .

To update your local database, go to the `morphodict` repo and run

```
./crkeng-manage importjsondict crkeng_dictionary.importjson
```
