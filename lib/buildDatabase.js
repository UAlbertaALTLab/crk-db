/**
 * Builds the entire ALTLab database from scratch. Converts each data source, imports them into the database, and aggregates the entries.
 */

import aggregate         from './aggregate/index.js';
import clearDatabase     from './utilities/clearDatabase.js';
import convertCW         from './convert/CW.js';
import convertMD         from './convert/MD.js';
import createSpinner     from 'ora';
import { fileURLToPath } from 'url';
import importALTLab      from './import/altlab.js';
import importCW          from './import/CW.js';
import importMD          from './import/MD.js';

import {
  dirname as getDirname,
  join    as joinPath,
} from 'path';

const __dirname  = getDirname(fileURLToPath(import.meta.url));

export default async function buildDatabase() {

  const dataDir         = joinPath(__dirname, `../data`);
  const altlabInputPath = joinPath(dataDir, `altlab.tsv`);
  const cwInputPath     = joinPath(dataDir, `Wolvengrey.toolbox`);
  const mdInputPath     = joinPath(dataDir, `Maskwacis.tsv`);
  const cwDataPath      = joinPath(dataDir, `Wolvengrey.ndjson`);
  const mdDataPath      = joinPath(dataDir, `Maskwacis.ndjson`);
  const databasePath    = joinPath(dataDir, `database.ndjson`);

  const clearDatabaseSpinner = createSpinner(`Clearing database.`).start();
  await clearDatabase();
  clearDatabaseSpinner.succeed(`Database cleared.`);

  const convertCWSpinner = createSpinner(`Converting CW database.`).start();
  await convertCW(cwInputPath, cwDataPath);
  convertCWSpinner.succeed(`CW database converted.`);

  const convertMDSpinner = createSpinner(`Converting MD database.`).start();
  await convertMD(mdInputPath, mdDataPath);
  convertMDSpinner.succeed(`MD database converted.`);

  const importAltlabSpinner = createSpinner(`Importing ALTLab database.`).start();
  await importALTLab(altlabInputPath, databasePath, databasePath);
  importAltlabSpinner.succeed(`ALTLab database imported.`);

  const importCWSpinner = createSpinner(`Importing CW database.`).start();
  await importCW(cwDataPath, databasePath);
  importCWSpinner.succeed(`CW database imported.`);

  const importMDSpinner = createSpinner(`Importing MD database.`).start();
  await importMD(mdDataPath, databasePath);
  importMDSpinner.succeed(`MD database imported.`);

  const aggregateSpinner = createSpinner(`Aggregating data sources.`).start();
  await aggregate(databasePath, databasePath);
  aggregateSpinner.succeed(`Data sources aggregated.`);

}
