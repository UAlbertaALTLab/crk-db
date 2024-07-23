import createSpinner         from 'ora';
import { createWriteStream } from 'fs';
import DatabaseIndex         from '../utilities/DatabaseIndex.js';
import readNDJSON            from '../utilities/readNDJSON.js';
import { Transducer }        from 'hfstol';
import writeNDJSON           from '../utilities/writeNDJSON.js';
import isPOSMatch            from '../utilities/isPOSMatch.js';
import { mergeBaseEntry }    from '../convert/CW.js';

function getPos(str) {
  if (!str) return ``;
  if (str.startsWith(`N`)) return `N`;
  if (str.startsWith(`V`)) return `V`;
  if (str.startsWith(`Pr`)) return `Pro`;
  if (str.startsWith(`I`)) return `Part`;
  return ``;
}

function createkey(entry) {
  return `${ entry.lemma.sro }@${ entry.pos }`
}

/**
 * Updates an ALTLab entry with data from a MD entry.
 * @param  {Object} dbEntry
 * @param  {Object} mdEntry
 * @return {Object} Returns the updated ALTLab entry.
 */
function updateEntry(dbEntry, mdEntry) {
  if(!dbEntry.dataSources.MD) {
    dbEntry.dataSources.MD = mdEntry;
  } else {
    dbEntry.dataSources.MD.senses.push(...mdEntry.senses)
  }
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
  
    if (mdEntry.md_mapping) {
      mergeBaseEntry ( this, mdEntry.md_mapping.lemma, mdEntry.head.syll);
      if (mdEntry.md_mapping.category) {
        this.pos = mdEntry.md_mapping.category;
      }
      this.candidateFST = mdEntry.mapping?.analysis;
    } else if (mdEntry.mapping) {
      mergeBaseEntry ( this, mdEntry.mapping.lemma, mdEntry.head.syll);
      this.candidateFST = mdEntry.mapping.analysis
    } else {
      this.head ??= {
        sro: mdEntry.head.md,
        proto: mdEntry.head.md,
        syll: mdEntry.head.syll
      }
      this.lemma ??= {
        sro: mdEntry.lemma.md,
        proto: mdEntry.lemma.md,
        syll: mdEntry.lemma.syll
      }
    }
    this.pos   ??= mdEntry.pos;
  
    mdEntry.matched = true;
  
    return this;
  }

}

/**
 * Generates an array entry for the analysis that can be plugged in standard places, like to use isPOSMatch.
 * @param {fst} the fst to which we'll give the entry
 * @param {string} analysis
 * @return{Array<Analysis>} Returns a set of analyser-generated analysis. 
 */
function parseAnalyses ( fstAnalyser, dbEntry ){
  const analysis = dbEntry.analysis || dbEntry.candidateFST || '';
  let encodedAnalyses = analysis.split(' VS ');
  const markedAsPreferred = entry => entry.startsWith('*');
  if (encodedAnalyses.find(markedAsPreferred)) {
    encodedAnalyses = encodedAnalyses.filter(entry => entry.startsWith('*')).map(entry => entry.substring(1))
  } 
  const candidates = fstAnalyser.lookup_lemma_with_affixes(dbEntry.lemma.sro || dbEntry.lemma);
  let options = new Set (candidates.filter(entry => entry.flat().join('') === analysis))
  if (options.size == 1 ) {
    return Array.from(options);
  }
  function similarAnalysesSet( candidate ) {
    // Compute analysis with at most have one tag difference.
    const prefixes = candidate[0].map((prefix, i) => candidate[0].filter(entry => entry != prefix))
    prefixes.push(candidate[0])

    const postfixes = candidate[2].map((postfix, i) => candidate[2].filter(entry => entry != postfix))
    postfixes.push(candidate[2])

    return new Set(prefixes.map(prefix => {
      const prestring = prefix.join('')+candidate[1]
      return postfixes.map(postfix => prestring + postfix.join(''))
    }).flat())
  }
  const analysisOptions = [];
  encodedAnalyses.forEach( encodedAnalysis => {
    const split = encodedAnalysis.split('+');
    analysisOptions.push(...split.map((element, i) => split.filter(entry => entry != element).join('+')));
    analysisOptions.push(encodedAnalysis)  
  })
  function generatesSimilarAnalysis( candidate ) {
    return analysisOptions.some(analysis => similarAnalysesSet(candidate).has(analysis))
  }
  return candidates.filter(generatesSimilarAnalysis);
}

