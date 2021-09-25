import compare       from '../utilities/compare.js';
import fs            from 'fs-extra';
import parseCategory from '../utilities/parseCategory.js';
import readNDJSON    from '../utilities/readNDJSON.js';
import sortKeys      from 'sort-keys';

const { writeJSON } = fs;

/**
 * Converts a single Plains Cree entry in DaFoDiL format to import JSON format.
 * @param   {Object} dlxEntry The DaFoDiL entry to convert.
 * @returns {Object}          Returns an Object in import JSON format.
 */
function convertEntry(
  {
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

    const ret = {
      definition: original,
      sources,
    };

    if (definition !== original) ret.coreDefinition = definition;
    if (literalMeaning) ret.semanticDefinition = `${ definition } ${ literalMeaning }`;

    return ret;

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

  const dlx = await readNDJSON(inputPath);

  const entries = dlx
  .filter(entry => entry.dataSources.CW)
  .map(convertEntry)
  .sort((a, b) => compare(a.slug?.normalize(`NFD`), b.slug?.normalize(`NFD`)) || compare(a.head.normalize(`NFD`), b.head.normalize(`NFD`)));

  await writeJSON(outputPath, entries, { spaces: 2 });

  return entries;

}
