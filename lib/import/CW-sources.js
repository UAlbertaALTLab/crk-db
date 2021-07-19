/* eslint-disable
  max-params,
  max-statements,
*/

import createSpinner         from 'ora';
import { createWriteStream } from 'fs';
import ProgressBar           from 'progress';
import readOriginalCW        from '../utilities/readOriginalCW.js';
import readToolbox           from '../utilities/readToolbox.js';

let numEntriesUpdated = 0;

/**
 * Merges the sources of the original entry and the Toolbox entry. Modifies the original Toolbox entry.
 * @param  {Object} toolboxEntry  The Toolbox entry object.
 * @param  {Object} originalEntry The original entry object.
 */
function mergeSources(toolboxEntry, originalEntry) {

  // extract timestamp (`\dt`) line (which is always last) for later comparison
  const dtLine = toolboxEntry.lines.pop();

  // update Toolbox entry with an Array of unique, sorted sources from both entries
  toolboxEntry.sources = Array.from(new Set([...originalEntry.sources, ...toolboxEntry.sources]))
  .filter(Boolean)
  .sort();

  // remove source lines from the Toolbox entry
  toolboxEntry.lines = toolboxEntry.lines.filter(line => line.type !== `src`);

  // add the new source lines
  toolboxEntry.sources.forEach(source => toolboxEntry.lines.push({
    index: toolboxEntry.lines.length,
    text:  source,
    type:  `src`,
  }));

  // add an empty \src line if there are no sources
  if (!toolboxEntry.sources.length) {
    toolboxEntry.lines.push({
      index: toolboxEntry.lines.length,
      text:  ``,
      type:  `src`,
    });
  }

  // if the entry has not changed, re-add original timestamp (`\dt`) line and return early
  const noChange = toolboxEntry.original.startsWith(toolboxEntry.compile());

  if (noChange) {
    toolboxEntry.lines.push(dtLine);
    return;
  }

  // create timestamp formatted as 30/Jun/2021
  const timestamp = new Date()
  .toLocaleDateString(`en-GB`, {
    day:   `2-digit`,
    month: `short`,
    year:  `numeric`,
  })
  .replace(/ /gu, `/`);

  // add the new timestamp (`\dt`) line
  toolboxEntry.lines.push({
    index: toolboxEntry.lines.length,
    text:  timestamp,
    type:  `dt`,
  });

  numEntriesUpdated++;

}

/**
 * Reads in the original CW database, extracts the sources for each entry, and adds them to the matching Toolbox entry, if any.
 * @param  {String}  sourcesPath               The path to the original CW database file.
 * @param  {String}  toolboxPath               The path to the CW Toolbox file.
 * @param  {Boolean} [outPath=`out.toolbox`]   Where to write the updated Toolbox file to.
 * @param  {Object}  [options={}]              An optional options hash.
 * @param  {String}  [options.reportUnmatched] If present, outputs a list of entries from the original database that do not have matches in the Toolbox database, or that were matched multiple times. The String should be the path to a file where the unmatched entries should be writen.
 * @return {Promise}
 */
export default async function importCWSources(
  sourcesPath,
  toolboxPath,
  outPath = `out.toolbox`,
  { reportUnmatched = `` } = {},
) {

  // load data

  console.info(`\n`);

  const loadingSpinner  = createSpinner(`Loading data sources.`).start();
  const originalEntries = await readOriginalCW(sourcesPath);
  let   toolboxEntries  = await readToolbox(toolboxPath);
  const toolboxHeader   = toolboxEntries.header;
  const noStems         = [];
  const unmatched       = [];

  loadingSpinner.succeed(`Data sources loaded.`);

  // create an index of stems for entries in the Toolbox file

  const indexSpinner = createSpinner(`Indexing Toolbox file.`).start();
  const stemIndex    = new Map;
  const sroIndex     = new Map;

  // index stem
  for (const toolboxEntry of toolboxEntries) {

    if (!toolboxEntry.stems?.length) {
      noStems.push(toolboxEntry);
      continue;
    }

    // adjust stem and POS fields for later user
    [toolboxEntry.stem] = toolboxEntry.stems;
    [toolboxEntry.pos]  = toolboxEntry.pos[0].split(`-`);

    const existingEntry = stemIndex.get(toolboxEntry.stem);

    if (existingEntry) {
      if (Array.isArray(existingEntry)) existingEntry.push(toolboxEntry);
      else stemIndex.set(toolboxEntry.stem, [existingEntry, toolboxEntry]);
      continue;
    }

    stemIndex.set(toolboxEntry.stem, toolboxEntry);

  }

  // index SRO
  for (const toolboxEntry of toolboxEntries) {

    const existingEntry = sroIndex.get(toolboxEntry.sro);

    if (existingEntry) {
      if (Array.isArray(existingEntry)) existingEntry.push(toolboxEntry);
      else sroIndex.set(toolboxEntry.sro, [existingEntry, toolboxEntry]);
      continue;
    }

    sroIndex.set(toolboxEntry.sro, toolboxEntry);

  }

  indexSpinner.succeed(`Toolbox file indexed.`);

  // attempt to update Toolbox entries with sources from original entries

  const progressBar = new ProgressBar(`Updating entries. :bar :current/:total :percent`, { total: originalEntries.length });

  for (const originalEntry of originalEntries) {

    let { head, POS } = originalEntry;

    head = head.replace(/Y/gu, `ý`);

    if (POS === `IPC`) POS  = `IPJ`;
    if (POS === `VAIt`) POS = `VTI`;

    let toolboxEntry = sroIndex.get(head);
    toolboxEntry   ||= stemIndex.get(head);
    toolboxEntry   ||= sroIndex.get(`${ head }-`);
    toolboxEntry   ||= stemIndex.get(`${ head }-`);

    if (Array.isArray(toolboxEntry)) {
      let matches = toolboxEntry;
      // only match single-word entries
      matches      = matches.filter(tbe => tbe.stems.length === 1);
      toolboxEntry = matches.find(tbe => tbe.pos === POS);
    }

    if (!toolboxEntry) {
      unmatched.push(originalEntry);
      progressBar.tick();
      continue;
    }

    mergeSources(toolboxEntry, originalEntry);
    progressBar.tick();

  }

  // compile and output the new Toolbox file

  const writeSpinner = createSpinner(`Writing new Toolbox file.`).start();

  toolboxEntries = toolboxEntries.map(entry => entry.compile());

  await new Promise((resolve, reject) => {

    const writeStream = createWriteStream(outPath);

    writeStream.on(`finish`, resolve);
    writeStream.on(`error`, reject);

    writeStream.write(`${ toolboxHeader }\r\n\r\n`);

    for (const entry of toolboxEntries) {
      writeStream.write(`${ entry }\r\n`);
    }

    writeStream.end();

  });

  writeSpinner.succeed(`New Toolbox file written.`);

  // report on unmatched entries

  console.table({
    'Entries updated':   numEntriesUpdated,
    'Unmatched entries': unmatched.length,
  });

  if (reportUnmatched) {

    return new Promise((resolve, reject) => {

      const reportSpinner = createSpinner(`Creating unmatched entries report.`).start();
      const writeStream   = createWriteStream(reportUnmatched);

      writeStream.on(`finish`, () => {
        reportSpinner.succeed(`Created unmatched entries report.`);
        resolve();
      });

      writeStream.on(`error`, reject);

      for (const entry of unmatched) {
        writeStream.write(`${ entry.text }\n`);
      }

      writeStream.end();

    });

  }

}
