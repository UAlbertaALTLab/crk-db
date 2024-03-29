// This file contains data integrity tests for the CW Toolbox database (Wolvengrey.toolbox).
// These tests can only be run locally (because the database should not be checked into git).

/* eslint-disable
  func-names,
  max-nested-callbacks,
  no-invalid-this,
  prefer-arrow-callback,
*/

import convertCW             from '../convert/CW.js';
import { expect }            from 'chai';
import { fileURLToPath }     from 'url';
import fs                    from 'fs-extra';
import { load as parseYAML } from 'js-yaml';
import readToolbox           from '../utilities/readToolbox.js';
import { SingleBar }         from 'cli-progress';

import {
  dirname as getDirname,
  join    as joinPath,
} from 'path';

const { readFile, remove } = fs;

const __dirname = getDirname(fileURLToPath(import.meta.url));

describe(`Toolbox database`, function() {

  before(async function() {

    this.timeout(10000);

    if (process.env.GITHUB_ACTIONS) {
      this.skip();
    }

    const databasePath = joinPath(__dirname, `../../data/Wolvengrey.toolbox`);
    this.text          = await readFile(databasePath, `utf8`);

    const { entries, errors } = await convertCW(
      databasePath,
      joinPath(__dirname, `./Wolvengrey.ndjson`),
    );

    this.dlxEntries     = entries;
    this.errors         = errors;
    this.toolboxEntries = await readToolbox(databasePath);

  });

  after(async function() {
    await remove(joinPath(__dirname, `./Wolvengrey.ndjson`));
  });

  it.skip(`does not contain unwanted character sequences`, function() {

    // NOTE: This is a long-running test. Turn off timeout.
    this.timeout(0);

    const LEFT_SINGLE_QUOTATION_MARK  = `‘`;
    const RIGHT_SINGLE_QUOTATION_MARK = `’`;
    const LEFT_DOUBLE_QUOTATION_MARK  = `“`;
    const RIGHT_DOUBLE_QUOTATION_MARK = `”`;

    const progressBar = new SingleBar();

    progressBar.start(this.toolboxEntries.length, 0);

    for (const entry of this.toolboxEntries) {
      for (const { text } of entry.lines) {
        expect(text).to.not.include(LEFT_SINGLE_QUOTATION_MARK);
        expect(text).to.not.include(RIGHT_SINGLE_QUOTATION_MARK);
        expect(text).to.not.include(LEFT_DOUBLE_QUOTATION_MARK);
        expect(text).to.not.include(RIGHT_DOUBLE_QUOTATION_MARK);
        expect(text).to.not.include(`3'`);
        expect(text.trim().endsWith(`;`)).to.be.false;
      }
      progressBar.increment();
    }

    progressBar.stop();

  });

  it(`does not produce parsing errors`, async function() {
    if (this.errors.length) expect.fail(this.errors);
  });

  describe(`\\gr1`, function() {

    it(`only appears once per entry`, function() {
      const hasDoubleFields = this.toolboxEntries.find(entry => entry.features.length > 1);
      if (hasDoubleFields) expect.fail(hasDoubleFields);
    });

  });

  it(`\\new`, function() {
    for (const entry of this.toolboxEntries) {
      const line = entry.getLine(`new`);
      if (!line) continue;
      if (line.text !== `new`) expect.fail(`Bad \\new field: ${ entry.sro }`);
    }
  });

  describe(`\\src`, function() {

    it(`only contains valid sources`, async function() {

      let attestedSources = new Set;

      for (const entry of this.toolboxEntries) {
        entry.sources.forEach(src => attestedSources.add(src));
      }

      attestedSources = Array.from(attestedSources)
      .filter(Boolean)
      .sort();

      const sourcesInfoPath = joinPath(__dirname, `../constants/CW-sources.yml`);
      const yaml            = await readFile(sourcesInfoPath);
      const sourcesInfo     = parseYAML(yaml);
      const allowedSources  = Object.keys(sourcesInfo);

      for (const attestedSource of attestedSources) {
        const sourceAllowed = allowedSources.includes(attestedSource);
        if (!sourceAllowed) expect.fail(attestedSource);
      }

    });

  });

});
