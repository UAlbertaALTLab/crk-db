/**
 * Builds the entire ALTLab database from scratch. Converts each data source, imports them into the database, and aggregates the entries.
 */

import aggregate         from './aggregate/index.js';
import clearDatabase     from './utilities/clearDatabase.js';
import convertCW         from './convert/convert.js';
import convertMD         from './convert/MD.js';
import convertAECD       from "./convert/AECD.js";
import createSpinner     from 'ora';
import { fileURLToPath } from 'url';
import importALTLab      from './import/altlab.js';
import importCW          from './import/CW.js';
import importMD          from './import/MD.js';
import importAECD        from "./import/AECD.js";

import dlx2importjson from './convert/dlx2importjson.js';

import {
  dirname as getDirname,
  join    as joinPath,
}                     from 'path';

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
  const cwInputPath     = joinPath(dataDir, `Wolvengrey_altlab.toolbox`);
  const mdInputPath     = joinPath(dataDir, `Maskwacis_altlab.tsv`);
  const aecdInputPath   = joinPath(dataDir, `AECD.tsv`);
  const cwDataPath      = joinPath(dataDir, `Wolvengrey.ndjson`);
  const mdDataPath      = joinPath(dataDir, `Maskwacis.ndjson`);
  const aecdDataPath    = joinPath(dataDir, `AECD.ndjson`);
  const databasePath    = joinPath(dataDir, `database.ndjson`);
  const importJSONPath  = joinPath(dataDir, `crkeng_dictionary.importjson`);
  const relaxedFSTPath  = joinPath(__dirname, `../`, `crk-relaxed-analyzer-for-dictionary.hfstol`);

  await withSpinner(`database clear`, clearDatabase);
  await withSpinner(`CW database conversion`, () => convertCW(cwInputPath, cwDataPath));
  await withSpinner(`MD database conversion`, () => convertMD(mdInputPath, mdDataPath));
  await withSpinner(`AECD database conversion`, () => convertAECD(aecdInputPath, aecdDataPath));
  await withSpinner(`ALTLab database import`, () => importALTLab(altlabInputPath, databasePath, databasePath));
  await withSpinner(`CW database import`, () => importCW(cwDataPath, databasePath));
  await withSpinner(`MD database import`, () => importMD(mdDataPath, databasePath, relaxedFSTPath));
  await withSpinner(`AECD database import`, () => importAECD(aecdDataPath, databasePath,relaxedFSTPath));
  await withSpinner(`data source aggregation`, () => aggregate(databasePath, databasePath));
  await withSpinner(`import JSON conversion`, () => dlx2importjson(databasePath, importJSONPath));

}

export default buildDatabase;
