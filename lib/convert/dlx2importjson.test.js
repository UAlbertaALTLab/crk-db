import convert                                     from './dlx2importjson.js';
import { expect }                                  from 'chai';
import fs                                          from 'fs-extra';
import { dirname as getDirname, join as joinPath } from 'path';
import { fileURLToPath }                           from 'url';

const { readJSON } = fs;
const __dirname    = getDirname(fileURLToPath(import.meta.url));

// a = nîmiw (crk)
// b = nîminâniwan (crk)
// c = nóóhow- (arp)

describe(`dlx2importjson`, function() {

  before(async function() {
    const testDataPath = joinPath(__dirname, `./dlx2importjson.test.json`);
    const dlx          = await readJSON(testDataPath);
    this.data          = convert(dlx, { ortho: `sro` });
  });

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

  // Since the `linguistInfo` property is language-specific, we shouldn't test its contents.
  it(`linguistInfo`, function() {
    this.data.forEach(entry => {
      expect(entry.linguistInfo).to.be.an(`Object`);
    });
  });

  // In DaFoDiL, all base forms / allostems are subsumed into a single Lexeme entry.
  // Each base form / allostem of a lexeme is listed in `Lexeme.forms`.
  // The paradigm for each base form / allostem is specified in the `inflectionClass` property on each Lexeme Form.
  // In morphodict, by contrast, each LexemeForm is given its own distinct entry, with a `paradigm` field.
  // So, before running dlx2importjson, each Lexeme Form in the DaFoDiL entries must be separated into its own entry,
  // with the `inflectionClass` field changed to the `paradigm` field.
  it(`paradigm`, function() {
    const [a, b, c] = this.data;
    expect(a.paradigm).to.equal(`VAI`);
    expect(b.paradigm).to.be.null;
    expect(c.paradigm).to.equal(`TA`);
  });

});
