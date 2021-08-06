import createSpinner from 'ora';
import readNDJSON    from '../utilities/readNDJSON.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';
import assignParadigms from './paradigm-assignment.js';

/**
 * Aggregates all the data sources in an ALTLab database entry into the main entry.
 * @param  {Object} entry
 * @return {Object} Returns the database entry, modified.
 */
function aggregateEntry(entry) {

  const { CW: cw, MD: md } = entry.dataSources;

  entry.head = {
    proto: cw.head.proto,
    sro:   cw.head.sro,
    syll:  cw.head.syll,
  };

  entry.lemma = {
    proto: cw.lemma.proto,
    sro:   cw.lemma.sro,
    syll:  cw.lemma.syll,
  };

  // TODO: The POS is in the original CW Toolbox entry,
  // but isn't copied onto the DLx version of the entry.
  if (!(cw.pos ?? md?.pos)) {
    console.log(entry.dataSources);
  }

  entry.pos = cw.pos ?? md.pos;

  // SENSES

  entry.senses = cw.senses.map(sense => Object.assign({ source: `CW` }, sense));

  if (md?.mapping?.type) {

    switch (md?.mapping?.type) {
        // copy MD senses into main entry for these match types
        case `broad`:
        case `narrow`:
          entry.senses.push(...md.senses.map(sense => Object.assign({ source: `MD` }, sense)));
          break;
        // do not copy MD senses into main entry for these match types
        case `conjugation`:
        case `dialect`:
        case `different`:
        case `equivalent`:
        case `Err/Orth`:
        case `lemma`: // currently no entries with this match type
        case `PV`: // currently no entries with this match type
        case `same`:
        case `similar`:
        default: break;
    }

  }

  // NOTE: Currently not displaying MD senses for programmatic matches.
  // TODO: Use a bag-of-words approach to decide which MD senses to display.

  return entry;

}

/**
 * Aggregates all the data sources in the ALTLab database into the main entry.
 * @param  {String} dbPath                 Path to the NDJSON database.
 * @param  {String} [outPath=`out.ndjson`] Path to output the aggregated database to.
 * @return {Array}                         Returns an array of aggregated entries.
 */
export default async function aggregate(dbPath, outPath = `out.ndjson`) {

  const readDatabaseSpinner = createSpinner(`Reading the database into memory.`).start();
  const entries             = await readNDJSON(dbPath);
  readDatabaseSpinner.succeed(`Database read into memory.`);

  const aggregationSpinner = createSpinner(`Aggregating data sources into main entries.`).start();

  for (const entry of entries) {
    aggregateEntry(entry);
  }

  aggregationSpinner.succeed(`Data sources aggregated into main entries.`);

  const writeDatabaseSpinner = createSpinner(`Writing the database file.`).start();
  await writeNDJSON(outPath, entries);
  writeDatabaseSpinner.succeed(`Database written to ${ outPath }.`);

  return entries;

}
