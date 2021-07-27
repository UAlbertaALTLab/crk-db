import aggregateEntries  from './index.js';
import { expect }        from 'chai';
import { fileURLToPath } from 'url';
import fs                from 'fs-extra';
import getTestEntry      from '../../test/getTestEntry.js';

import {
  dirname as getDirname,
  join    as joinPath,
} from 'path';

const { remove } = fs;

describe(`aggregate entries`, function() {

  const currentDir = getDirname(fileURLToPath(import.meta.url));
  const dbPath     = joinPath(currentDir, `./aggregate.test.ndjson`);
  const outPath    = joinPath(currentDir, `./out.test.ndjson`);

  before(async function() {
    this.entries = await aggregateEntries(dbPath, outPath);
  });

  after(async function() {
    await remove(outPath);
  });

  it(`head`, function() {
    const entry = getTestEntry(this.entries, this.test.title);
    expect(entry.lemma.sro).to.equal(`awahêk`);
    expect(entry.head.sro).to.equal(`awahêk!`);
  });

  it(`lemma`, function() {
    const entry = getTestEntry(this.entries, this.test.title);
    expect(entry.lemma.proto).to.equal(`amiskwâýow`);
    expect(entry.lemma.sro).to.equal(`amiskwâyow`);
    expect(entry.lemma.syll).to.equal(`ᐊᒥᐢᑳᐧᔪᐤ`);
  });

  it(`POS`, function() {
    const entry = getTestEntry(this.entries, this.test.title);
    expect(entry.pos).to.equal(`NA-1`);
  });

  describe(`senses`, function() {

    it(`matchType: broad`, function() {

      const { senses } = getTestEntry(this.entries, this.test.title);

      expect(senses).to.have.lengthOf(3);

      const sense1 = senses.find(sense => sense.definition === `s/he pulls s.o. from the water`);
      const sense2 = senses.find(sense => sense.definition === `s/he drags s.o. out of the water`);
      const sense3 = senses.find(sense => sense.definition === `He pulls him out of the fire or water.`);

      expect(sense1.source).to.equal(`CW`);
      expect(sense2.source).to.equal(`CW`);
      expect(sense3.source).to.equal(`MD`);

    });

    it(`matchType: conjugation`, function() {

      const { senses } = getTestEntry(this.entries, this.test.title);

      expect(senses).to.have.lengthOf(2);

      const sense1 = senses.find(sense => sense.definition === `s/he has a misconception`);
      const sense2 = senses.find(sense => sense.definition === `s/he is mistaken`);

      expect(sense1.source).to.equal(`CW`);
      expect(sense2.source).to.equal(`CW`);

    });

    it(`matchType: dialect`, function() {

      const { senses } = getTestEntry(this.entries, this.test.title);

      expect(senses).to.have.lengthOf(2);

      const sense1 = senses.find(sense => sense.definition === `squirrel`);
      const sense2 = senses.find(sense => sense.definition === `gopher`);

      expect(sense1.source).to.equal(`CW`);
      expect(sense2.source).to.equal(`CW`);

    });

    it(`matchType: different`, function() {

      const { senses } = getTestEntry(this.entries, this.test.title);

      expect(senses).to.have.lengthOf(1);

      const [sense] = senses;

      expect(sense.definition).to.equal(`s/he thinks more of s.t., s/he prefers s.t., s/he regards s.t. more highly, s/he favours s.t.`);
      expect(sense.source).to.equal(`CW`);

    });

  });


});
