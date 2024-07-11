
/**
 * Takes a set of FST suffix tags and produces the expected string to match CW 
 * @param {Set<String>} tags 
 * @returns {String}
 */
function parseSubWordClass(tags) {
  if ( tags.has('V') ) {
    if ( tags.has('II') ) {
      return 'II'
    }
    if ( tags.has('AI') ) {
      return 'AI'
    }
    if ( tags.has('TI') ) {
      return 'TI'
    }
    if ( tags.has('TA') ) {
      return 'TA'
    }
    return ''
  } else if ( tags.has('N')) {
    let swc = '';
    if (tags.has('D')) {
      swc += 'D'
    }
    if (tags.has('A')) {
      swc += 'A'
    }
    if (tags.has('I')) {
      swc += 'I'
    }
    return swc
  }
  throw new Error('parseSubWordClass called on an unexpected analysis')
}

function parseIpc( tags ) {
  if (tags.has('Interj')) {
    return 'IPJ'
  }
  return 'IPC'
}

/**
 * Takes an FST analysis with affixes and returns an Object containing the lemma, part of speech (N, V, etc.), and word class (TI, AI, etc.)
 * @param   {Array} analysis
 * @returns {Object}
 */
export default function parseAnalysis([prefixTags, lemma, suffixTags]) {
  // We follow https://github.com/giellalt/lang-crk/blob/main/tools/shellscripts/add-explicit-fields-to-crkeng.sh
  let tags = suffixTags.map(entry => entry.replace(`+`, ``));
  let pos = tags[0]
  tags = new Set(tags);

  const wordClass = pos === `N` || pos === `V` ? `${ pos }${ parseSubWordClass(tags) }` : pos == 'Ipc' ? parseIpc(tags) : pos.toUpperCase();

  return {
    lemma,
    pos,
    prefixTags,
    suffixTags,
    wordClass,
  };

}
