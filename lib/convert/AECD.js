import createSpinner from 'ora';
import fs            from 'fs-extra';
import readTSV       from '../utilities/readTSV.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';

const { readJSON } = fs;

/**
 * A map of parts of speech in the Maskwacîs database to more normalized parts of speech. This value is assigned asynchronously when the script is run.
 * @type {Object}
 */
let posMap;

/** A map of rewritings that is to be used later */
let rewritings;

/**
 * A class representing a Maskwacîs database entry in DLx JSON format.
 */
class Entry {

  /**
   * Create a new Entry.
   * @param {Object} record A TSV record, as an Object.
   */
  constructor({
    AECD_original,
    Standardized,
    Analysis,
    Syllabics,
    Plural_original,
    POS,
    Definition,
    Standardized_Definition,
    test,
  }) {

    // if (Cross_References) {
    //   this.lexicalRelations = Entry.#parseCrossReferences(Cross_References);
    // }

    this.English_POS    = POS;

    // if (Examples) {
    //   this.examples = Entry.#parseExamples(Examples);
    // }

    this.head = {
      ae:   Standardized.trim(),
      syll: Syllabics.trim(),
    };

    this.lemma = {
      ae:   this.head.ae,
      syll:   this.head.syll,
    };

    // if (CW_Lemma) {
    //   this.mapping = {
    //     analysis:   FST_Stem,
    //     definition: CW_Definition,
    //     lemma:      CW_Lemma,
    //     type:       MatchType,
    //   };
    // }

    this.original = AECD_original;

    // if (Parentheticals) {
    //   this.notes = [
    //     {
    //       noteType: `general`,
    //       text:     Parentheticals,
    //     },
    //   ];
    // }

    this.pos             = posMap.get(POS) ; // NOTE: POS can be empty or null
    this.Analysis = Analysis;
    this.Standardized_Definition = Standardized_Definition;
    this.Plural_original = Plural_original;
    // this.semanticDomains = Entry.#splitSemanticDomains(RapidWordsClasses);
    // this.semanticIndices = Entry.#splitSemanticDomains(RapidWordsIndices);
    this.test            = test;

    this.senses = Entry.#splitDefinition(Entry.#applyRewritings(Definition))
    .map(definition => ({
      definition,
      original: definition,
    }));

  }

  /**
   * Parses the text of the Cross_References column into lexical relations.
   * @param  {String} string The text of the Cross_References column
   * @return {Array<Object>}
   */
  static #parseCrossReferences(string) {
    return string
    .split(/\s*;\s*/u)
    .map(ref => ref.trim())
    .filter(Boolean)
    .map(ref => ({
      head:     { md: ref },
      relation: `see`,
    }));
  }

  /**
   * Parses a single example string into a basic Utterance Object.
   * @param  {String} string The text of the example.
   * @return {Utterance}
   */
  static #parseExample(string) {
    const [md, translation] = string.split(/\s*:\s*/u);
    return {
      transcription: { md },
      translation,
    };
  }

  /**
   * Parses the text of the Examples column.
   * @param  {String} string The text of the Examples column.
   * @return {Array<Utterance>}
   */
  static #parseExamples(string) {
    return string
    .split(/\s*;\s*/u)
    .map(ex => ex.trim())
    .filter(Boolean)
    .map(Entry.#parseExample);
  }

  /**
   * Removes a question mark or exclamation point from a string.
   * @param  {String} string The String to remove punctuation from.
   * @return {String}
   */
  static #removePunctuation(string) {
    return string.replace(/[?!]/gu, ``);
  }

  static #applyRewritings( string ) {
    let text = string;
    rewritings.forEach((replaceWith, match) => {
      text = text.replaceAll(match,replaceWith);
    });
    return text;
  }

  /**
   * Splits a string into senses based on sense numbers (1., 2. etc.).
   * @param  {String} definition The string to split.
   * @return {Array}             Returns an array of definitions, even when only one sense/definition is present.
   */
  static #splitDefinition(definition) {
    return definition
    .split(';')                   // divide definition by semicolon
    .filter(Boolean)                      // remove empty strings
    .map(str => str.trim())               // trim white space
    .map(str => str.replace(/,$/u, ``))   // remove trailing commas
    .map(str => str.replace(/\.$/u, ``)); // and trailiing periods.
  }

  /**
   * Parses the RapidWordsClasses or RapidWordIndices field into an array of semantic domains/indices.
   * @param  {String}        rapidWordsClasses The raw string contained in the RapidWordsClasses field.
   * @return {Array<String>}                   Returns an array of semantic domains.
   */
  static #splitSemanticDomains(rapidWordsClasses) {
    return rapidWordsClasses.split(/;\s*/u);
  }

}

/**
 * Convert the Maskwacîs database to DLx JSON format.
 * @param  {String} inputPath    The path to the AECD TSV file.
 * @param  {String} [outputPath] The path where the output NDJSON data should be written.
 * @return {Object}              Returns an Object with `entries` and `errors` properties, both Arrays.
 */
export default async function convertAECD(inputPath, outputPath) {

  const posTable = await readJSON(`./lib/constants/AECD-pos.json`);
  posMap         = new Map(Object.entries(posTable));
  rewritings     = new Map(Object.entries(await readJSON(`./lib/constants/AECD-rewritings.json`)));

  const errors  = [];
  let   entries = await readTSV(inputPath, { raw: true, relaxColumnCount: true });

  entries = entries.map(({ record, raw }) => {
    record.original = raw;
    record.Standardized_Definition = record['Standardized Definition']
    record.Plural_original = record['Plural-original'];
    record.AECD_original = record['AECD-original'];
    return new Entry(record);
  });

  if (outputPath) {
    const writeFileSpinner = createSpinner(`Writing entries to NDJSON file.`).start();
    await writeNDJSON(outputPath, entries);
    writeFileSpinner.succeed(`Entries written to NDJSON file.\n`);
  }

  return {
    entries,
    errors,
  };

}
