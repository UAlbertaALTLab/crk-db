import convert                                     from './dlx2importjson.js';
import { expect }                                  from 'chai';
import fs                                          from 'fs-extra';
import { dirname as getDirname, join as joinPath } from 'path';
import { fileURLToPath }                           from 'url';

const { readJSON } = fs;
const __dirname    = getDirname(fileURLToPath(import.meta.url));

describe(`dlx2importjson`, function() {

  before(async function() {
    const testDataPath = joinPath(__dirname, `./dlx2importjson.test.json`);
    const dlx          = await readJSON(testDataPath);
    this.data          = convert(dlx);
  });

  it(`FST analysis`, function() {
    const [A, B] = this.data;
    expect(A.analysis).to.eql([[], `nîmiw`, [`+V`, `+AI`, `+Ind`, `+3Sg`]]);
    expect(B.analysis).to.be.undefined;
  });

});
