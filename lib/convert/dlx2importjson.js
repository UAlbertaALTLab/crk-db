import compare       from '../utilities/compare.js';
import fs            from 'fs-extra';
import parseCategory from '../utilities/parseCategory.js';
import readNDJSON    from '../utilities/readNDJSON.js';

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

  return {
    analysis:     fst.analysis,
    formOf,
    fstLemma:     fst.analysis ? undefined : fst.lemma,
    head:         head.sro,
    linguistInfo: formOf ? undefined : linguistInfo,
    paradigm:     formOf ? undefined : paradigm,
    senses,
    slug:         key,
  };

}

/**
 * Converts an array of DLx entries to import JSON format.
 * @param   {String} inputPath
 * @param   {String} [outputPath='out.json']
 * @returns {Array}
 */
export default async function(inputPath, outputPath = `out.json`) {

  const dlx = await readNDJSON(inputPath);

  const entries = dlx
  .map(convertEntry)
  .sort((a, b) => compare(a.slug, b.slug));

  await writeJSON(outputPath, entries, { spaces: 2 });

  return entries;

}
