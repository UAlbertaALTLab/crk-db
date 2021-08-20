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
    this.data          = convert(dlx, { ortho: `sro` });
  });

  // a = nîmiw (crk)
  // b = nîminâniwan (crk)
  // c = nóóhow- (arp)

  it(`formOf`, function() {
    const [a, b, c] = this.data;
    expect(a.formOf).to.be.undefined;
    expect(b.formOf).to.equal(`nîmiw`);
    expect(c.formOf).to.be.undefined;
  });

  it(`FST analysis`, function() {
    const [a, b, c] = this.data;
    expect(a.analysis).to.eql([[], `nîmiw`, [`+V`, `+AI`, `+Ind`, `+3Sg`]]);
    expect(b.analysis).to.eql([[], `nîmiw`, [`+V`, `+AI`, `+Ind`, `+X`]]);
    expect(c.analysis).to.be.undefined;
  });

  it(`FST lemma`, function() {
    const [a, b, c] = this.data;
    expect(a.fstLemma).to.be.undefined;
    expect(b.fstLemma).to.be.undefined;
    expect(c.fstLemma).to.equal(`noohow`);
  });

  it(`head`, function() {
    const [a, b, c] = this.data;
    expect(a.head).to.equal(`nîmiw`);
    expect(b.head).to.equal(`nîminâniwan`);
    expect(c.head).to.equal(`nóóhow-`);
  });

});
