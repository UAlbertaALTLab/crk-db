import createSpinner from 'ora';
import DatabaseIndex from '../utilities/DatabaseIndex.js';
import readNDJSON    from '../utilities/readNDJSON.js';
import readTSV       from '../utilities/readTSV.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';

function createKey(entry) {
  return `${ entry.lemma.proto }@${ entry.pos }`;
}

/**
 * Update an aggregate database entry based on an ALTLab entry.
 * @param  {Object} dbEntry
 * @param  {Object} altlabEntry
 * @return {Object} Returns the original aggregate database entry, modified.
 */
function updateEntry(dbEntry, altlabEntry) {

  dbEntry.dataSources ??= {};
  dbEntry.fst         ??= {};

  dbEntry.dataSources.ALT = altlabEntry;
  dbEntry.fst.stem        = altlabEntry.fst.stem;

  return dbEntry;

}

/**
 * Imports data from the ALTLab data source into the aggregate database.
 * @param  {String}  altlabPath                The path to the ALTLab data file.
 * @param  {String}  dbPath                    The path to the aggregate database.
 * @param  {String}  [outputPath=`out.ndjson`] The path where you would like the updated database stored.
 * @return {Promise}
 */
export default async function importALTLab(altlabPath, dbPath, outputPath = `out.ndjson`) {

  const loadSpinner   = createSpinner(`Reading databases into memory.`).start();
  const altlabEntries = await readTSV(altlabPath);
  const dbEntries     = await readNDJSON(dbPath);
  const dbIndex       = new DatabaseIndex(dbEntries, createKey);
  let numUnmatched    = 0;
  loadSpinner.succeed(`Databases read into memory.`);

  const importSpinner = createSpinner(`Importing ALTLab entries into database.`).start();

  for (let altlabEntry of altlabEntries) {

    altlabEntry = {
      fst: {
        stem: altlabEntry.fst_stem || altlabEntry.stem,
      },
      lemma: {
        proto: altlabEntry.proto,
      },
      pos:  altlabEntry.pos,
      stem: altlabEntry.stem,
    };

    const key     = createKey(altlabEntry);
    const dbEntry = dbIndex.get(key);

    if (!dbEntry) {
      numUnmatched++;
      continue;
    }

    // NOTE: All ALTLab entries currently only match to just one aggregate entry.
    // No check is needed to see if multiple results are found.

    updateEntry(dbEntry, altlabEntry);

  }

  importSpinner.succeed(`ALTLab entries imported.`);

  const writeSpinner = createSpinner(`Writing to database file.`).start();

  await writeNDJSON(outputPath, dbEntries);

  writeSpinner.succeed(`Database file updated.`);

  console.info(`\n`);
  console.table({
    '# ALTLab entries':    altlabEntries.length,
    '# matched entries':   altlabEntries.length - numUnmatched,
    '# unmatched entries': numUnmatched,
  });

}
