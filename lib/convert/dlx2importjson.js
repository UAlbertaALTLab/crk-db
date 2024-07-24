import compare              from '../utilities/compare.js';
import createSpinner        from 'ora';
import fs                   from 'fs-extra';
import parseCategory        from '../utilities/parseCategory.js';
import readNDJSON           from '../utilities/readNDJSON.js';
import writeNDJSON           from '../utilities/writeNDJSON.js';
import removeParentheticals from '../utilities/removeParentheticals.js';
import sortKeys             from 'sort-keys';

const instrRegExp     = /^by\s+/u;
const latinNoteRegExp = /[ei]\.\s*[eg]\./iu;

// NOTE: There must be white space before the opening parenthesis for this to match.
// This prevents matches on things like "house(s)".
const parentheticalRegExp = /(?<parenthetical>\s+\(\s*(?<parenText>.+?)\s*\)\s*)/gu;

const EnglishAbbrevs = [
  `s\\.o\\.`,
  `s\\.t\\.`,
  `s\\.w\\.`,
];

const EnglishAbbrevsRegExp = new RegExp(`(${ EnglishAbbrevs.join(`|`) })`, `giu`);

const EnglishFunctionWords = [
  `a`,
  `an`,
  `and`,
  `as`,
  `by`,
  `for`,
  `he`,
  `her`,
  `herself`,
  `him`,
  `himself`,
  `his`,
  `I`,
  `is`,
  `it`,
  `its`,
  `its`,
  `me`,
  `mine`,
  `my`,
  `no`,
  `not`,
  `of`,
  `or`,
  `our`,
  `ours`,
  `s/he`,
  `she`,
  `so`,
  `some`,
  `that`,
  `the`,
  `their`,
  `theirs`,
  `them`,
  `them`,
  `these`,
  `they`,
  `this`,
  `those`,
  `to`,
  `us`,
  `we`,
  `you`,
  `your`,
  `yours`,
  `with`,
];

const EnglishFunctionWordsRegExp = new RegExp(`\\b(${ EnglishFunctionWords.join(`|`) })\\b`, `giu`);

const AlwaysRemovedKeywords = [
  `Var\\.`,
  `Alt\\.`
]

const AlwaysRemovedKeywordsRegExp = new RegExp(`\\b(${ AlwaysRemovedKeywords.join(`|`) })`, `giu`);


/**
 * Converts a single Plains Cree entry in DaFoDiL format to import JSON format.
 * @param   {Object} dlxEntry The DaFoDiL entry to convert.
 * @returns {Object}          Returns an Object in import JSON format.
 */
function convertEntry({
  category,
  dataSources,
  fst = {},
  head,
  key,
  lexicalRelations = [],
  literalMeaning,
  paradigm,
  senses,
  rw_domains = [],
  rw_indices = [],
  wn_domains = [],
}, i) {

  const { inflectionalCategory, pos, wordClass } = parseCategory(category);

  const formOf = lexicalRelations.find(relation => relation.relationType === `formOf`)?.key;

  const linguistInfo = {
    inflectional_category: inflectionalCategory,
    pos,
    stem:                  fst.stem,
    wordclass:             wordClass,
    rw_domains,
    rw_indices,
    wn_domains,
  };

  if(dataSources.CW?.htmlInfo) {
    linguistInfo.analysis = dataSources.CW.htmlInfo;
  }

  // If an entry lacks senses, it's because the definition consists of nothing but notes.
  // In this case, populate a sense based on CW's original definition, without brackets.
  if (!senses.length) {

    let { definition } = dataSources.CW; // the original content of the \def field
    definition = definition.replaceAll(/\[|\]/gu, ``);

    senses.push({
      definition: ``,
      original:   definition,
      sources:    [`CW`],
    });

  }

  senses = senses.map(({ definition, notes, original, scientificName, sources }) => {

    // The `definition` property passed to this callback is the definition without notes,
    // but including content in parentheses.

    // Senses can have 1 or more sense-level notes.
    // As currently parsed, Toolbox entries don't currently have any entry-level notes.

    const isPronoun         = pos === `PrA`;
    const displayDefinition = original;
    const coreDefinition    = removeParentheticals(definition.replaceAll(AlwaysRemovedKeywordsRegExp, ``));

    const semanticDefinition = createSemanticDefinition(definition, {
      i,
      isPronoun,
      literalMeaning,
      notes,
      scientificName,
    });

    const sense = {
      definition: displayDefinition,
      sources: Array.from(new Set(sources)),
    };

    if (coreDefinition && coreDefinition !== displayDefinition) sense.coreDefinition = coreDefinition;
    if (semanticDefinition && semanticDefinition !== displayDefinition) sense.semanticDefinition = semanticDefinition;

    return sense;

  });

  const entry = {
    analysis: fst.analysis,
    head:     head.sro,
    senses,
  };

  if (formOf) {
    entry.formOf = formOf;
  } else {
    Object.assign(entry, {
      linguistInfo,
      paradigm,
      slug: key,
    });
  }

  // recursively sorting keys makes diffs between database versions easier to read
  return sortKeys(entry, {
    compare(a, b) {
      return compare(a.normalize(`NFD`), b.normalize(`NFD`));
    },
    deep: true,
  });

}

