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

  it(`formOf`, function() {
    const [, entry] = this.data;
    expect(entry.formOf).to.equal(`nîmiw`);
  });

  it(`FST analysis`, function() {
    const [a, b, c] = this.data;
    expect(a.analysis).to.eql([[], `nîmiw`, [`+V`, `+AI`, `+Ind`, `+3Sg`]]);
    expect(b.analysis).to.eql([[], `nîmiw`, [`+V`, `+AI`, `+Ind`, `+X`]]);
    expect(c.analysis).to.be.undefined;
  });

});
