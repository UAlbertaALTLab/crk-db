import createSpinner         from 'ora';
import { createWriteStream } from 'fs';
import DatabaseIndex         from '../utilities/DatabaseIndex.js';
import readNDJSON            from '../utilities/readNDJSON.js';
import { Transducer }        from 'hfstol';
import writeNDJSON           from '../utilities/writeNDJSON.js';
import isPOSMatch            from '../utilities/isPOSMatch.js';

function getPos(str) {
  if (!str) return ``;
  if (str.startsWith(`N`)) return `N`;
  if (str.startsWith(`V`)) return `V`;
  if (str.startsWith(`Pr`)) return `Pro`;
  if (str.startsWith(`I`)) return `Part`;
  return ``;
}

function createkey(entry) {
  return entry.lemma.sro;
}

/**
 * Updates an ALTLab entry with data from a MD entry.
 * @param  {Object} dbEntry
 * @param  {Object} mdEntry
 * @return {Object} Returns the updated ALTLab entry.
 */
function updateEntry(dbEntry, mdEntry) {
  dbEntry.dataSources.MD = mdEntry;
  return dbEntry;
}

/**
 * A class representing an ALTLab database entry.
 */
class DatabaseEntry {

  /**
   * Create a new database entry from an MD entry.
   * @param {Object} mdEntry
   */
  constructor(mdEntry) {

    this.dataSources    ??= {};
    this.dataSources.MD   = mdEntry;
  
    this.head  = Object.assign({}, mdEntry.head);
    this.lemma = Object.assign({}, mdEntry.lemma);
    this.pos   = mdEntry.pos;
  
    mdEntry.matched = true;
  
    return this;
  }

}

/**
 * Generates an array entry for the analysis that can be plugged in standard places, like to use isPOSMatch.
 * @param {string} analysis
 * @return{Array<Analysis>} Returns a set of analyser-generated analysis. 
 */
function parseMapping ( fstAnalyser, mapping ){
  let encodedAnalysis = mapping.analysis.split(' VS ');
  if (encodedAnalysis.length > 1 ) {
    encodedAnalysis = encodedAnalysis.filter(entry => entry.startsWith('*'))[0].substring(1);
  } else {
    encodedAnalysis = encodedAnalysis[0];
  }
  const candidates = fstAnalyser.lookup_lemma_with_affixes(mapping.lemma);
  let options = new Set (candidates.filter(entry => entry.flat().join('') === mapping.analysis))
  if (options.size == 1 ) {
    return options.values().next().value
  }
  function similarAnalysesSet( candidate ) {
    // At most have one tag difference.
    const prefixes = candidate[0].map((prefix, i) => candidate[0].filter(entry => entry != prefix))
    prefixes.push(candidate[0])

    const postfixes = candidate[2].map((postfix, i) => candidate[2].filter(entry => entry != postfix))
    postfixes.push(candidate[2])

    return new Set(prefixes.map(prefix => {
      const prestring = prefix.join('')+candidate[1]
      return postfixes.map(postfix => prestring + postfix.join('')).map(entry => entry.replaceAll('ý','y'))
    }).flat())
  }
  const split = encodedAnalysis.split('+')
  const analysisOptions = split.map((element, i) => split.filter(entry => entry != element).join('+'))
  analysisOptions.push(encodedAnalysis)
  function generatesSimilarAnalysis( candidate ) {
    return analysisOptions.some(analysis => similarAnalysesSet(candidate).has(analysis))
  }
  options = candidates.filter(generatesSimilarAnalysis);
  if (options.length < 1) {
    return undefined;
  } else if (options.length > 1){
    return options[0]
  }
  return options[0]
}

/**
 * Imports the MD entries into the ALTLab database.
 * @param  {String} mdPath
 * @param  {String} dbPath
 * @param  {String} [fstPath]
 * @param  {Object} [options={}]
 * @param  {String} [report] The path where you would like the report generated.
 */
