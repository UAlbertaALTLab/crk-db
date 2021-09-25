/**
 * Parses a CW \ps field into inflectional category, part of speech, and word class.
 * @param   {String} category
 * @returns {Object} Returns an Object with `inflectional_category`, `pos`, and `wordclass` properties.
 */
export default function parseCategory(category) {

  const [wordClass] = category.split(/[- ]/u);

  let pos;

  // NOTE: Some of these need to be lowercase in order to match
  // categories in assignParadigms.ts
  if (wordClass.startsWith(`N`)) pos = `N`;
  else if (wordClass.startsWith(`V`)) pos = `V`;
  else if (wordClass.startsWith(`Pr`)) pos = `Pron`;
  else pos = `Ipc`;

  return {
    inflectionalCategory: category,
    pos,
    wordClass,
  };

}
