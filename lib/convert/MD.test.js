/**
 * Tests for the MD conversion script. Each test corresponds to an entry in the test database. The value of the "test" field in the entry must be the same as the title of the test.
 */

import convert           from './MD.js';
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

describe(`MD conversion script`, function() {

  const __dirname    = getDirname(fileURLToPath(import.meta.url));
  const inputPath    = joinPaths(__dirname, `../../test/MD.test.tsv`);
  const outputPath   = joinPaths(__dirname, `../../test/MD.test.ndjson`);

  before(async function convertTestData() {

    const { entries, errors } = await convert(inputPath, outputPath);

    this.data   = entries;
    this.errors = errors;

  });

  after(async function removeTestData() {
    await remove(outputPath);
  });

  context(`cross-references`, function() {
    it(`stores cross-references in lexicalRelations`, function() {
      const { lexicalRelations } = getTestEntry(this.data, this.test.title);
      expect(lexicalRelations.every(relation => relation.relation === `see`));
      const [a, b, c] = lexicalRelations;
      expect(a.head.md).to.equal(`awina`);
      expect(b.head.md).to.equal(`anihi`);
      expect(c.head.md).to.equal(`wiya`);
    });
  });

  context(`definitions`, function() {
    it(`separates senses`, function() {
      const { senses }       = getTestEntry(this.data, this.test.title);
      const [senseA, senseB] = senses;
      expect(senseA.definition).to.equal(`A Sioux Indian.`);
      expect(senseB.definition).to.equal(`A male pow-wow dancer.`);
    });
  });

  context(`English_POS`, function() {
    it(`copies the English_POS field verbatim`, function() {
      const { English_POS } = getTestEntry(this.data, this.test.title);
      expect(English_POS).to.equal(`he_PRON_SUBJ counts#count_V them#they_PRON (_ those_DET people#people_N )_ ._`);
    });
  });

  context(`English_Search`, function() {
    it(`copies the English_Search field verbatim`, function() {
      const { English_Search } = getTestEntry(this.data, this.test.title);
      expect(English_Search).to.equal(`be counted.`);
    });
  });

  context(`entries`, function() {
    it(`acâhkos`, function() {
      const entry = getTestEntry(this.data, this.test.title);
      expect(entry.head.md).to.equal(`achahkos`);
      expect(entry.head.syll).to.equal(`ᐊᒐᐦᑯᐢ`);
      expect(entry.lemma.md).to.equal(`achahkos`);
      expect(entry.lemma.syll).to.equal(`ᐊᒐᐦᑯᐢ`);
      expect(entry.pos).to.equal(`N`);
    });
  });

  context(`head`, function() {
    it(`retains punctuation`, function() {
      const entry = getTestEntry(this.data, this.test.title);
      expect(entry.head.md).to.equal(`awinana?`);
      expect(entry.head.syll).to.equal(`ᐊᐃᐧᓇᓇ?`);
    });
  });

  context(`lemma`, function() {
    it(`strips punctuation`, function() {
      const entry = getTestEntry(this.data, this.test.title);
      expect(entry.lemma.md).to.equal(`awinana`);
      expect(entry.lemma.syll).to.equal(`ᐊᐃᐧᓇᓇ`);
    });
  });

  context(`original`, function() {
    it(`stores the original data`, function() {
      const entry = getTestEntry(this.data, this.test.title);
      expect(entry.original.startsWith(`stores the original data\ta\tᐊ`)).to.be.true;
    });
  });

  context(`output`, function() {

    it(`returns an Array of entries`, function() {
      expect(this.data).to.be.an(`Array`);
    });

    it(`writes an NDJSON file`, async function() {

      const text  = await readFile(outputPath, `utf8`);
      const lines = text.split(`\n`).filter(Boolean);

      for (const line of lines) {
        expect(() => JSON.parse(line)).not.to.throw();
      }

    });

  });

  context(`Rapid Words`, function() {

    it(`stores Rapid Words classes`, function() {
      const { semanticDomains } = getTestEntry(this.data, this.test.title);
      expect(semanticDomains).to.have.lengthOf(3);
      expect(semanticDomains).to.include(`communication`);
      expect(semanticDomains).to.include(`social_activity`);
      expect(semanticDomains).to.include(`story`);
    });

    it(`stores Rapid Words indices`, function() {
      const { semanticIndices: [a, b, c] } = getTestEntry(this.data, this.test.title);
      expect(a).to.equal(`3.5`);
      expect(b).to.equal(`4.2`);
      expect(c).to.equal(`3.5.4`);
    });

  });

});
