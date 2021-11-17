import compare       from '../utilities/compare.js';
import createSpinner from 'ora';
import fs            from 'fs-extra';
import parseCategory from '../utilities/parseCategory.js';
import readNDJSON    from '../utilities/readNDJSON.js';
import sortKeys      from 'sort-keys';

const instrRegExp     = /^by\s+/u;
const latinNoteRegExp = /[ei]\.\s*[eg]\./iu;

// NOTE: There must be white space before the opening parenthesis for this to match.
// This prevents matches on things like "house(s)".
const parentheticalRegExp = /(?<parenthetical>\s+\(\s*(?<parenText>.+?)\s*\)\s*)/gu;

const EnglishPronouns = new Set([
  `his/her own`,
  `him/herself`,
  `it as`,
  `it/him`,
  `it`,
  `of it`,
  `of something`,
  `on s.t.`,
  `s.o. as`,
  `s.t.`,
  `something`,
  `that`,
  `them`,
  `to it/him`,
  `to something`,
]);

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
}, i) {

  const { inflectionalCategory, pos, wordClass } = parseCategory(category);

  const formOf = lexicalRelations.find(relation => relation.relationType === `formOf`)?.key;

  const linguistInfo = {
    inflectional_category: inflectionalCategory,
    pos,
    stem:                  fst.stem,
    wordclass:             wordClass,
  };

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
    const coreDefinition    = createCoreDefinition(definition);

    const semanticDefinition = createSemanticDefinition(definition, {
      i,
      isPronoun,
      literalMeaning,
      notes,
      scientificName,
    });

    const sense = {
      definition: displayDefinition,
      sources,
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

function createCoreDefinition(definition) {

  let coreDefinition = definition;
  let match;

  while ((match = parentheticalRegExp.exec(coreDefinition)) !== null) {

    const { parenText, parenthetical } = match.groups;

    // allow desired parentheticals
    if (
      instrRegExp.test(parenText) || // allow "by" phrases (instrumentals)
      EnglishPronouns.has(parenText) // allow pronouns
    ) {
      continue;
    }

    // remove all other parentheticals (including "e.g." and "i.e." parentheticals)
    coreDefinition = coreDefinition.replace(parenthetical, ` `);

  }

  return coreDefinition
  .replace(/\s{2,}/gu, ` `)
  .replace(/\s+,/gu, `,`)
  .trim();

}

function createSemanticDefinition(definition, { isPronoun, literalMeaning, notes, scientificName }) {

  let semanticDefinition = definition;
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

    // if (definition.includes(`s/he is a star`)) {
    //   console.log(`\n`);
    //   console.log(semanticDefinition);
    //   console.log(semanticDefinition.replace(EnglishFunctionWordsRegExp, ``));
    //   console.log(semanticDefinition.replace(EnglishAbbrevsRegExp, ``));
    // }

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
  .filter(entry => entry.dataSources.CW) // only show entries that have a CW source
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

  return entries;

}