function collectCandidateKeys( accented_y, mdEntry ) {
  const candidates = Array.from(accented_y.keys().filter(entry => entry.startsWith(mdEntry.mapping.lemma+"@")))
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
  let   entriesAdded   = 0;
  let   cw_lemma_entries = 0;
  let   md_lemma_entries = 0;
  const wrong_cw_lemma = [];
  const wrong_md_lemma = [];
  const ambiguous_matches = [];

  readDatabaseSpinner.succeed(`Databases read into memory.`);

  const indexSpinner = createSpinner(`Indexing database.`).start();
  const dbIndex      = new DatabaseIndex(dbEntries, createkey);

  const accented_y   = Map.groupBy(dbIndex.keys(), key => key.split('@')[0].replace(/ý/gu,"y"));


  indexSpinner.succeed(`Database indexed.`);

  const importSpinner = createSpinner(`Importing MD entries.`).start();
  const fstAnalyser   = fstAnalyserPath ? new Transducer(fstAnalyserPath) : null;

  for (const mdEntry of mdEntries) {

    let dbEntry;

    // match by mapping
    if (mdEntry.mapping) {
      cw_lemma_entries++;
      const keys = accented_y.get(mdEntry.mapping.lemma);
      if ( keys ) {
        dbEntry   = keys.map(key => dbIndex.get(key)).flat();
        if ( dbEntry.length < 1 ) {
          wrong_cw_lemma.push(mdEntry);
          dbEntry = undefined;
        }
      }
    }

    if(mdEntry.md_mapping) {
      md_lemma_entries++;
      const keys = accented_y.get(mdEntry.md_mapping.lemma);
      if ( keys ) {
        dbEntry   = keys.map(key => dbIndex.get(key)).flat();
        if ( dbEntry.length < 1 ) {
          wrong_md_lemma.push(mdEntry);
          dbEntry = undefined;
        }
      }
    }

    // match by SRO
    if (!dbEntry) {
      const key = mdEntry.lemma.md;
      dbEntry   = dbIndex.get(key);
    }

    // match by FST with spell relax
    // @fbanados:  This is unexpected and should not be done,
    //             Because it ends up matching inflected words with their uninflected counterparts!
    //             that should be the work of the "formOf" conversion,
    //             Not here.
    if (false && fstAnalyser && !dbEntry) {

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
      if (!mdEntry.mapping && !mdEntry.md_mapping) {
        unmatched.push(mdEntry);
        continue;
      }

      // match by FST analysis
      const candidate = new DatabaseEntry(mdEntry)

      // match by POS
      matches = matches
      .filter(entry => getPos(entry.pos) === getPos(candidate.pos) || getPos(entry.pos) === candidate.pos) ;

      if (matches.length === 1) {
        [dbEntry] = matches;
      } else {
        // Try more advanced POS matching
        const analyses = parseAnalyses(fstAnalyser, candidate);
        if (analyses.length == 1 ) {
          matches = matches.filter(entry => isPOSMatch(entry.pos, analyses[0]))
        } else {
          unmatched.push(mdEntry);
          continue;
        }
        if (matches.length === 1) {
          [dbEntry] = matches;
        } else if (matches.length < 1) {
          unmatched.push(mdEntry);
          continue;
        } else {
          ambiguous_matches.push([mdEntry, matches]);
          unmatched.push(mdEntry);
          continue;
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
    const candidate = new DatabaseEntry(mdEntry)
    const dbEntry = dbIndex.get(createkey(candidate))
    if (dbEntry && !Array.isArray(dbEntry)) {
      updateEntry(dbEntry, mdEntry);
      entriesUpdated++;
    } else {
      dbIndex.add(candidate)
      entriesAdded++;
    }
  }

  importSpinner.succeed(`MD entries imported.`);

  const writeSpinner = createSpinner(`Writing entries to database file.`).start();
  const entries      = Array.from(dbIndex.values()).flat();

  await writeNDJSON(dbPath, entries);
  await writeNDJSON(`data/MD-unmatched.ndjson`, unmatched);
  await writeNDJSON(`data/MD-ambiguous-matches.ndjson`, ambiguous_matches);
  writeSpinner.succeed(`Entries written to database file.`);

  console.info(`\n`);
  console.table({
    'Entries updated:':         entriesUpdated,
    'Entries matched to CW_Lemma':  cw_lemma_entries,
    'Entries matched to MD_Lemma': md_lemma_entries,
    'Entries without a match (new):': unmatched.length,
    'Unmatched because of multiple candidates:': ambiguous_matches.length,
    'Entries with an unmatched CW_Lemma': wrong_cw_lemma.length>0? wrong_cw_lemma.length+', like '+wrong_cw_lemma[0].head.md:0,
    'Entries with an unmatched MD_Lemma': wrong_md_lemma.length>0? wrong_md_lemma.length+', like '+wrong_md_lemma[0].head.md:0,
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