export default async function importMD(mdPath, dbPath, fstAnalyserPath, fstGeneratorPath, { report } = {}) {

  const readDatabaseSpinner = createSpinner(`Reading databases.`).start();

  const mdEntries      = await readNDJSON(mdPath);
  const dbEntries      = await readNDJSON(dbPath);
  const unmatched      = [];
  let   entriesUpdated = 0;

  readDatabaseSpinner.succeed(`Databases read into memory.`);

  const indexSpinner = createSpinner(`Indexing database.`).start();
  const dbIndex      = new DatabaseIndex(dbEntries, createkey);

  indexSpinner.succeed(`Database indexed.`);

  const importSpinner = createSpinner(`Importing MD entries.`).start();
  const fstAnalyser   = fstAnalyserPath ? new Transducer(fstAnalyserPath) : null;

  for (const mdEntry of mdEntries) {

    let dbEntry;

    // match by mapping
    if (mdEntry.mapping) {
      const key = mdEntry.mapping.lemma;
      dbEntry   = dbIndex.get(key);
    }

    // match by SRO
    if (!dbEntry) {
      const key = mdEntry.lemma.md;
      dbEntry   = dbIndex.get(key);
    }

    // match by FST with spell relax
    if (fstAnalyser && !dbEntry) {

      const matches = fstAnalyser.lookup(mdEntry.lemma.md);

      if (matches.length === 1) {
        const [analysis] = matches;
        const [lemma]    = analysis.split(`+`);
        dbEntry          = dbIndex.get(lemma);
      }

      // TODO: Attempt to determine which FST analysis is the correct match.
      // Try the POS first.
      // Try the English translation to disambiguate.
      // Then try a bag of words approach.

    }

    // multiple entries match: attempt to determine correct entry
    if (Array.isArray(dbEntry)) {

      let matches = dbEntry;

      // match by mapping
      if (!mdEntry.mapping) {
        unmatched.push(mdEntry);
        continue;
      }

      // match by POS
      const pos = mdEntry.mapping.analysis.split(/\+/gu);
      pos.shift();

      matches = matches
      .filter(entry => getPos(entry.pos) === getPos(pos[0]));

      if (matches.length === 1) {
        [dbEntry] = matches;
      } else {
        // Try more advanced POS matching
        const analysis = parseMapping(fstAnalyser, mdEntry.mapping);
        if (analysis) {
          matches = matches.filter(entry => isPOSMatch(entry.pos, analysis))
        }
        if (matches.length === 1) {
          [dbEntry] = matches;
        } else {
        const pos_string = pos.join("").toUpperCase();
        matches = matches
       .filter(entry => pos_string.startsWith(entry.pos.split('-')[0]));
        if (matches.length === 1) {
          [dbEntry] = matches;
        } else {
            unmatched.push(mdEntry);
            continue;
          }
        }
      }   

    }

    // no match found: add to unmatched entries
    if (!dbEntry) {
      unmatched.push(mdEntry);
      continue;
    }

    // single match found: update database entry
    updateEntry(dbEntry, mdEntry);
    entriesUpdated++;

  }

  for (const mdEntry of unmatched) {
    dbIndex.add(new DatabaseEntry(mdEntry))
  }

  importSpinner.succeed(`MD entries imported.`);

  const writeSpinner = createSpinner(`Writing entries to database file.`).start();
  const entries      = Array.from(dbIndex.values()).flat();

  await writeNDJSON(dbPath, entries);
  await writeNDJSON(`data/MD-unmatched.ndjson`, unmatched);

  writeSpinner.succeed(`Entries written to database file.`);

  console.info(`\n`);
  console.table({
    'Entries updated:':         entriesUpdated,
    'Entries without a match:': unmatched.length,
  });

  if (report) {

    const reportSpinner = createSpinner(`Generating report of unmatched entries.`).start();
    const writeStream   = createWriteStream(report);

    writeStream.write(`head\tPOS\toriginal\t\n`);

    for (const { head, original, pos } of unmatched) {
      writeStream.write(`${ head.md }\t${ pos }\t${ original }`);
    }

    writeStream.end();
    reportSpinner.succeed();

  }

}
