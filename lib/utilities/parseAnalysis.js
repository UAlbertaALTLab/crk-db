/**
 * Takes an FST analysis with affixes and returns an Object containing the lemma, part of speech (N, V, etc.), and word class (TI, AI, etc.)
 * @param   {Array} analysis
 * @returns {Object}
 */
export default function parseAnalysis([prefixTags, lemma, suffixTags]) {

  let [pos, ...subclasses] = suffixTags;
  pos = pos.replace(`+`, ``);
  if (subclasses) subclasses = subclasses.map(entry => entry.replace(`+`, ``));

  const wordClass = pos === `N` || pos === `V` ? `${ pos }${ subclasses.slice(0, 2).join('') }` : pos;

  return {
    lemma,
    pos,
    prefixTags,
    suffixTags,
    wordClass,
  };

}
