
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
export function head2lemma(string) {
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
  .replace(/ń/gu, `y`); // U+0144
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
export function splitEntry(toolboxEntry) {

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

  // 1 POS, multiple definitions
  if (
    pos.length === 1
    && definitions.length > 1
  ) {
    return definitions.map(definition => {
      const clone      = JSON.parse(JSON.stringify(toolboxEntry));
      clone.definition = definition;
      [clone.pos]      = pos;
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

export class Entry {

  /**
   * Matches note notes in a definition.
   * @type {RegExp}
   */
  #bracketedTextRegExp = /^(?<textBefore>.*)\[(?<bracketedText>.+)\](?<textAfter>.*)/u;

  /**
   * Matches a note that is a cross-reference.
   * @type {RegExp}
   */
  #crossRefRegExp = /(?<relationType>see:?|cf\.)\s(?<crossRefText>.+)\s*$/u;

  /**
   * Matches a note that is a Latin definition.
   * @type {RegExp}
   */
  #latinTermRegExp = /^(?:La?t[:.]|Latin:?)\s+(?<scientificName>.+)\s*$/u;

  /**
   * Matches a note that is a literal definition.
   * @type {RegExp}
   */
  #literalDefinitionRegExp = /^(?:lit[:.]{1,2}|literally:?)\s+['‘"“]?\s*(?<literalDefinition>.+?)\s*['’"”]?\s*$/u;

  /**
   * Matches a note that is a usage note.
   * @type {RegExp}
   */
  #usageNoteRegExp = /^(?<usage>.+):$/u;

  /**
   * Create a new CW database entry from the original Toolbox entry.
   * @param {Object} toolboxEntry A Toolbox entry (returned from `readToolbox.js`)
   */
  constructor({
    definition,
    dialects,
    features,
    glosses,
    original,
    pos,
    sources,
    sro,
    syll,
    test,
    stems,
    fststems,
    possessive,
    rw_domains,
    rw_indices,
    wn_domains,
    lemma,
    alt
  }) {

    this.definition = definition;
    this.glosses    = glosses;
    this.original   = original;
    this.pos        = pos;
    this.sources    = sources;
    this.test       = test;
    this.rw_domains = rw_domains.map(domain => domain.trim());

    this.rw_indices = rw_indices;

    this.wn_domains = [];
    wn_domains.forEach(domain => {
      this.wn_domains.push(...
        domain.split('h;') // remove hypernym markers (UAlbertaALTLab/crk-db#114)
          .map(domain => domain.trim())
          .filter(entry => entry) // keep only non-empty entries
      );
    })

    this.head = {
      proto: sro, // the CW \sro field is actually the proto-orthography
      sro:   proto2sro(sro),
      syll,
    };

    if (lemma) {
      this.lemma = {
        proto: lemma,
        sro: proto2sro(lemma),
        syll,
      }
    } else {
      this.lemma = {
        proto: head2lemma(this.head.proto),
        sro:   head2lemma(this.head.sro),
        syll,  // punctuation never appears in this field in the Toolbox file
      };
    }

    this.dialects = Entry.#formatDialects(dialects);
    this.features = Entry.#parseFeatures(features);
    this.senses   = Entry.#splitDefinition(definition);
    this.stems    = stems.filter(Boolean);

    this.senses.forEach(sense => {
      sense.original = sense.definition;
    });

    this.#extractNotes();

    if (possessive){
      if (fststems.length > 1) {
        throw new Error("Multiple fst stems in CW source");
      }
      if (stems.length > 1) {
        throw new Error("Multiple stems in CW source");
      }
      const nonPossessive = (fststems.length > 0) ? fststems[0] : stems[0];
      const htmlInfo = `<p><table colspan=2><tr><td></td><td>Stem</td></tr><tr><td>Nonposs</td><td><strong>${nonPossessive}</strong></td></tr><tr><td>Poss</td><td><strong>${possessive}</strong></td></tr></table></p>`;
      this.htmlInfo = htmlInfo;
    }
    if (alt.length > 1) {
      this.htmlInfo ??= '';
      this.htmlInfo += `<p><table colspan=1><tr><td>Alternatives</td></tr>\n`+alt.map(entry => `<tr><td>${entry}</td></tr>`).join('\n')+`</table></p>`;
    }
  }

  /**
   * Extracts any notes from a sense and stores them in the appropriate fields.
   */
  #extractNotes() {

    // Structure of Definitions
    // ====
    // Definitions may contain (multiple) notes in [brackets].
    // Bracketed text may contain more than one note, separated by semicolons.
    // Some notes are associated with the entire entry.
    // Other notes are associated with the particular sense they're in.

    this.senses.forEach(sense => {

      // extract any notes from the definitions
      const {
        definition,
        bracketedText,
      } = this.#extractNote(sense.definition);

      if (!bracketedText) return;

      // use the new, cleaned definition for the sense
      sense.definition = definition;

      // divide the bracketed text into separate notes
      const notes = bracketedText
      .split(`;`)
      .map(str => str.trim())
      .filter(Boolean);

      // extract literal definition from notes
      const literalDefinitionNote = notes.find(note => note.match(this.#literalDefinitionRegExp));

      if (literalDefinitionNote) {

        // remove note from notes list
        splice(literalDefinitionNote, notes);

        // set `literalMeaning` on the entry
        this.literalMeaning = literalDefinitionNote
        .match(this.#literalDefinitionRegExp)
        .groups
        .literalDefinition;

      }

      // extract Latin terms
      const latinTermNote = notes.find(note => note.match(this.#latinTermRegExp));

      if (latinTermNote) {

        // remove note from notes list
        splice(latinTermNote, notes);

        // set `scientificName` on sense
        sense.scientificName = latinTermNote
        .match(this.#latinTermRegExp)
        .groups
        .scientificName;

      }

      // extract usage notes
      const usageNote = notes.find(note => note.match(this.#usageNoteRegExp));

      if (usageNote) {

        // remove note from notes list
        splice(usageNote, notes);

        // set `usages` on sense
        const { usage } = usageNote.match(this.#usageNoteRegExp).groups;
        sense.usages    = [usage];

      }

      // extract cross-references
      const crossRefNote = notes.find(note => note.match(this.#crossRefRegExp));

      if (crossRefNote) {

        splice(crossRefNote, notes);

        const { crossRefText, relationType } = crossRefNote.match(this.#crossRefRegExp).groups;

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
          this.lexicalRelations ??= [];
          this.lexicalRelations.push(crossReference);

        }

      }

      // treat all other notes like general notes
      if (notes.length) {

        for (const text of notes) {

          const note = {
            noteType: `general`,
            text,
          };

          // if definition is empty, add note to entry
          // otherwise add it to the sense
          addNote(note, sense.definition ? sense : this);

        }

      }

    });

    // extract literal definitions from definitions (as opposed to bracketed text)
    const literalDefinitionSense = this.senses
    .find(({ definition }) => definition.match(this.#literalDefinitionRegExp));

    if (literalDefinitionSense) {

      // remove sense from list of senses
      splice(literalDefinitionSense, this.senses);

      // set `literalMeaning` on the entry
      this.literalMeaning = literalDefinitionSense.definition
      .match(this.#literalDefinitionRegExp)
      .groups
      .literalDefinition;

    }

    // remove any senses with empty definitions
    // NOTE: this means that `senses` can be an empty array
    this.senses = this.senses.filter(sense => Boolean(sense.definition));

  }

  /**
   * Accepts a single definition (not multiple definitions with semicolons) and returns an object with `definition` and `bracketedText` properties. The definition will have the bracketed text stripped from it.
   * @param  {String} definition The definition to extract bracketed textx from.
   * @return {Object}            Returns an Object with `definition` and `bracketedText` properties. `bracketedText` may be undefined.
   */
  #extractNote(definition) {

    const match = definition.match(this.#bracketedTextRegExp);

    if (!match) return { definition };

    const { bracketedText, textBefore, textAfter } = match.groups;

    return {
      bracketedText: bracketedText.trim(),
      definition:    [textBefore, textAfter].map(str => str.trim()).join(``),
    };

  }

  /**
   * Creates the "dialects" property.
   */
  static #formatDialects(dialects) {

    if (!dialects.length) return [];

    return dialects.map(dialect => {
      if (dialect.includes(`npC`)) return `nort2960`;
      if (dialect.includes(`pC`)) return `plai1258`;
      if (dialect.includes(`sC`)) return `swam1239`;
      if (dialect.includes(`wC`)) return `wood1236`;
      return `unknown`;
    });

  }

  /**
   * Parses the content of the \gr1 (grammatical features) field into an object of features.
   * @param   {String} features The value of the \gr1 field.
   * @returns {Array}           Returns an Array of the grammatical features listed in the field. TODO: In the future this should probably be a Map or Object with features and their values. For now though it's just simple presence/absence of the feature.
   */
  static #parseFeatures(features = ``) {
    return features
    .split(/\s*;\s*/gu)
    .map(feature => feature.trim())
    .filter(Boolean);
  }

  /**
   * Splits the original definition into multiple definitions based on semicolons, while taking into account that notes may contain semicolons as well.
   * @param  {String} [input=''] The original definition from the Toolbox file
   * @return {Array}             Returns an Array of definitions.
   */
  static #splitDefinition(definition) {

    if (!definition) return [];

    const chunks            = definition.split(`;`).map(str => str.trim());
    let   currentDefinition = [];
    let   inBrackets        = false;

    return chunks.reduce((defs, chunk) => {

      const hasOpeningBracket = chunk.includes(`[`);
      const hasClosingBracket = chunk.includes(`]`);

      currentDefinition.push(chunk);

      // in the middle of bracketed text
      if (hasOpeningBracket && !hasClosingBracket) inBrackets = true;

      // bracketed text is complete
      if (!hasOpeningBracket && hasClosingBracket) inBrackets = false;

      // unless in the middle of bracketed text,
      // push the current definition to the definitions array
      if (!inBrackets) {
        defs.push(currentDefinition.join(`; `));
        currentDefinition = [];
      }

      return defs;

    }, [])
    .map(def => ({ definition: def.replace(/,$/u, ``) }));

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
 * Creates an entry from a single head, useful for merging entries, for example, from MD.
 * Eventually all dictionaries should rely on this method
 * @param {Object} entry     The object we will be merging against.
 * @param {String} head     The head to use, for crk-db, this should match CW orthography.
 * @param {String} syll     The syllabics for the head to use.
 * @returns {Object}         The base-structured object for a database entry
 */

export function mergeBaseEntry( entry, head, syll ){
  entry.head ??= {
      proto: head,
      sro: proto2sro(head),
      syll: syll
    }
  entry.lemma ??= {
      proto: head2lemma(head),
      sro: head2lemma(proto2sro(head)),
      syll: syll,
    }
  return entry;
}
