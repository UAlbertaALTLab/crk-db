/* eslint-disable
  no-param-reassign,
*/

const defaultThreshold = 0.8;

/**
 * Compares two definitions and returns the minimum similarity value for the two definitions, between 0 and 1, 0 being completely dissimilar, and 1 being completely similar.
 * @param  {String} a The first definition.
 * @param  {String} b The second definition.
 * @return {Number}
 */
function getSimilarity(a, b) {
  const aWords    = a.split(/\s+/gu);                 // list of words in definition A
  const bWords    = b.split(/\s+/gu);                 // list of words in definition B
  const bothWords = intersection(aWords, bWords);     // list of words contained in both definitions
  const aOverlap  = bothWords.length / aWords.length; // % of words in A that are also in B
  const bOverlap  = bothWords.length / bWords.length; // % of words in B that are also in A
  return Math.min(aOverlap, bOverlap);
}

function intersection(a, b) {
  const s = new Set(b);
  return [...new Set(a)].filter(x => s.has(x));
}


/**
 * Given a set of definitions, this function determines which definitions are sufficiently similar that one can be omitted.
 * @param {Array}  definitions             An Array of definitions to compare. Each definition must be Object with `source` and `definition` properties.
 * @param {Object} [options={}]            An options Object.
 * @param {Array}  [options.precedence]    An Array of data sources in order of precedence. If omitted, the order of keys in the definitions object will be used.
 * @param {Number} [options.threshold=0.8] The minimum threshold of matching words for two definitions to be considered the same, as a percentage between 0 and 1.
 * @returns
 */
export default function aggregateDefinitions(definitions, options = {}) {

  definitions = JSON.parse(JSON.stringify(definitions));
  let { precedence } = options;

  if (!precedence) {
    precedence = Array.from(new Set(definitions.map(({ source }) => source)));
  }

  for (const def of definitions) {

    if (!precedence.includes(def.source)) {
      throw new Error(`Unrecognized source: ${ def.source } in ${ def.definition }`);
    }

    def.sources = [def.source];

  }

  const threshold         = options.threshold ?? defaultThreshold;
  const mergedDefinitions = [];

  for (const src of precedence) {

    // get definitions for the current source
    const defs = definitions.filter(({ source }) => source === src);

    // if there aren't yet any selected definitions, add the current ones
    if (!mergedDefinitions.length) {
      mergedDefinitions.push(...defs);
      continue;
    }

    // for each definition from that source
    defsLoop:
    for (const currentDefinition of defs) {

      // compare the definition to each selected definition
      for (const existingDefinition of mergedDefinitions) {

        if (currentDefinition === existingDefinition) continue;

        const similarity = getSimilarity(currentDefinition.definition, existingDefinition.definition);
        const isSimilar  = similarity >= threshold;

        // NOTE: Once a definition is deemed similar and merged with an existing definition,
        // break out of the definitions loop (using the labeled break statement) so that no more processing is done for this definition.
        if (isSimilar) {
          existingDefinition.sources.push(src);
          break defsLoop;
        }

      }

      // NOTE: This conditional is only reached if the definition hasn't already been matched to an existing one.
      // (See labeled break statement above.)
      if (!mergedDefinitions.includes(currentDefinition)) {
        mergedDefinitions.push(currentDefinition);
      }

    }

  }

  for (const definition of mergedDefinitions) {
    delete definition.source;
  }

  return mergedDefinitions;

}
