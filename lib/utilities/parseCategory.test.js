/**
 * Tests for the parseCategory.js utility.
 */

import { expect }        from 'chai';
import fs                from 'fs-extra';
import { fileURLToPath } from 'url';
import parseCategory     from './parseCategory.js';

import { dirname as getDirname, join as joinPath } from 'path';

const { readJSON } = fs;

const __dirname = getDirname(fileURLToPath(import.meta.url));

describe(`parseCategory`, function() {

  before(async function() {
    this.categories = await readJSON(joinPath(__dirname, `./parseCategory.test.json`));
  });

  it(`parses all categories correctly`, function() {

    Object.keys(this.categories)
    .forEach(category => {
      const { inflectionalCategory, pos, wordClass } = parseCategory(category);
      expect(inflectionalCategory).to.equal(this.categories[category].inflectionalCategory);
      expect(pos).to.equal(this.categories[category].pos);
      expect(wordClass).to.equal(this.categories[category].wordClass);
    });

  });

});
