/* eslint-disable
  func-names,
  no-invalid-this,
  no-magic-numbers,
  prefer-arrow-callback,
*/

import clearDatabase     from './utilities/clearDatabase.js';
import convertCW         from './convert/CW.js';
import convertMD         from './convert/MD.js';
import { expect }        from 'chai';
import { fileURLToPath } from 'url';
import importCW          from './import/CW.js';
import importMD          from './import/MD.js';

import {
  dirname as getDirname,
  join    as joinPath,
} from 'path';

const __dirname  = getDirname(fileURLToPath(import.meta.url));

describe(`buildDatabase.js`, function() {

  const dataDir      = joinPath(__dirname, `../../data`);
  const cwInputPath  = joinPath(dataDir, `Wolvengrey.toolbox`);
  const mdInputPath  = joinPath(dataDir, `Maskwacis.tsv`);
  const cwDataPath   = joinPath(dataDir, `Wolvengrey.ndjson`);
  const mdDataPath   = joinPath(dataDir, `Maskwacis.ndjson`);
  const databasePath = joinPath(dataDir, `database.ndjson`);
  const mappingsPath = joinPath(dataDir, `MD-CW-mappings.tsv`);

  before(async function() {
    this.timeout(25_000); // 15 seconds
    await convertCW(cwInputPath, cwDataPath, { silent: true });
    await convertMD(mdInputPath, mdDataPath, mappingsPath, { silent: true });
  });

  it(`is commutative (creates the same number of entries regardless of source import order)`, async function() {

    this.timeout(25_000); // 15 seconds

    await clearDatabase();
    await importCW(cwDataPath, databasePath, { silent: true });
    const entriesCWMD = await importMD(mdDataPath, databasePath, { silent: true });

    await clearDatabase();
    await importMD(mdDataPath, databasePath, { silent: true });
    const entriesMDCW = await importCW(cwDataPath, databasePath, { silent: true });

    expect(entriesMDCW.length).to.equal(entriesCWMD.length);

  });

});
