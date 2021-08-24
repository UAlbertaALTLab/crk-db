/**
 * Takes an FST analysis with affixes and returns an Object containing the lemma, part of speech (N, V, etc.), and word class (TI, AI, etc.)
 * @param   {Array} analysis
 * @returns {Object}
 */
export default function parseAnalysis([prefixTags, lemma, suffixTags]) {

  let [pos, subclass] = suffixTags;
  pos = pos.replace(`+`, ``);
  if (subclass) subclass = subclass.replace(`+`, ``);

  const wordClass = pos === `N` || pos === `V` ? `${ pos }${ subclass }` : pos;

  return {
    lemma,
    pos,
    prefixTags,
    suffixTags,
    wordClass,
  };

}
