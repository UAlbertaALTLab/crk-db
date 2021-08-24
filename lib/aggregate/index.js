import createSpinner from 'ora';
import DatabaseIndex from '../utilities/DatabaseIndex.js';
import readNDJSON    from '../utilities/readNDJSON.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';
import parseCategory from '../utilities/parseCategory.js';

/**
 * Aggregates all the data sources in an ALTLab database entry into the main entry.
 * @param  {Object} entry
 * @return {Object} Returns the database entry, modified.
 */
function aggregateEntry(entry) {

  const { CW: cw, MD: md } = entry.dataSources;

  entry.category = cw.pos ?? md.pos;

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

  // SENSES

  entry.senses = cw.senses.map(sense => Object.assign({ sources: [`CW`] }, sense));

  if (md?.mapping?.type) {

    switch (md?.mapping?.type) {
        // copy MD senses into main entry for these match types
        case `broad`:
        case `narrow`:
          entry.senses.push(...md.senses.map(sense => Object.assign({ sources: [`MD`] }, sense)));
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

  const addKeysSpinner = createSpinner(`Adding keys to entries.`).start();
  const index          = new DatabaseIndex(entries, entry => entry.head.sro);

  for (const [key, entry] of index.entries()) {

    if (!Array.isArray(entry)) {
      entry.key = key;
      continue;
    }

    const keyEntries = entry;

    keyEntries.forEach(e => {
      const { wordclass } = parseCategory(e.category);
      e.key = `${ key }@${ wordclass }`;
    });

    const keys = new Set(keyEntries.map(e => e.key));

    if (keys.size < keyEntries.length) {
      keyEntries.forEach((e, i) => {
        e.key = `${ key }@${ i + 1 }`;
      });
    }

  }

  addKeysSpinner.succeed(`Keys added to entries`);

  const writeDatabaseSpinner = createSpinner(`Writing the database file.`).start();
  await writeNDJSON(outPath, entries);
  writeDatabaseSpinner.succeed(`Database written to ${ outPath }.`);

  return entries;

}
