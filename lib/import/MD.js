import createSpinner from 'ora';
import readNDJSON    from '../utilities/readNDJSON.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';

function createKey(sro, pos) {
  sro = sro.replace(/\s+/gu, `_`);
  return `${ sro }@${ pos }`;
}

/**
 * A class representing a database index.
 * @extends Map
 */
class DatabaseIndex extends Map {

  /**
   * Create a new database index. Assumes all entries unique SRO headword + POS combinations.
   * @param {Array} entries An array of database entries to index.
   */
  constructor(entries) {

    super();

    for (const entry of entries) {
      this.add(entry);
    }

  }

  /**
   * Adds an entry to the index.
   * @param {Object} entry The entry to add to the index.
   */
  add(entry) {

    const key           = createKey(entry.lemma.sro, entry.pos);
    const existingEntry = this.get(key);

    if (existingEntry) {

      if (Array.isArray(existingEntry)) {
        existingEntry.push(entry);
        return this;
      }

      return this.set(key, [existingEntry, entry]);

    }

    return this.set(key, entry);

  }

  /**
   * Removes an entry from the index.
   * @param  {String} key The key of the entry to remove from the index.
   * @return {Map}
   */
  remove(key) {
    return this.delete(key);
  }

}

/**
 * Imports the MD entries into the ALTLab database.
 * @param  {String} mdPath
 * @param  {String} dbPath
 */
export default async function importMD(mdPath, dbPath) {

  const readDatabaseSpinner = createSpinner(`Reading databases.`).start();

  const mdEntries      = await readNDJSON(mdPath);
  const dbEntries      = await readNDJSON(dbPath);
  const originalDBSize = dbEntries.length;
  const   entriesUpdated = 0;
  const   entriesAdded   = 0;

  readDatabaseSpinner.succeed(`Databases read into memory.`);

  const indexSpinner = createSpinner(`Indexing database.`).start();
  const dbIndex      = new DatabaseIndex(dbEntries);

  indexSpinner.succeed(`Database indexed.`);

  for (const mdEntry of mdEntries) {


  }

  const writeSpinner = createSpinner(`Writing entries to database file.`).start();
  const entries      = Array.from(dbIndex.values()).flat();

  await writeNDJSON(dbPath, entries);

  writeSpinner.succeed(`Entries written to database file.`);

  console.info(`\n`);
  console.table({
    'Size of database prior to import:': originalDBSize,
    'Entries added:':                    entriesAdded,
    'Entries updated:':                  entriesUpdated,
    'Net change in database size:':      entries.length - originalDBSize,
    'Size of database after import:':    entries.length,
  });

}
