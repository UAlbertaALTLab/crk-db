# Updating the Database for itwêwina
This document describes the current process to generate a complete `inputjson` file for morphodict from the available sources (most of them described in the main README of this repo).

As referenced in UAlbertaALTLab/crk-db#108, the process is:

1. Update dictionary sources
2. Update LEXC sources based on updated dictionary sources
3. Compile new FSTs in giellalt/lang-crk
4. Aggregate and process dictionary sources into an `importjson` file for uploading to the intelligent dictionary
5. Update the internal database for the intelligent dictionary, including whatever geenration of forms in paradigms or English translation equivalents.

## 1. Update dictionary sources

(From UAlbertaALTLab/crk-db#108)

0. Update Cree Words (CW) source file CreeDict-x in Carleton repo

```
svn up
```

1. Remove Windows-style CR characters from CW source, and copy this over to ALTLab repo

```
cat PlainsLexUni/CreeDict-x | tr -d '\r' > altlab/crk/dicts/Wolvengrey_altlab.toolbox
```

2. Convert this Toolbox file into TSV format:

```
cat altlab/crk/dicts/Wolvengrey_altlab.toolbox | altlab/crk/bin/toolbox2tsv.sh > altlab/crk/generated/Wolvengrey_altlab.tsv
```

3. Compare against Maskwacîs Dictionary content, and add unique entries (and associated stem and inflectional class information) after the CW entries:

```
altlab/crk/bin/add-md-entries-2-after-cw-tsv.sh altlab/crk/generated/Wolvengrey_altlab.tsv altlab/crk/dicts/Maskwacis_altlab.tsv > altlab/crk/generated/altlab.tsv
```

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
