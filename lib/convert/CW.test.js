/*
 Tests for the CW conversion script. Each test corresponds to an entry in the test database. The \test field in the entry must be the same as the title of the test.
*/

import convertCW from './convert.js';
import { EOL }           from 'os';
import { expect }        from 'chai';
import { fileURLToPath } from 'url';
import fs                from 'fs-extra';
import getTestEntry      from '../../test/getTestEntry.js';

import {
  dirname as getDirname,
  join    as joinPaths,
} from 'path';

const {
  readFile,
  remove,
} = fs;

const __dirname  = getDirname(fileURLToPath(import.meta.url));
const inputPath  = joinPaths(__dirname, `./CW.test.db`);
const outputPath = joinPaths(__dirname, `./CW.test.ndjson`);

describe(`CW conversion script`, () => {

  before(async function convertTestData() {

    const { entries, errors } = await convertCW(inputPath, outputPath);

    this.data   = entries;
    this.errors = errors;

  });

  after(async function deleteConvertedTestData() {
    await remove(outputPath);
  });

  context(`definitions`, function() {
    it(`separates definitions by semicolons`, function() {

      const { senses: [senseA, senseB] } = getTestEntry(this.data, this.test.title);

      expect(senseA.definition).to.equal(`it is a star`);
      expect(senseB.definition).to.equal(`s/he is a star (e.g. in movies, sports, music, etc.)`);

    });
  });

  context(`dialects`, function() {

    it(`combines multiple dialect codes`, function() {
      const { dialects } = getTestEntry(this.data, this.test.title);
      expect(dialects).to.eql([`plai1258`, `swam1239`]);
    });

    it(`converts dialects to Glottocodes`, function() {
      const { dialects } = getTestEntry(this.data, this.test.title);
      expect(dialects).to.eql([`nort2960`]);
    });

  });

  context(`entry`, function() {

    // NOTE: There are no entries with multiple \ps but just one definition.

    it(`splits entries with multiple definitions`, function() {

      const penEntry = this.data.find(
        entry => entry.lemma.sro === `masinahikanâpisk`
        && entry.senses[0].definition === `pen`,
      );

      const slateEntry = this.data.find(
        entry => entry.lemma.sro === `masinahikanâpisk`
        && entry.senses[0].definition === `slate`,
      );

      expect(penEntry).to.exist;
      expect(slateEntry).to.exist;

    });

    it(`splits entries with multiple POS + definition pairs`, function() {

      const ipjEntry = this.data.find(
        entry => entry.lemma.sro === `âmî`
        && entry.pos === `IPJ`,
      );

      const ipcEntry = this.data.find(
        entry => entry.lemma.sro === `âmî`
        && entry.pos === `IPC`,
      );

      expect(ipjEntry).to.exist;
      expect(ipcEntry).to.exist;

    });

    it(`returns a ParseError object when there are different numbers of definitions and POS codes`, function() {
      const parseError = this.errors.find(error => error.code === `NumDefMismatch` && error.sro === `âmî`);
      expect(parseError).to.exist;
    });

  });

  context(`glosses`, function() {
    it(`copies the glosses as an Array`, function() {
      const { glosses } = getTestEntry(this.data, this.test.title);
      expect(glosses[0]).to.equal(`star`);
      expect(glosses[1]).to.equal(`little`);
    });
  });

  context(`head`, function() {
    it(`constructs the head`, function() {

      const { head }             = getTestEntry(this.data, this.test.title);
      const { proto, sro, syll } = head;

      expect(proto).to.equal(`awahêk!`);
      expect(sro).to.equal(`awahêk!`);
      expect(syll).to.equal(`ᐊᐊᐧᐦᐁ`);

    });
  });

  context(`lemma`, function() {

    it(`constructs the lemma`, function() {

      const { lemma }            = getTestEntry(this.data, this.test.title);
      const { proto, sro, syll } = lemma;

      expect(proto).to.equal(`acicipaýihow`);
      expect(sro).to.equal(`acicipaýihow`);
      expect(syll).to.equal(`ᐊᒋᒋᐸᔨᐦᐅᐤ`);

    });

    it(`does not include punctuation`, function() {

      const { lemma }            = getTestEntry(this.data, this.test.title);
      const { proto, sro, syll } = lemma;

      expect(proto).to.equal(`awahêk`);
      expect(sro).to.equal(`awahêk`);
      expect(syll).to.equal(`ᐊᐊᐧᐦᐁ`);

    });

  });

  context(`original`, function() {
    it(`retains the text of the original Toolbox entry`, function() {
      let { original } = getTestEntry(this.data, this.test.title);
      original = original.replace(/\r\n/gu, `\n`);
      expect(original.startsWith(`\\test retains the text of the original Toolbox entry`)).to.be.true;
    });
  });

  context(`output`, function() {

    it(`returns an Array of entries`, function() {
      expect(this.data).to.be.an(`Array`);
    });

    it(`writes an NDJSON file`, async function() {

      const text  = await readFile(outputPath, `utf8`);
      const lines = text.split(EOL).filter(Boolean);

      for (const line of lines) {
        expect(() => JSON.parse(line)).not.to.throw();
      }

    });

  });

  context(`parentheticals`, function() {

    it(`extracts compare relations: [cf. XXX]`, function() {

      const {
        lexicalRelations: [crossRef],
        senses:           [sense],
      } = getTestEntry(this.data, this.test.title);

      expect(crossRef.key).to.equal(`nama@IPC`);
      expect(crossRef.relation).to.equal(`compare`);
      expect(sense.definition).to.equal(`not`);

    });

    it(`extracts cross-references: [see XXX]`, function() {

      const {
        lexicalRelations: [crossRef],
        senses:           [sense],
      } = getTestEntry(this.data, this.test.title);

      expect(crossRef.key).to.equal(`yîkatê@IPV`);
      expect(crossRef.relation).to.equal(`crossReference`);
      expect(sense.definition).to.equal(`aside, off to one side`);

    });

    it(`extracts extended cross-references as notes: [see XXX …]`, function() {

      const {
        notes:  [note],
        senses: [senseA, senseB],
      } = getTestEntry(this.data, this.test.title);

      expect(note.noteType).to.equal(`general`);
      expect(note.text).to.equal(`see kakwâýaki- for further derivatives`);
      expect(senseA.definition).to.equal(`greatly, extremely, overwhelmingly, tremendously, to an extraordinary extent`);
      expect(senseB.definition).to.equal(`with startled surprise`);

    });

    it(`extracts general notes`, function() {

      const { notes: [note] } = getTestEntry(this.data, this.test.title);

      expect(note.noteType).to.equal(`general`);
      expect(note.text).to.equal(`i.e. foregone conclusion that something is not the case`);

    });

    it(`extracts Latin terms`, function() {
      const { senses: [sense] } = getTestEntry(this.data, this.test.title);
      expect(sense.scientificName).to.equal(`Fraximus nigra`);
    });

    it(`extracts literal definitions`, function() {
      const { literalMeaning } = getTestEntry(this.data, this.test.title);
      expect(literalMeaning).to.equal(`imitation shoe`);
    });

    it(`extracts multiple notes from a parenthetical`, function() {

      const { literalMeaning, senses: [sense] } = getTestEntry(this.data, this.test.title);

      expect(literalMeaning).to.equal(`yellow-root`);
      expect(sense.scientificName).to.equal(`Rumex sp.`);

    });

    it(`extracts multiple parentheticals`, function() {

      const { senses: [senseA, senseB] } = getTestEntry(this.data, this.test.title);

      const { notes: [note] } = senseA;

      expect(note.noteType).to.equal(`general`);
      expect(note.text).to.equal(`male name`);

      const { usages } = senseB;

      expect(usages).to.have.lengthOf(1);
      expect(usages[0]).to.equal(`plural`);

    });

    it(`extracts unbracketed literal definitions`, function() {
      const { literalMeaning, senses } = getTestEntry(this.data, this.test.title);
      expect(literalMeaning).to.equal(`God-day moon, Christmas moon`);
      expect(senses).to.have.lengthOf(2);
    });

    it(`extracts usage notes`, function() {

      const { senses } = getTestEntry(this.data, this.test.title);
      const sense      = senses.pop();

      expect(sense.usages).to.include(`in negative clauses`);
      expect(sense.definition).to.equal(`not merely`);

    });

  });

  context(`POS`, function() {
    it(`copies the full POS code verbatim`, function() {
      const { pos } = getTestEntry(this.data, this.test.title);
      expect(pos).to.equal(`NA-1`);
    });
  });

});
