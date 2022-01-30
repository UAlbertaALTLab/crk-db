import aggregateDefinitions from '../utilities/aggregateDefinitions.js';
import createSpinner        from 'ora';
import DatabaseIndex        from '../utilities/DatabaseIndex.js';
import { fileURLToPath }    from 'url';
import parseAnalysis        from '../utilities/parseAnalysis.js';
import parseCategory        from '../utilities/parseCategory.js';
import readNDJSON           from '../utilities/readNDJSON.js';
import { Transducer }       from 'hfstol';
import writeNDJSON          from '../utilities/writeNDJSON.js';

import {
  dirname as getDirname,
  join    as joinPath,
} from 'path';

const __dirname = getDirname(fileURLToPath(import.meta.url));
const fstPath   = joinPath(__dirname, `../../crk-strict-analyzer-for-dictionary.hfstol`);
const fst       = new Transducer(fstPath);

const demonstrativePronouns = new Set([
  // Animate demonstratives
  `awa`,
  `ana`,
  `nâha`,
  `ôki`,
  `aniki`,
  `nêki`,
  // Inanimate demonstratives
  `ôma`,
  `ôhi`,
  `anima`,
  `anihi`,
  `nêma`,
  `nêhi`,
  // Inanimate/Obviative inanimate demonstratives
  `ôhi`,
  `anihi`,
  `nêhi`,
]);

const personalPronouns = new Set([
  `niya`,
  `kiya`,
  `wiya`,
  `niyanân`,
  `kiyânaw`,
  `kiyawâw`,
  `wiyawâw`,
]);

/**
 * Mark entries as forms of other entries (using `formOf`), if applicable.
 * @param {Map} index The database index
 */
function addFormOf(index) {

  const indicateFormOf = currentEntry => {

    if (!currentEntry.fst.analysis) return;
    const [, lemma]       = currentEntry.fst.analysis;
    const referencedEntry = index.get(lemma);

    if (!referencedEntry) return;
    if (referencedEntry === currentEntry) return;

    if (!Array.isArray(referencedEntry)) {
      currentEntry.lexicalRelations ??= [];
      currentEntry.lexicalRelations.push({
        key:          referencedEntry.key,
        relationType: `formOf`,
      });
    }

  };

  for (const entry of index.values()) {
    if (Array.isArray(entry)) entry.forEach(indicateFormOf);
    else indicateFormOf(entry);
  }

}

/**
 * Populates the `fst` object on the entry.
 * @param entries
 */
function addFstInfo(entries) {

  for (const entry of entries) {

    entry.fst       ??= {};
    entry.fst.lemma ??= entry.lemma.proto ?? entry.lemma.sro;
    entry.fst.stem  ??= entry.dataSources.ALT?.fst.stem;

    if (!entry.fst.stem && entry.dataSources.CW?.stems.length === 1) {
      [entry.fst.stem] = entry.dataSources.CW.stems;
    }

    let matches = fst.lookup_lemma_with_affixes(entry.fst.lemma);
    matches     = matches.filter(analysis => isPOSMatch(entry.category, analysis));

    if (!matches.length) continue;

    if (matches.length === 1) {
      [entry.fst.analysis] = matches;
      continue;
    }

    for (const match of matches) {
      match.tagCount = getTagCount(match);
    }

    const minTagCount = matches.reduce((currentMin, { tagCount }) => {
      if (currentMin === null) return tagCount;
      return tagCount < currentMin ? tagCount : currentMin;
    }, null);

    const matchesWithMinTagCount = matches.filter(match => match.tagCount === minTagCount);

    if (matchesWithMinTagCount.length === 1) {
      [entry.fst.analysis] = matchesWithMinTagCount;
      continue;
    }

  }

}

/**
 * Add unique keys to each entry.
 */
function addKeys(index) {

  // assign keys
  for (const [key, entry] of index.entries()) {

    // exactly one item with this key > set key
    if (!Array.isArray(entry)) {
      entry.key = key;
      continue;
    }

    // multiple entries have the same key
    const keyEntries = entry;

    // add word class disambiguator to each key
    keyEntries.forEach(e => {
      const { wordClass } = parseCategory(e.category);
      e.key = `${ key }@${ wordClass.toLowerCase() }`;
    });

    const keys = new Set(keyEntries.map(e => e.key));

    // if the keys still aren't unique,
    // add a numeric homograph disambiguator instead
    if (keys.size < keyEntries.length) {
      keyEntries.forEach((e, i) => {
        e.key = `${ key }@${ i + 1 }`;
      });
    }

  }

}

