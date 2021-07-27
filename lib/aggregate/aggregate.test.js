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
  const dbPath     = joinPath(currentDir, `../../test/aggregate.test.ndjson`);
  const outPath    = joinPath(currentDir, `../../test/out.test.ndjson`);

  before(async function() {
    this.entries = await aggregateEntries(dbPath, outPath);
  });

  after(async function() {
    await remove(outPath);
  });

  it.only(`lemma`, function() {
    const entry = getTestEntry(this.entries, this.test.title);
    expect(entry.lemma.sro).to.equal(`acâhkos`);
    expect(entry.lemma.proto).to.equal();
  });

  it(`POS`, function() {
    const [entry] = this.entries;
    expect(entry.pos).to.equal(`NA-1`);
  });

});
