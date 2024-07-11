import createSpinner         from 'ora';
import { createWriteStream } from 'fs';
import DatabaseIndex         from '../utilities/DatabaseIndex.js';
import readNDJSON            from '../utilities/readNDJSON.js';
import { Transducer }        from 'hfstol';
import writeNDJSON           from '../utilities/writeNDJSON.js';

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
 * Updates an ALTLab entry with data from a AECD entry.
 * @param  {Object} dbEntry
 * @param  {Object} aecdEntry
 * @return {Object} Returns the updated ALTLab entry.
 */
function updateEntry(dbEntry, aecdEntry) {
  dbEntry.dataSources.AECD = aecdEntry;
  return dbEntry;
}

/**
 * A class representing an ALTLab database entry.
 */
class DatabaseEntry {

  /**
   * Create a new database entry from an AECD entry.
   * @param {Object} aecdEntry
   */
  constructor(aecdEntry) {

    this.dataSources    ??= {};
    this.dataSources.AECD   = aecdEntry;
  
    this.head  = Object.assign({}, aecdEntry.head);
    this.lemma = Object.assign({}, aecdEntry.lemma);
    this.pos   = aecdEntry.pos;
  
    aecdEntry.matched = true;
  
    return this;
  }

}

/**
 * Imports the AECD entries into the ALTLab database.
 * @param  {String} aecdPath
 * @param  {String} dbPath
 * @param  {String} [fstPath]
 * @param  {Object} [options={}]
 * @param  {String} [report] The path where you would like the report generated.
 */
export default async function importAECD(aecdPath, dbPath, fstPath, { report } = {}) {

  const readDatabaseSpinner = createSpinner(`Reading databases.`).start();

  const aecdEntries      = await readNDJSON(aecdPath);
  const dbEntries      = await readNDJSON(dbPath);
  const unmatched      = [];
  let   entriesUpdated = 0;

  readDatabaseSpinner.succeed(`Databases read into memory.`);

  const indexSpinner = createSpinner(`Indexing database.`).start();
  const dbIndex      = new DatabaseIndex(dbEntries, createkey);

  indexSpinner.succeed(`Database indexed.`);

  const importSpinner = createSpinner(`Importing AECD entries.`).start();
  const fst           = fstPath ? new Transducer(fstPath) : null;

  for (const aecdEntry of aecdEntries) {

    let dbEntry;

    // match by mapping
    if (aecdEntry.mapping) {
      const key = aecdEntry.mapping.lemma;
      dbEntry   = dbIndex.get(key);
    }

    // match by SRO
    if (!dbEntry) {
      const key = aecdEntry.head.ae;
      dbEntry   = dbIndex.get(key);
      
    }

    // match by FST with spell relax
    if (fst && !dbEntry) {

      const matches = fst.lookup(aecdEntry.head.ae);

      if (matches.length === 1) {
        const [analysis] = matches;
        const [lemma]    = analysis.split(`+`);
        dbEntry          = dbIndex.get(lemma);
      }

      // TODO: Attempt to determine which FST analysis is the correct match.
      // Try the POS first.
      // Try the English translation to disambiguate.
      // Then try a bag of words approach.

    }

    // multiple entries match: attempt to determine correct entry
    if (Array.isArray(dbEntry)) {

      let matches = dbEntry;

      // match by mapping
      if (!aecdEntry.mapping) {
        unmatched.push(aecdEntry);
        continue;
      }

      // match by POS
      const [, fstPos] = aecdEntry.mapping.analysis.split(/\+/gu);

      matches = matches
      .filter(entry => getPos(entry.pos) === getPos(fstPos))
      .filter(Boolean);

      

      if (matches.length === 1) {
        [dbEntry] = matches;
      } else {
        unmatched.push(aecdEntry);
        continue;
      }

    }

    // no match found: add to unmatched entries
    if (!dbEntry) {
      unmatched.push(aecdEntry);
      continue;
    }

    // single match found: update database entry
    updateEntry(dbEntry, aecdEntry);
    entriesUpdated++;

  }

  for (const mdEntry of unmatched) {
    dbIndex.add(new DatabaseEntry(mdEntry))
  }

  importSpinner.succeed(`AECD entries imported.`);

  const writeSpinner = createSpinner(`Writing entries to database file.`).start();
  const entries      = Array.from(dbIndex.values()).flat();

  await writeNDJSON(dbPath, entries);
  await writeNDJSON(`data/AECD-unmatched.ndjson`, unmatched);

  writeSpinner.succeed(`Entries written to database file.`);

  console.info(`\n`);
  console.table({
    'Entries updated:':         entriesUpdated,
    'Entries without a match:': unmatched.length,
  });

  if (report) {

    const reportSpinner = createSpinner(`Generating report of unmatched entries.`).start();
    const writeStream   = createWriteStream(report);

    writeStream.write(`head\tPOS\toriginal\t\n`);

    for (const { head, original, pos } of unmatched) {
      writeStream.write(`${ head.ae }\t${ pos }\t${ original }`);
    }

    writeStream.end();
    reportSpinner.succeed();

  }

}