/**
 * Aggregates all the data sources in an ALTLab database entry into the main entry.
 * @param  {Object} entry
 * @return {Object} Returns the database entry, modified.
 */
function aggregateEntry(entry) {

  const { CW: cw, MD: md } = entry.dataSources;

  entry.category = cw.pos ?? md.pos;
  entry.features = cw ? cw.features : [];

  entry.head = {
    proto: cw.head.proto,
    sro:   cw.head.sro,
    syll:  cw.head.syll,
  };

  entry.lemma = {
    proto: cw.lemma.proto,
    sro:   cw.lemma.sro,
    syll:  cw.lemma.syll,
  };

  entry.literalMeaning = cw?.literalMeaning;

  // SENSES

  entry.senses = cw.senses.map(sense => Object.assign({ sources: [`CW`] }, sense));

  if (md?.mapping?.type) {

    switch (md?.mapping?.type) {
        // copy MD senses into main entry for these match types
        case `broad`:
        case `narrow`:
          entry.senses.push(...md.senses.map(sense => Object.assign({ sources: [`MD`] }, sense)));
          break;
        // do not copy MD senses into main entry for these match types
        case `conjugation`:
        case `dialect`:
        case `different`:
        case `equivalent`:
        case `Err/Orth`:
        case `lemma`: // currently no entries with this match type
        case `PV`: // currently no entries with this match type
        case `same`:
        case `similar`:
        default: break;
    }

  }

  // PARADIGMS

  const { wordClass } = parseCategory(entry.category);

  // default to null paradigm unless otherwise assigned
  entry.paradigm = null;

  if (
    wordClass === `NA` ||
    wordClass === `NDA` ||
    wordClass === `NDI` ||
    wordClass === `NI` ||
    wordClass === `VAI` ||
    wordClass === `VII` ||
    wordClass === `VTA` ||
    wordClass === `VTI`
  ) {

    entry.paradigm = wordClass;

  } else if (
    wordClass === `PrA` ||
    wordClass === `PrI`
  ) {

    if (demonstrativePronouns.has(entry.head.sro)) {
      entry.paradigm = `demonstrative-pronouns`;
    } else if (personalPronouns.has(entry.head.sro)) {
      entry.paradigm = `personal-pronouns`;
    }

  }

  // NOTE: Currently not displaying MD senses for programmatic matches.
  entry.senses = aggregateDefinitions(entry.senses);

  return entry;

}

/**
 * Gets the tag count from an FST analysis with affixes.
 * @param   {Array} analysis
 * @returns {Integer}
 */
function getTagCount(analysis) {
  const { prefixTags, suffixTags } = parseAnalysis(analysis);
  return prefixTags.length + suffixTags.length;
}

/**
 * Checks whether an analysis is the correct part of speech.
 * @param   {String}  category
 * @param   {Array}   analysis
 * @returns {Boolean}
 */
function isPOSMatch(category, analysis) {

  const { pos: categoryPOS, wordClass: categoryWordClass } = parseCategory(category);
  const { pos: analysisPOS, wordClass: analysisWordClass } = parseAnalysis(analysis);

  if (categoryPOS !== analysisPOS) return false;

  return categoryWordClass === analysisWordClass;

}

/**
 * Aggregates all the data sources in the ALTLab database into the main entry.
 * @param  {String} dbPath                 Path to the NDJSON database.
 * @param  {String} [outPath=`out.ndjson`] Path to output the aggregated database to.
 * @return {Array}                         Returns an array of aggregated entries.
 */
export default async function aggregate(dbPath, outPath = `out.ndjson`) {

  const readDatabaseSpinner = createSpinner(`Reading the database into memory.`).start();
  let   entries             = await readNDJSON(dbPath);

  entries = entries.filter(entry => {
    if (!entry.dataSources.CW) return false;
    return entry.dataSources.CW.dialects.includes(`plai1258`);
  });

  readDatabaseSpinner.succeed(`Database read into memory.`);

  const aggregationSpinner = createSpinner(`Aggregating main entries.`).start();

  for (const entry of entries) aggregateEntry(entry);

  const index = new DatabaseIndex(entries, entry => entry.head.sro
  .replaceAll(/[/\\&=']+/gu, ``)
  .replaceAll(/\s+/gu, `_`));

  addKeys(index);
  addFstInfo(entries);
  addFormOf(index);

  aggregationSpinner.succeed(`Main entries aggregated.`);

  const writeDatabaseSpinner = createSpinner(`Writing the database file.`).start();
  await writeNDJSON(outPath, entries);
  writeDatabaseSpinner.succeed(`Database written to ${ outPath }.`);

  return entries;

}