function createSemanticDefinition(definition, { isPronoun, literalMeaning, notes, scientificName }) {

  let semanticDefinition = definition.replaceAll(AlwaysRemovedKeywordsRegExp, ``);
  let match;

  while ((match = parentheticalRegExp.exec(semanticDefinition)) !== null) {

    const { parenText, parenthetical } = match.groups;

    // allow desired parentheticals
    if (instrRegExp.test(parenText)) { // allow "by" phrases
      semanticDefinition = semanticDefinition.replace(parenthetical, ` ${ parenText } `); // remove parentheses
      continue;
    }

    // remove extraneous text from "e.g." and "i.e." parentheticals
    if (latinNoteRegExp.test(parenText)) {
      const cleanedText = parenText.replace(latinNoteRegExp, ``);
      semanticDefinition = semanticDefinition.replace(parenthetical, cleanedText); // remove "e.g." and "i.e."
      continue;
    }

    // remove all other parentheticals
    semanticDefinition = semanticDefinition.replace(parenthetical, ` `);

  }

  if (literalMeaning) semanticDefinition += ` ${ literalMeaning }`;
  if (scientificName) semanticDefinition += ` ${ scientificName }`;

  if (notes) {

    notes = notes.filter(note => note.noteType === `general`);

    for (const note of notes) {
      semanticDefinition += ` ${ note.text }`;
    }

  }

  if (!isPronoun) {
    semanticDefinition = semanticDefinition
    .replace(EnglishFunctionWordsRegExp, ``) // issue is happening here
    .replace(EnglishAbbrevsRegExp, ``);      // or here
  }

  semanticDefinition = semanticDefinition
  .replace(/[,.!?'"/]/gu, ``)
  .replace(/\s{2,}/gu, ` `)
  .replace(/\(\)/gu, ` `)
  .trim();

  return semanticDefinition;

}

/**
 * Converts an array of DLx entries to import JSON format.
 * @param   {String} inputPath
 * @param   {String} [outputPath='out.json']
 * @returns {Array}
 */
export default async function dlx2importjson(inputPath, outputPath = `out.json`) {

  const readDatabaseSpinner = createSpinner(`Reading database.`).start();
  const dlx                 = await readNDJSON(inputPath);
  readDatabaseSpinner.succeed(`Database loaded.`);

  const conversionSpinner = createSpinner(`Converting entries.`).start();

  const entries = dlx
  .map(convertEntry)
  .sort((a, b) => compare(a.slug?.normalize(`NFD`), b.slug?.normalize(`NFD`)) || compare(a.head.normalize(`NFD`), b.head.normalize(`NFD`)));

  conversionSpinner.succeed(`Entries converted.`);

  if (outputPath) {

    const writeFileSpinner = createSpinner(`Writing to import JSON file.`).start();
    const writeStream      = fs.createWriteStream(outputPath);

    writeStream.write(`[\n`);

    entries.forEach((entry, i) => {
      const json = JSON.stringify(entry, null, 2);
      const suffix = i === entries.length - 1 ? `\n` : `,\n`;
      writeStream.write(`${ json }${ suffix }`);
    });

    writeStream.write(`]`);
    writeStream.end();
    writeFileSpinner.succeed(`Import JSON file created.`);

  }

  await validateImportJson(entries, createSpinner('Verifying correct structure of importjson file.').start());
  

  return entries;

}

function getDuplicateEntries( list ) {
  const counts = new Map();
  list.forEach((entry, index) => {
    if (counts.has(entry)) {
      counts.get(entry).push(index)
    } else {
      counts.set(entry, [index])
    }
  });
  return counts.entries().filter(entry => entry[1].length > 1)
}

/**
 * Verify that the entries generated in the importjson are consistent with the constraints expected by morphodict.
 */
async function validateImportJson ( entries, spinner) {
  /** in "lexicon_sourcelanguagekeyword" CONSTRAINT "source_kw_text_and_wordform" UNIQUE ("text", "wordform_id")); */
  /** in  "lexicon_targetlanguagekeyword" CONSTRAINT "target_kw_text_and_wordform" UNIQUE ("text", "wordform_id")) */
  /** slugs must be unique */

  const duplicateSlugs = Array.from(getDuplicateEntries(entries.map(entry => entry.slug).filter(entry=>entry)));

  if (duplicateSlugs.length > 0 ) {
    console.log(`ERROR: MULTIPLE ENTRIES WITH SAME KEY PRESENT\n${duplicateSlugs.toString()}`)  
    return spinner.fail('Importjson will not import correctly into morphodict.')
  }

  const groupByWordform = Array.from(getDuplicateEntries(
    entries.map(entry => entry.slug || (entry.formOf ? entry.head+' of '+entry.formOf : entry.head))
  )).map(entry => [entry[0], entry[1].map(i => entries[i])]);

  function targetLanguageKeywordsNotUnique ( entries ) {
    return Array.from(getDuplicateEntries(
      entries.map(entry => entry.senses.map(sense => (sense.semanticDefinition || sense.definition).split(' ')).flat()).flat()
    )).length > 1;
  }

  const guaranteedToFailConstraints = groupByWordform
    .filter(entry => targetLanguageKeywordsNotUnique(entry[1]));

  await writeNDJSON(`data/brittle-entries.json`, groupByWordform);
  if (guaranteedToFailConstraints.length > 0 ){
    console.log(`\n\nERROR: SOME ENTRIES HAVE DEFINITIONS WHOSE TargetLanguageKeyword ENTRIES ARE NOT UNIQUE!\n${guaranteedToFailConstraints.toString()}`);
    spinner.fail('Importjson will not import correctly into morphodict')
    throw new Error();
  } else {
    console.log([
      'Warning:  There are brittle entries in this importjson where small changes in definitions may break the import process',
      'Please see the documentation and the data/brittle_entries.json file'
    ].join("."));
  }

  return spinner.succeed('Importjson should work with morphodict.')

}
