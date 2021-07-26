import createSpinner from 'ora';
import readToolbox   from '../utilities/readToolbox.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';

/**
 * Add a note to an object's "notes" array.
 * @param {Object} note   The Note object to add
 * @param {Object} object The object to add the note to
 */
function addNote(note, object) {
  object.notes = object.notes ?? [];
  object.notes.push(note);
}

/**
 * Create a key based on a lemma and POS.
 * @param  {String} lemma
 * @param  {String} pos
 * @return {String}
 */
function createKey(lemma, pos) {
  return `${ lemma.replace(/-$/u, ``) }@${ pos.split(`-`)[0] }`;
}

/**
 * Checks whether a string contains white space.
 * @param  {String}  str The string to check
 * @return {Boolean}
 */
function hasWhitespace(str) {
  return /\s/u.test(str);
}

/**
 * Remove punctuation from the head, returning the lemma.
 * @param  {String} string The head to convert.
 * @return {String}
 */
function head2lemma(string) {
  return string?.replace(/[!?]/gu, ``);
}

/**
 * Convert a string in the proto-orthography (with <ý> or <ń>) to a Plains Cree SRO transcription (with <y> only).
 * @param  {String} string The string to transliterate.
 * @return {String}
 */
function proto2sro(string) {
  return string
  ?.normalize()
  .replace(/ń/gu, `y`)  // U+0144
  .replace(/ý/gu, `y`); // U+00FD
}

/**
 * Removes an item from an Array.
 * @param {Any}   item  The item to remove.
 * @param {Array} array The Array to remove the item from.
 */
function splice(item, array) {
  const i = array.indexOf(item);
  array.splice(i, 1);
}

/**
 * Takes a Toolbox entry Object and splits it into 2 or more Toolbox entries depending on the number of definition + part-of-speech fields.
 * @param  {Object} toolboxEntry The Toolbox entry to split, if needed.
 * @return {Object|Array}        Returns the original entry if no splitting is necessary, or an Array of the new entries if the entry was split.
 */
function splitEntry(toolboxEntry) {

  const { definitions, original, pos, sro, test } = toolboxEntry;

  // missing definitions or POS (usually just in test entries)
  if (!(definitions.length && pos.length)) {
    return new ParseError(`Missing definitions or POS.`, {
      code: `MissingDefOrPOS`,
      original,
      sro,
      test,
    });
  }

  // 1 definition, 1 POS
  if (
    definitions.length === 1
    && pos.length === 1
  ) {
    toolboxEntry.definition = definitions.pop();
    toolboxEntry.pos        = pos.pop();
    delete toolboxEntry.definitions;
    return toolboxEntry;
  }

  // 1 POS, multiple definitions
  if (
    pos.length === 1
    && definitions.length > 1
  ) {
    return definitions.map(definition => {
      const clone      = JSON.parse(JSON.stringify(toolboxEntry));
      clone.definition = definition;
      clone.pos        = pos.pop();
      delete clone.definitions;
      return clone;
    });
  }

  // return a ParseError object if the number of definitions does not match the number of POS codes
  if (pos.length !== definitions.length) {
    return new ParseError(`Different number of definitions and POS codes.`, {
      code: `NumDefMismatch`,
      original,
      sro,
      test,
    });
  }

  // multiple definitions, multiple POS
  return definitions.map((definition, i) => {
    const clone      = JSON.parse(JSON.stringify(toolboxEntry));
    clone.definition = definition;
    clone.pos        = pos[i];
    delete clone.definitions;
    return clone;
  });

  // NOTE: There are no entries with 1 definition + multiple parts of speech

}

/**
 * A class representing a database entry, in DaFoDiL format.
 */
class Entry {

  /**
   * Create a new CW database entry from the original Toolbox entry.
   * @param {Object} toolboxEntry A Toolbox entry (returned from `readToolbox.js`)
   */
  constructor({
    definition,
    dialects,
    glosses,
    original,
    pos,
    sro,
    syll,
    test,
  }) {

    this.glosses  = glosses;
    this.original = original;
    this.pos      = pos;
    this.test     = test;

    this.head = {
      proto: sro, // the CW \sro field is actually the proto-orthography
      sro:   proto2sro(sro),
      syll,
    };

    this.lemma = {
      proto: head2lemma(this.head.proto),
      sro:   head2lemma(this.head.sro),
      syll,  // punctuation never appears in this field in the Toolbox file
    };

    this.dialects = Entry.#formatDialects(dialects);
    this.senses   = Entry.#splitDefinition(definition);

    this.#extractParentheticals();

  }

  /**
   * Extracts any parentheticals from a sense and stores them in the appropriate fields.
   */
  #extractParentheticals() {

