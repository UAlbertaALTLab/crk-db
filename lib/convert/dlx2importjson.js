import compare       from '../utilities/compare.js';
import createSpinner from 'ora';
import fs            from 'fs-extra';
import parseCategory from '../utilities/parseCategory.js';
import readNDJSON    from '../utilities/readNDJSON.js';
import sortKeys      from 'sort-keys';

const parentheticalTextRegExp = /\s*\(\s*(?<parentheticalText>.+?)\s*\)\s*/gu;

/**
 * Converts a single Plains Cree entry in DaFoDiL format to import JSON format.
 * @param   {Object} dlxEntry The DaFoDiL entry to convert.
 * @returns {Object}          Returns an Object in import JSON format.
 */
function convertEntry({
  category,
  fst = {},
  head,
  key,
  lexicalRelations = [],
  literalMeaning,
  paradigm,
  senses,
}) {

  const { inflectionalCategory, pos, wordClass } = parseCategory(category);

  const formOf = lexicalRelations.find(relation => relation.relationType === `formOf`)?.key;

  const linguistInfo = {
    inflectional_category: inflectionalCategory,
    pos,
    stem:                  fst.stem,
    wordclass:             wordClass,
  };

  senses = senses.map(({ definition, original, sources }) => {

    // const parentheticalText = extractParentheticalText(definition);

    // The `definition` property passed to this callback is the definition without notes,
    // but including content in parentheses.

    const displayDefinition  = original;
    const coreDefinition     = definition.replace(/\s*\(.{3,}?\)\s*/gu, ` `).trim(); // strip any content in parentheses
    const semanticDefinition = coreDefinition.trim();

    const sense = {
      definition: displayDefinition,
      sources,
    };

    if (coreDefinition !== displayDefinition) sense.coreDefinition = coreDefinition;
    if (semanticDefinition !== displayDefinition) sense.semanticDefinition = semanticDefinition;

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
