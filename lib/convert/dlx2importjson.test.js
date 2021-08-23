import convert                                     from './dlx2importjson.js';
import { expect }                                  from 'chai';
import fs                                          from 'fs-extra';
import { dirname as getDirname, join as joinPath } from 'path';
import { fileURLToPath }                           from 'url';

const { remove } = fs;

const __dirname = getDirname(fileURLToPath(import.meta.url));

// a = nîmiw (crk)
// b = nîminâniwan (crk)

describe(`dlx2importjson`, function() {

  before(async function() {
    const testDataPath = joinPath(__dirname, `./dlx2importjson.test.ndjson`);
    this.data          = await convert(testDataPath);
  });

  after(async function() {
    await remove(`out.json`);
  });

  it(`formOf`, function() {
    const [a, b] = this.data;
    expect(a.formOf).to.equal(`nîmiw`);
    expect(b.formOf).to.be.undefined;
  });

  it(`FST analysis`, function() {
    const [a, b] = this.data;
    expect(a.analysis).to.eql([[], `nîmiw`, [`+V`, `+AI`, `+Ind`, `+X`]]);
    expect(b.analysis).to.eql([[], `nîmiw`, [`+V`, `+AI`, `+Ind`, `+3Sg`]]);
  });

  it(`FST lemma`, function() {
    const [a, b] = this.data;
    expect(a.fstLemma).to.be.undefined;
    expect(b.fstLemma).to.be.undefined;
  });

  it(`head`, function() {
    const [a, b] = this.data;
    expect(a.head).to.equal(`nîminâniwan`);
    expect(b.head).to.equal(`nîmiw`);
  });

  describe(`linguistInfo`, function() {

    it(`is defined when appropriate`, function() {
      const [a, b] = this.data;
      expect(a.linguistInfo).to.be.undefined;
      expect(b.linguistInfo).to.be.an(`Object`);
    });

    it(`inflectional_category`, function() {
      const [, entry] = this.data;
      expect(entry.linguistInfo.inflectional_category).to.equal(`VAI-1`);
    });

    it(`pos`, function() {
      const [, entry] = this.data;
      expect(entry.linguistInfo.pos).to.equal(`V`);
    });

    it(`linguistInfo.stem`, function() {
      const [, entry] = this.data;
      expect(entry.linguistInfo.stem).to.equal(`nîmi-`);
    });

    it(`wordclass`, function() {
      const [, entry] = this.data;
      expect(entry.linguistInfo.wordclass).to.equal(`VAI`);
    });

  });

  // In DaFoDiL, all base forms / allostems are subsumed into a single Lexeme entry.
  // Each base form / allostem of a lexeme is listed in `Lexeme.forms`.
  // The paradigm for each base form / allostem is specified in the `inflectionClass` property on each Lexeme Form.
  // In morphodict, by contrast, each LexemeForm is given its own distinct entry, with a `paradigm` field.
  // So, before running dlx2importjson, each Lexeme Form in the DaFoDiL entries must be separated into its own entry,
  // with the `inflectionClass` field changed to the `paradigm` field.
  it(`paradigm`, function() {
    const [a, b] = this.data;
    expect(a.paradigm).to.be.undefined;
    expect(b.paradigm).to.equal(`VAI`);
  });

  it(`senses`, function() {
    const [a, b] = this.data;
    expect(a.senses).to.have.lengthOf(1);
    expect(b.senses).to.have.lengthOf(2);
  });

  it(`slug`, function() {
    const [a, b] = this.data;
    expect(a.slug).to.equal(`nîminâniwan`);
    expect(b.slug).to.equal(`nîmiw@1`);
  });

});
