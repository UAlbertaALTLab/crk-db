import createSpinner  from 'ora';
import DatabaseIndex  from '../utilities/DatabaseIndex.js';
import readNDJSON     from '../utilities/readNDJSON.js';
import { Transducer } from 'hfstol';
import writeNDJSON    from '../utilities/writeNDJSON.js';

function getPos(str) {
  if (!str) return ``;
  if (str.startsWith(`N`)) return `N`;
  if (str.startsWith(`V`)) return `V`;
  if (str.startsWith(`Pr`)) return `Pro`;
  if (str.startsWith(`I`)) return `Part`;
  return ``;
}

function createkey(entry) {
  return entry.lemma.sro;
}

/**
 * Updates an ALTLab entry with data from a MD entry.
 * @param  {Object} dbEntry
 * @param  {Object} mdEntry
 * @return {Object} Returns the updated ALTLab entry.
 */
function updateEntry(dbEntry, mdEntry) {
  dbEntry.dataSources.MD = mdEntry;
  return dbEntry;
}

/**
 * Imports the MD entries into the ALTLab database.
 * @param  {String} mdPath
 * @param  {String} dbPath
 */
export default async function importMD(mdPath, dbPath, fstPath) {

  const readDatabaseSpinner = createSpinner(`Reading databases.`).start();

  const mdEntries      = await readNDJSON(mdPath);
  const dbEntries      = await readNDJSON(dbPath);
  const unmatched      = [];
  let   entriesUpdated = 0;

  readDatabaseSpinner.succeed(`Databases read into memory.`);

  const indexSpinner = createSpinner(`Indexing database.`).start();
  const dbIndex      = new DatabaseIndex(dbEntries, createkey);

  indexSpinner.succeed(`Database indexed.`);

  const importSpinner = createSpinner(`Importing MD entries.`).start();
  const fst           = fstPath ? new Transducer(fstPath) : null;

  for (const mdEntry of mdEntries) {

    let dbEntry;

    // match by mapping
    if (mdEntry.mapping) {
      const key = mdEntry.mapping.lemma;
      dbEntry   = dbIndex.get(key);
    }

    // match by SRO
    if (!dbEntry) {
      const key = mdEntry.lemma.md;
      dbEntry   = dbIndex.get(key);
    }

    // match by FST with spell relax
    if (fst && !dbEntry) {

      const matches = fst.lookup(mdEntry.lemma.md);

      if (matches.length === 1) {
        const [analysis] = matches;
        const [lemma]    = analysis.split(`+`);
        dbEntry          = dbIndex.get(lemma);
      }

      // TODO: Attempt to determine which FST analysis is the correct match.
      // Try the POS first.
      // Then try a bag of words approach.

    }

    // multiple entries match: attempt to determine correct entry
    if (Array.isArray(dbEntry)) {

      let matches = dbEntry;

      // match by mapping
      if (!mdEntry.mapping) {
        unmatched.push(mdEntry);
        continue;
      }

      // match by POS
      const [, fstPos] = mdEntry.mapping.analysis.split(/\+/gu);

      matches = matches
      .filter(entry => getPos(entry.pos) === getPos(fstPos))
      .filter(Boolean);

      if (matches.length === 1) {
        [dbEntry] = matches;
      } else {
        unmatched.push(mdEntry);
        continue;
      }

    }

    // no match found: add to unmatched entries
    if (!dbEntry) {
      unmatched.push(mdEntry);
      continue;
    }

    // single match found: update database entry
    updateEntry(dbEntry, mdEntry);
    entriesUpdated++;

  }

  importSpinner.succeed(`MD entries imported.`);

  const writeSpinner = createSpinner(`Writing entries to database file.`).start();
  const entries      = Array.from(dbIndex.values()).flat();

  await writeNDJSON(dbPath, entries);
  await writeNDJSON(`data/MD-unmatched.ndjson`, unmatched);

  writeSpinner.succeed(`Entries written to database file.`);

  console.info(`\n`);
  console.table({
    'Entries updated:':         entriesUpdated,
    'Entries without a match:': unmatched.length,
  });

}
