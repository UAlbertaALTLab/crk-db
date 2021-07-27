import createSpinner from 'ora';
import readTSV       from '../utilities/readTSV.js';
import writeTSV      from '../utilities/writeTSV.js';

const mappingsColumns = [
  `lemma_MD`,
  `lemma_CW`,
  `definition_MD`,
  `definition_CW`,
  `matchType`,
  `fstStem`,
];

const updatedDatabaseColumns = [
  `SRO`,
  `Syllabics`,
  `POS`,
  `MeaningInEnglish`,
  `RapidWordsClasses`,
  `RapidWordIndices`,
  `English_POS`,
  `English_Search`,
  `Cross_References`,
  `Examples`,
  `Parentheticals`,
  `CW_Lemma`,
  `CW_Definition`,
  `FST_Stem`,
  `MatchType`,
];

/**
 * Imports the MD > CW mappings and adds them to the MD database. This script is intended to only be run once.
 * @param  {String} mappingsPath        The path to the MD > CW mappings file.
 * @param  {String} databasePath        The path to the MD datbase file.
 * @param  {String} [outPath='out.tsv'] The path where the merged data should be saved.
 */
export default async function importCWMappings(mappingsPath, databasePath, outPath = `out.tsv`) {

  const loadDataSpinner = createSpinner(`Reading data files.`).start();
  const mappings        = await readTSV(mappingsPath, { columns: mappingsColumns });
  const maskwacis       = await readTSV(databasePath);
  loadDataSpinner.succeed(`Data files loaded in memory.`);

  // create an index of the MD database

  const indexSpinner = createSpinner(`Indexing Maskwacîs database.`).start();
  const index = new Map;

  for (const entry of maskwacis) {

    const existingEntry = index.get(entry.SRO);

    if (!existingEntry) {
      index.set(entry.SRO, entry);
      continue;
    }

    if (Array.isArray(existingEntry)) existingEntry.push(entry);
    else index.set(entry.SRO, [existingEntry, entry]);

  }

  indexSpinner.succeed(`Maskwacîs database indexed.`);

  // update MD entries with CW mappings

  const updateSpinner = createSpinner(`Updating Maskwacîs database with mappings data.`).start();
  const unmatched     = [];

  for (const mapping of mappings) {

    const {
      definition_CW,
      definition_MD,
      fstStem,
      lemma_CW,
      lemma_MD,
      matchType,
    } = mapping;

    // attempt to find a matching MD entry

    let match = index.get(lemma_MD);

    if (!match) {
      unmatched.push(mapping);
      continue;
    }

    if (Array.isArray(match)) {
      match = match.find(entry => entry.MeaningInEnglish === definition_MD);
      if (!match) unmatched.push(mapping);
      continue;
    }

    // update MD entry with the CW mapping

    Object.assign(match, {
      // NOTE: The order of these properties needs to match the order of these columns in the TSV.
      CW_Definition: definition_CW,
      CW_Lemma:      lemma_CW.replace(`1: `, ``),
      FST_Stem:      fstStem,
      MatchType:     matchType,
    });

  }

  updateSpinner.succeed(`Maskwacîs database updated with mappings data.`);

  // write merged database to file

  const writeFileSpinner = createSpinner(`Writing database to file.`).start();

  await writeTSV(outPath, maskwacis, {
    columns: updatedDatabaseColumns,
    header:  true,
  });

  writeFileSpinner.succeed(`Database written to ${ outPath }.`);

  if (unmatched.length) {
    console.warn(`\n${ unmatched.length } mappings could not be matched to an entry in the Maskwacîs database.\n`);
  }

}