    // Structure of Definitions
    // ====
    // Definitions may contain multiple parentheticals, in [brackets].
    // Parentheticals may themselves contain multiple notes, separated by semicolons.
    // Some notes are associated with the entire entry.
    // Other notes are associated with the particular sense they're in.

    this.senses.forEach(sense => {

      // extract any parentheticals from the definitions
      const {
        definition,
        parenthetical: parentheticalText,
      } = Entry.#extractParenthetical(sense.definition);

      if (!parentheticalText) return;

      // use the new, cleaned definition for the sense
      sense.definition = definition;

      // divide any parentheticals into separate notes
      const parentheticals = parentheticalText
      .split(`;`)
      .map(str => str.trim())
      .filter(Boolean);

      // extract literal definition from parentheticals
      const literalDefinitionNote = parentheticals.find(n => n.match(Entry.#literalDefinitionRegExp));

      if (literalDefinitionNote) {

        // remove note from parentheticals list
        splice(literalDefinitionNote, parentheticals);

        // set `literalMeaning` on the entry
        this.literalMeaning = literalDefinitionNote
        .match(Entry.#literalDefinitionRegExp)
        .groups
        .literalDefinition;

      }

      // extract Latin terms
      const latinTermNote = parentheticals.find(n => n.match(Entry.#latinTermRegExp));

      if (latinTermNote) {

        // remove note from parentheticals list
        splice(latinTermNote, parentheticals);

        // set `scientificName` on sense
        sense.scientificName = latinTermNote
        .match(Entry.#latinTermRegExp)
        .groups
        .scientificName;

      }

      // extract usage notes
      const usageNote = parentheticals.find(n => n.match(Entry.#usageRegExp));

      if (usageNote) {

        // remove note from parentheticals list
        splice(usageNote, parentheticals);

        // set `usages` on sense
        const { usage } = usageNote.match(Entry.#usageRegExp).groups;
        sense.usages    = [usage];

      }

      // extract cross-references
      const crossRefNote = parentheticals.find(n => n.match(Entry.#crossRefRegExp));

      if (crossRefNote) {

        splice(crossRefNote, parentheticals);

        const { crossRefText, relationType } = crossRefNote.match(Entry.#crossRefRegExp).groups;

        // if the cross-reference text is multiple words, we can't assume it's a headword
        // save it as a general note instead
        // otherwise treat it as a headword and save it as a cross-reference lexical relation
        if (hasWhitespace(crossRefText)) {

          const note = {
            noteType: `general`,
            text:     crossRefNote,
          };

          addNote(note, this);

        } else {

          const crossReference = {
            key:      createKey(crossRefText, this.pos),
            relation: relationType === `see` ? `crossReference` : `compare`,
          };

          // NOTE: Cross-references are saved to the entry rather than the sense,
          // even though Arok's intention may sometimes have been to associate
          // cross-references with specific senses.
          this.lexicalRelations = this.lexicalRelations ?? [];
          this.lexicalRelations.push(crossReference);

        }

      }

      // treat all other parentheticals like general notes
      if (parentheticals.length) {

        for (const parenthetical of parentheticals) {

          const note = {
            noteType: `general`,
            text:     parenthetical,
          };

          // if definition is empty, add note to entry
          // otherwise add it to the sense
          addNote(note, sense.definition ? sense : this);

        }

      }

    });

    // extract literal definitions from definitions (as opposed to parentheticals)
    const literalDefinitionSense = this.senses
    .find(({ definition }) => definition.match(Entry.#literalDefinitionRegExp));

    if (literalDefinitionSense) {

      // remove sense from list of senses
      splice(literalDefinitionSense, this.senses);

      // set `literalMeaning` on the entry
      this.literalMeaning = literalDefinitionSense.definition
      .match(Entry.#literalDefinitionRegExp)
      .groups
      .literalDefinition;

    }

    // remove any senses with empty definitions
    this.senses = this.senses.filter(sense => Boolean(sense.definition));

  }

  /**
   * Matches a parenthetical that is a cross-reference.
   * @type {RegExp}
   */
  static #crossRefRegExp = /(?<relationType>see|cf\.)\s(?<crossRefText>.+)\s*$/u;

  /**
   * Matches a parenthetical that is a Latin definition.
   * @type {RegExp}
   */
  static #latinTermRegExp = /^(?:Lt[:.]|Latin:?)\s+(?<scientificName>.+)\s*$/u;

  /**
   * Matches a parenthetical that is a literal definition.
   * @type {RegExp}
   */
  static #literalDefinitionRegExp = /^(?:lit[:.]{1,2}|literally:?)\s+['‘"“]?\s*(?<literalDefinition>.+?)\s*['’"”]?\s*$/u;

  /**
   * Matches parenthetical notes in a definition.
   * @type {RegExp}
   */
  static #parentheticalRegExp = /^(?<textBefore>.*)\[(?<parenthetical>.+)\](?<textAfter>.*)/u;

  /**
   * Matches a parenthetical that is a usage note.
   * @type {RegExp}
   */
  static #usageRegExp = /^(?<usage>.+):$/u;

  /**
   * Accepts a single definition (not multiple definitions with semicolons) and returns an object with "definition" and "parenthetical" properties. The definition will have the text of the parenthetical stripped from it.
   * @param  {String} definition The definition to extract parentheticals from.
   * @return {Object}            Returns an object with "definition" and "parenthetical" properties. "parenthetical" may be undefined.
   */
  static #extractParenthetical(definition) {

    const parentheticalMatch = definition.match(Entry.#parentheticalRegExp);

    if (!parentheticalMatch) return { definition };

    const { parenthetical, textBefore, textAfter } = parentheticalMatch.groups;

    return {
      definition:    [textBefore, textAfter].map(str => str.trim()).join(``),
      parenthetical: parenthetical.trim(),
    };

  }

  /**
   * Creates the "dialects" property.
   */
  static #formatDialects(dialects) {

    if (!dialects.length) return;

    return dialects.map(dialect => {
      if (dialect.includes(`npC`)) return `nort2960`;
      if (dialect.includes(`pC`)) return `plai1258`;
      if (dialect.includes(`sC`)) return `swam1239`;
      if (dialect.includes(`wC`)) return `wood1236`;
      return `unknown`;
    });

  }

  /**
   * Splits the original definition into multiple definitions based on semicolons, while taking into account that parentheticals may contain semicolons as well.
   * @param  {String} [input=''] The original definition from the Toolbox file
   * @return {Array}             Returns an Array of definitions.
   */
  static #splitDefinition(definition) {

    if (!definition) return [];

    const chunks            = definition.split(`;`).map(str => str.trim());
    let   currentDefinition = [];
    let   inParenthetical   = false;

    return chunks.reduce((defs, chunk) => {

      const hasOpeningBracket = chunk.includes(`[`);
      const hasClosingBracket = chunk.includes(`]`);

      currentDefinition.push(chunk);

      // in the middle of a parenthetical
      if (hasOpeningBracket && !hasClosingBracket) inParenthetical = true;

      // parenthetical is complete
      if (!hasOpeningBracket && hasClosingBracket) inParenthetical = false;

      // unless in the middle of a parenthetical,
      // push the current definition to the definitions array
      if (!inParenthetical) {
        defs.push(currentDefinition.join(`; `));
        currentDefinition = [];
      }

      return defs;

    }, [])
    .map(def => ({ definition: def }));

  }

}

/**
 * A class representing a parsing error.
 * @extends Error
 */
class ParseError extends Error {
  /**
   * Create a new ParseError.
   * @param {String} message       The error message to display.
   * @param {Object} info          An object containing further information about the error.
   * @param {String} info.code     A code for this error.
   * @param {String} info.original The text of the original Toolbox entry.
   * @param {String} info.sro      The value of the \sro field from the original entry.
   * @param {String} info.test     The title of the test, if a test entry.
   */
  constructor(message, {
    code,
    original,
    sro,
    test,
  } = {}) {
    super(message);
    this.code           = code;
    this.name           = `ParseError`;
    this.original       = original;
    this.sro            = sro;
    if (test) this.test = test;
  }
}

/**
 * The main, top-level function which converts a Toolbox file to DaFoDiL.
 * @param  {String} toolboxPath  The path to the Toolbox file.
 * @param  {String} [outputPath] The path where the resulting NDJSON file should be saved.
 * @return {Array}               Returns an array of the entries in the database.
 */
export default async function convertCW(toolboxPath, outputPath) {

  let   entries           = await readToolbox(toolboxPath);
  const conversionSpinner = createSpinner(`Converting Toolbox entries to JSON.`).start();
  entries                 = entries.map(splitEntry).flat();
  const errors            = entries.filter(entry => entry.name === `ParseError`);

  entries = entries
  .filter(entry => entry.name !== `ParseError`)
  .map(toolboxEntry => new Entry(toolboxEntry));

  conversionSpinner.succeed(`${ entries.length } Toolbox entries converted to JSON.`);

  if (outputPath) {
    const writeFileSpinner = createSpinner(`Writing entries to NDJSON file.`).start();
    await writeNDJSON(outputPath, entries);
    writeFileSpinner.succeed(`${ entries.length } written to NDJSON file.\n`);
  }

  return { entries, errors };

}
