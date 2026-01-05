import createSpinner         from 'ora';
import { createWriteStream } from 'fs';
import DatabaseIndex         from '../utilities/DatabaseIndex.js';
import readNDJSON            from '../utilities/readNDJSON.js';
import { Transducer }        from 'hfstol';
import writeNDJSON           from '../utilities/writeNDJSON.js';
import { mergeBaseEntry }    from '../convert/CW.js';

function getPos(str) {
  if (!str) return ``;
  if (str.startsWith(`N`)) return `N`;
  if (str.startsWith(`V`)) return `V`;
  if (str.startsWith(`Pr`)) return `Pro`;
  if (str.startsWith(`I`)) return `Part`;
  return ``;
}

function createkey(entry) {
  return entry.head.sro;
}

/**
 * Updates an ALTLab entry with data from a AECD entry.
 * @param  {Object} dbEntry
 * @param  {Object} aecdEntry
 * @return {Object} Returns the updated ALTLab entry.
 */
function updateEntry(dbEntry, aecdEntry) {
  dbEntry.dataSources.AECD = aecdEntry;
  dbEntry.candidateFST ??= aecdEntry.Analysis;
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
  
    if (aecdEntry.lemma.ae == '+?' || aecdEntry.lemma.ae == '') {
      mergeBaseEntry ( this, aecdEntry.original, aecdEntry.head.syll)
    } else {
      this.head ??= {
        sro: aecdEntry.head.ae,
        proto: aecdEntry.head.ae,
        syll: aecdEntry.head.syll
      }
      this.lemma ??= {
        sro: aecdEntry.lemma.ae,
        proto: aecdEntry.lemma.ae,
        syll: aecdEntry.lemma.syll
      }
    }
    this.candidateFST=aecdEntry.Analysis;

    this.pos ??= aecdEntry.pos;
  
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
  const unstandardized = [];
  const incorrect_analysis = [];
  let entriesUpdated = 0;
  let entriesSkipped = 0;

  readDatabaseSpinner.succeed(`Databases read into memory.`);

  const indexSpinner = createSpinner(`Indexing database.`).start();
  const dbIndex      = new DatabaseIndex(dbEntries, createkey);
  const accented_y   = Map.groupBy(dbIndex.keys(), key => key.split('@')[0].replace(/ý/gu,"y"));

  indexSpinner.succeed(`Database indexed.`);

  const importSpinner = createSpinner(`Importing AECD entries.`).start();
  const fst           = fstPath ? new Transducer(fstPath) : null;

  for (const aecdEntry of aecdEntries) {

    let dbEntry;

    // match by SRO
    if (!dbEntry) {
      const keys = accented_y.get(aecdEntry.head.ae);
      if ( keys ) {
        dbEntry   = keys.map(key => dbIndex.get(key)).flat();
        if ( dbEntry.length < 1 ) {
          dbEntry = undefined;
        }
      }
    }

    // match by FST with spell relax
    if (fst && !dbEntry) {

      if (aecdEntry.head.ae === '+?') {
        unstandardized.push(aecdEntry);
        continue;
      }

      const matches = fst.lookup(aecdEntry.Analysis);

      if (matches.length === 1) {
        const [lemma] = matches;
        dbEntry          = dbIndex.get(lemma);
      } else if (matches.length < 1) {
        incorrect_analysis.push(aecdEntry);
      } else {
        console.log ("FST Ambiguity detected")
      }
    }

    // multiple entries match: attempt to determine correct entry
    if (Array.isArray(dbEntry)) {

      let matches = dbEntry;


      // match by POS
      
      matches = matches
      .filter(entry => getPos(entry.pos) === getPos(aecdEntry.pos) || getPos(entry.pos) === aecdEntry.pos)
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

  const candidates = Map.groupBy(unmatched, entry => entry.head.ae);

  for (const aecdEntry of candidates.values()) {
    const possibleEntries = aecdEntry.filter(entry => entry.senses.length > 0)
    if (possibleEntries.length > 0) {
      dbIndex.add(new DatabaseEntry(possibleEntries[0]));
      entriesSkipped+=(aecdEntry.length-1);
    } else {
      entriesSkipped+=aecdEntry.length;
    }
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
    'Entries without a match (new):': unmatched.length-entriesSkipped,
    'Entries skipped:': entriesSkipped,
    'Entries without a standardized lemma:': unstandardized.length
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
