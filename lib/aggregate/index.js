import createSpinner from 'ora';
import readNDJSON    from '../utilities/readNDJSON.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';

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

    const { CW: cw, MD: md } = entry.dataSources;

    entry.pos = cw.pos ?? md.pos;

  }

  aggregationSpinner.succeed(`Data sources aggregated into main entries.`);

  const writeDatabaseSpinner = createSpinner(`Writing the database file.`).start();
  await writeNDJSON(outPath, entries);
  writeDatabaseSpinner.succeed(`Database written to ${ outPath }.`);

  return entries;

}
