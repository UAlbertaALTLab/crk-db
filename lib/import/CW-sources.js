import createSpinner         from 'ora';
import { createWriteStream } from 'fs';
import ProgressBar           from 'progress';
import readOriginalCW        from '../utilities/readOriginalCW.js';
import readToolbox           from '../utilities/readToolbox.js';
import writeToolbox          from '../utilities/writeToolbox.js';

/**
 * Merges the sources of the original entry and the Toolbox entry. Modifies the original Toolbox entry.
 * @param  {Object} originalEntry The original entry object.
 * @param  {Object} toolboxEntry  The Toolbox entry object.
 */
function mergeSources(originalEntry, toolboxEntry) {

  // extract timestamp (`\dt`) line (which is always last) for later comparison
  const dtLine = toolboxEntry.lines.pop();

  // update Toolbox entry with an Array of unique, sorted sources from both entries
  toolboxEntry.sources = Array.from(new Set([...originalEntry.sources, ...toolboxEntry.sources]))
  .filter(Boolean)
  .sort();

  // remove \src and \new lines from the Toolbox entry
  toolboxEntry.lines = toolboxEntry.lines.filter(line => line.type !== `src` && line.type !== `new`);

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

  // re-add the \new line if it was present in the original
  if (toolboxEntry.new) {
    toolboxEntry.lines.push({
      index: toolboxEntry.lines.length,
      text:  `new`,
      type:  `new`,
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

}

export default async function importCWSources(sourcesPath, toolboxPath, outPath = `out.toolbox`) {

  const loadingOriginalSpinner = createSpinner(`Load original CW database`).start();
  const originalEntries        = await readOriginalCW(sourcesPath);

  loadingOriginalSpinner.succeed();

  const convertingSpinner = createSpinner(`Convert original stems to Toolbox format`).start();

  // The following section converts the Word Perfect headword to the headword format used in the Toolbox file.
  // The rules for converting from Word Perfect format to Toolbox format are documented below for each part-of-speech code.
  // The Word Perfect headwords are stems ending with a hyphen, but the Toolbox headwords are full words.
  // The `converted` property stores one or more possible Toolbox versions of the original headword.

  const shortInitialVowelRegExp = /^(?<vowel>[aio])/u;
  const vowelFinalRegExp        = /[aioâêîô]$/u;
  const vowelInitialRegExp      = /^(?<vowel>[aioâêîô])/u;
  const wFinalRegExp            = /(?<consonant>[^aioâêîô])w$/u;

  for (const entry of originalEntries) {

    const originalStem = entry.head
    .replace(/^-/u, ``) // remove leading hyphen
    .replace(/-$/u, ``) // remove trailing hyphen
    .replace(/Y/gu, `ý`);

    const converted = [originalStem];
    const dependent = [];

    entry.head = {
      converted,
      dependent,
      original: entry.head,
    };

    // VII
    // - vowel-final stems add a final -w
    // - n-final stems stay the same
    // - all other stems stay the same
    // - exception: some Toolbox stems have plural -wa rather than singular -w
    if (entry.POS === `VII`) {
      if (vowelFinalRegExp.test(originalStem)) converted.push(`${ originalStem }w`);
      converted.push(`${ originalStem }wa`);
      continue;
    }

    // VAI
    // - reciprocal verbs (ending in -to, -ito, or -hto) add a plural -wak
    // - vowel-final stems add a final -w
    // - n-final stems stay the same
    // - all other stems stay the same
    // - exception: some Toolbox stems have plural -wak rather than singular -w
    if (entry.POS === `VAI`) {
      if (vowelFinalRegExp.test(originalStem)) converted.push(`${ originalStem }w`);
      converted.push(`${ originalStem }wak`);
      continue;
    }

    // VTI
    // - add -am to the stem
    // - exception: some Toolbox stems have plural -amwak rather than singular -am
    if (entry.POS === `VTI`) {
      converted.push(`${ originalStem }am`);
      converted.push(`${ originalStem }amwak`);
      continue;
    }

    // VAIt
    // - add -w to the stem
    // - exception: some Toolbox stems have plural -wak rather than singular -w
    if (entry.POS === `VAIt`) {
      converted.push(`${ originalStem }w`);
      converted.push(`${ originalStem }wak`);
      continue;
    }

    // VTA
    // - add -êw to the stem
    // - exception: some Toolbox stems have plural -êwak rather than singular -êw
    if (entry.POS === `VTA`) {
      converted.push(`${ originalStem }êw`);
      converted.push(`${ originalStem }êwak`);
      continue;
    }

    // NA
    // - remove postconsonantal final /w/
    // - add final /a/ (NA-4, NA-4w)
    if (entry.POS === `NA`) {
      if (wFinalRegExp.test(originalStem)) converted.push(originalStem.replace(/w$/u, ``));
      converted.push(`${ originalStem }a`);
      continue;
    }

    // NDA
    // - add n- before vowel-initial stems
    // - add ni- before consonant-initial stems
    // - add final /a/ (NDA-4, NDA-4w)
    // - exception: some words also take m- / mi-
    if (entry.POS === `NDA`) {

      converted.push(`${ originalStem }a`);

      if (vowelInitialRegExp.test(originalStem)) {

        const lengthenedStem = originalStem
        .replace(shortInitialVowelRegExp, `$<vowel>\u0302`)
        .normalize();

        converted.push(`n${ lengthenedStem }`);
        converted.push(`n${ lengthenedStem }a`);
        dependent.push(`m${ lengthenedStem }`);
        dependent.push(`m${ lengthenedStem }a`);

      } else {

        converted.push(`ni${ originalStem }`);
        converted.push(`ni${ originalStem }a`);
        dependent.push(`mi${ originalStem }`);
        dependent.push(`mi${ originalStem }a`);

      }

      continue;

    }

    // NI
    // - remove postconsonantal final /w/
    // - add final /i/ (NI-4)
    // - add final /o/ (NI-4w)
    if (entry.POS === `NI`) {
      if (wFinalRegExp.test(originalStem)) converted.push(originalStem.replace(/w$/u, ``));
      converted.push(`${ originalStem }i`);
      converted.push(`${ originalStem }o`);
      continue;
    }

    // NDI
    // - add n- before vowel-initial stems
    // - add ni- before consonant-initial stems
    // - add m- before vowel-initial stems
    // - add mi- before consonant-initial stems
    // - remove postconsonantal final /w/ from all stems
    if (entry.POS === `NDI`) {

      if (vowelInitialRegExp.test(originalStem)) {

        const lengthenedStem = originalStem
        .replace(shortInitialVowelRegExp, `$<vowel>\u0302`)
        .normalize();

        converted.push(`n${ lengthenedStem }`.replace(wFinalRegExp, `$<consonant>`));
        dependent.push(`m${ lengthenedStem }`.replace(wFinalRegExp, `$<consonant>`));

      } else {

        converted.push(`ni${ originalStem }`.replace(wFinalRegExp, `$<consonant>`));
        dependent.push(`mi${ originalStem }`.replace(wFinalRegExp, `$<consonant>`));

      }

    }

  }

  convertingSpinner.succeed();

  const loadingToolboxSpinner = createSpinner(`Load Toolbox database`).start();
  const toolboxEntries        = await readToolbox(toolboxPath, { silent: true });

  loadingToolboxSpinner.succeed();

  // Create an index of headwords in the Toolbox database
  // If the same headword appears more than once, the value at that index will be an Array of entries.

  const createIndexSpinner = createSpinner(`Create index of Toolbox entries`).start();
  const index              = new Map;

  for (const currentEntry of toolboxEntries) {

    const existingEntry = index.get(currentEntry.sro);

    if (existingEntry) {
      if (Array.isArray(existingEntry)) existingEntry.push(currentEntry);
      else index.set(currentEntry.sro, [existingEntry, currentEntry]);
      continue;
    }

    index.set(currentEntry.sro, currentEntry);

  }

  createIndexSpinner.succeed();

  // Attempt to match the original CW entries to a Toolbox entry.
  const matchingSpinner = createSpinner(`Match original entries to Toolbox entries.`).start();
  const matches         = new Map;
  const unmatched       = new Set;
  const multipleMatches = new Set;

  for (const originalEntry of originalEntries) {

    let dependentEntry;
    let toolboxEntry;

    // if there's a dependent stem, attempt to match that first
    if (originalEntry.head.dependent.length) {

      for (const head of originalEntry.head.dependent) {
        if (dependentEntry) break;
        dependentEntry = index.get(head);
      }

    }

    // go through possible Toolbox headwords until a match is found
    for (const head of originalEntry.head.converted) {

      if (toolboxEntry) break;

      if (
        originalEntry.POS === `IPV`
        || originalEntry.POS === `IPN`
      ) {
        toolboxEntry = index.get(`${ head }-`);
      } else {
        toolboxEntry = index.get(head);
      }

    }

    if (!(toolboxEntry || dependentEntry)) {
      unmatched.add(originalEntry);
      continue;
    }

    if (Array.isArray(dependentEntry)) {
      multipleMatches.add(originalEntry);
    } else if (dependentEntry) {
      matches.set(originalEntry, dependentEntry);
    }

    if (Array.isArray(toolboxEntry)) {
      multipleMatches.add(originalEntry);
    } else if (toolboxEntry) {
      matches.set(originalEntry, toolboxEntry);
    }

    // TODO: Try some minimal logic to match when there are multiple matches.
    // There are only 160 cases where this happens.

  }

  matchingSpinner.succeed();

  // Update the Toolbox database with sources from the original entries

  const progressBar = new ProgressBar(`Updating entries. :bar :current/:total :percent`, { total: matches.size });

  for (const [originalEntry, toolboxEntry] of matches) {
    mergeSources(originalEntry, toolboxEntry);
    progressBar.tick();
  }

  const writeSpinner = createSpinner(`Writing new Toolbox file.`).start();
  await writeToolbox(outPath, toolboxEntries);
  writeSpinner.succeed(`New Toolbox file written.`);

  // Create list of unmatched and/or multiple-match entries

  const unmatchedSpinner = createSpinner(`Create list of ummatched entries`).start();

  await new Promise((resolve, reject) => {

    const writeStream = createWriteStream(`unmatched.txt`);

    writeStream.on(`close`, resolve);
    writeStream.on(`error`, reject);
    writeStream.on(`finish`, resolve);

    for (const entry of unmatched) {
      writeStream.write(`${ entry.text }\n`);
    }

    for (const entry of multipleMatches) {
      writeStream.write(`${ entry.text }\n`);
    }

    writeStream.end();

  });

  unmatchedSpinner.succeed();

  console.table({
    'Original records': originalEntries.length,
    Matches:            matches.size,
    Unmatched:          unmatched.size,
    'Multiple matches': multipleMatches.size,
  });

}

// TODO
// - output list of unmatched cases
// - output list of multiple matches

// NOTES
// acikâsipakw- (NI-3): Toolbox entry has plural -wa
// acimômêyisimin (NI-1): spelling change
// acimwâpicis-: not found
// aciwih-: not found
// aciwikah- (VTI): spelling change
// aciwin- (VTA): spelling change
// aciwin- (VTI): spelling change
// aciwinamaw- (VTA): spelling change
// aciwis- (VTI): spelling change
// ahcânis- (NA-1): spelling change
// ahcâpâskoyakêsk(w): not found
// akohâkan-: not found
// amiskowiyiniw- (NA-2): spelling change
// amiskwayânis (NA-1): different word
// anakahcikocêwisip- (NA-1): different word
// aniskamân (NA-1): spelling change
// apisci-kahkâkîs- (NA-1): spelling change
// apisciyinîs (NA-1): spelling change
// apisimôswayân- (NA-1): different word
