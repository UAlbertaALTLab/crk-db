/**
 * Imports the MD entries into the ALTLab database.
 */

import createHomographKey from '../utilities/createHomographKey.js';
import createMDKey        from '../utilities/createMDKey.js';
import Index              from '../utilities/DatabaseIndex.js';
import loadEntries        from '../utilities/loadEntries.js';
import saveDatabase       from '../utilities/saveDatabase.js';

/**
 * A class for an ALTLab database entry.
 */
class DBEntry {

  /**
   * Create a new ALTLab database entry from an MD entry.
   * @param {Object} mdEntry The MD entry to create the database entry from.
   */
  constructor(mdEntry) {

    mdEntry.matched = true;

    this.dataSources = {
      MD: mdEntry,
    };

    this.lemma = {
      sro: mdEntry.mapping?.lemma_CW ?? mdEntry.lemma.md,
    };

    this.senses = mdEntry.senses
    .map(sense => Object.assign({}, sense, { dataSource: `MD` }));

  }

}

/**
 * Imports the MD entries into the ALTLab database.
 * @param  {String}  mdPath       The path to the MD NDJSON file.
 * @param  {String}  databasePath The path to the ALTLab database.
 * @return {Promise}              Returns a Promise that resolves to the Array of ALTLab database entries.
 */
export default async function importMD(mdPath, databasePath, { silent = false } = {}) {

  const db             = await loadEntries(databasePath);
  const md             = await loadEntries(mdPath);
  let   entriesAdded   = 0;
  let   entriesDeleted = 0;

  const primaryIndex = new Index(db, (entry, index) => createHomographKey(entry.lemma.sro, index));

  const cwIndex = new Index(db, ({ dataSources: { CW: cwEntry } }) => {
    if (cwEntry) return `${ cwEntry.lemma.plains }:${ cwEntry.definition }`;
  });
  const cwKeys = Array.from(cwIndex.keys());

  const mdIndex = new Index(db, ({ dataSources: { MD: mdEntry } }) => {
    if (mdEntry) return createMDKey(mdEntry);
  });

  // Keep track of which existing MD subentries in the database have been
  // matched to an entry in the current MD database being imported.
  for (const [, mdEntry] of mdIndex) {
    mdEntry.matched = false;
  }

  let unmatchedMappings = 0;

  // Match each entry in the MD database to an existing ALTLab entry,
  // or create a new entry in the ALTLab database.
  for (const mdEntry of md) {

    // attempt to get ALTLab entry by matching its MD subentry
    const mdKey   = createMDKey(mdEntry);
    let   dbEntry = mdIndex.get(mdKey);

    // attempt to get ALTLab entry by using the MD > CW mapping
    if (!dbEntry && mdEntry.mapping) {

      // attempt to find an entry with the full lemma + definition
      const { definition_CW, lemma_CW } = mdEntry.mapping;
      dbEntry = cwIndex.get(`${ lemma_CW }:${ definition_CW }`);

      // if there's still no match, attempt to get ALTLab entry using just the lemma
      if (!dbEntry) {
        const matchedKey = cwKeys.find(key => key.startsWith(lemma_CW));
        dbEntry          = cwIndex.get(matchedKey);
      }

      // no match found
      if (!dbEntry) unmatchedMappings++;

    }

    // If there's a matching ALTLab entry, update it.
    if (dbEntry) {
      mdEntry.matched        = true;
      dbEntry.dataSources.MD = mdEntry;
      continue;
    }

    // If there's not a matching ALTLab entry, create one
    // and add it to indexes.
    const newEntry = new DBEntry(mdEntry);
    primaryIndex.add(newEntry);
    cwIndex.add(newEntry);
    mdIndex.add(newEntry);
    entriesAdded++;

  }

  // clean up MD subentries
  for (const [key, dbEntry] of mdIndex) {

    const mdEntry = dbEntry.dataSources.MD;

    if (mdEntry.matched) {
      // remove unnecessary properties from subentry
      delete mdEntry.key;
      delete mdEntry.matched;
    } else {
      // remove MD data sources that were never matched
      // (this means they no longer exist in the original MD database / mappings table)
      delete dbEntry.dataSources.MD;
      mdIndex.remove(key);
    }

  }

  // Set the "key" property of any entries that are missing it.
  // AND Remove database entries without data sources.
  for (const [key, dbEntry] of primaryIndex) {

    if (Object.keys(dbEntry.dataSources).length) {
      dbEntry.key = key;
      continue;
    }

    primaryIndex.remove(key);
    entriesDeleted++;

  }

  const entries = Array.from(primaryIndex.values());

  if (!silent) {
    /* eslint-disable sort-keys */
    console.info(`\n`);
    console.table({
      'Size of database prior to import': db.length,
      'Entries to import':                md.length,
      'Entries deleted':                  entriesDeleted,
      'Entries added':                    entriesAdded,
      'Mappings without a match':         unmatchedMappings,
      'Net change in database size':      entries.length - db.length,
      'Size of database after import':    entries.length,
    });
  }

  await saveDatabase(databasePath, entries, { silent });

  return entries;

}
