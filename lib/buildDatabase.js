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
}                     from 'path';
import dlx2importjson from './convert/dlx2importjson.js';

const __dirname  = getDirname(fileURLToPath(import.meta.url));

function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.substring(1);
}

async function withSpinner(name, action) {
  const spinner = createSpinner(`Starting ${ name }.`).start();
  await action();
  spinner.succeed(`${ capitalizeFirstLetter(name) }: done.`);
}

async function buildDatabase() {

  const dataDir         = joinPath(__dirname, `../data`);
  const altlabInputPath = joinPath(dataDir, `altlab.tsv`);
  const cwInputPath     = joinPath(dataDir, `Wolvengrey.toolbox`);
  const mdInputPath     = joinPath(dataDir, `Maskwacis.tsv`);
  const cwDataPath      = joinPath(dataDir, `Wolvengrey.ndjson`);
  const mdDataPath      = joinPath(dataDir, `Maskwacis.ndjson`);
  const databasePath    = joinPath(dataDir, `database.ndjson`);
  const importJSONPath  = joinPath(dataDir, `crkeng_dictionary.importjson`);

  await withSpinner(`database clear`, clearDatabase);
  await withSpinner(`CW database conversion`, () => convertCW(cwInputPath, cwDataPath));
  await withSpinner(`MD database conversion`, () => convertMD(mdInputPath, mdDataPath));
  await withSpinner(`ALTLab database import`, () => importALTLab(altlabInputPath, databasePath, databasePath));
  await withSpinner(`CW database import`, () => importCW(cwDataPath, databasePath));
  await withSpinner(`MD database import`, () => importMD(mdDataPath, databasePath));
  await withSpinner(`data source aggregation`, () => aggregate(databasePath, databasePath));
  await withSpinner(`import JSON conversion`, () => dlx2importjson(databasePath, importJSONPath));

}

export default buildDatabase;
