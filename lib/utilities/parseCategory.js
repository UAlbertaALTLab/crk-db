/**
 * Parses a CW \ps field into inflectional category, part of speech, and word class.
 * @param   {String} category
 * @returns {Object} Returns an Object with `inflectional_category`, `pos`, and `wordclass` properties.
 */
export default function parseCategory(category) {

  const wordclass = category.split(`-`)[0];

  let pos;

  if (wordclass.startsWith(`N`)) pos = `N`;
  else if (wordclass.startsWith(`V`)) pos = `V`;
  else if (wordclass.startsWith(`Pr`)) pos = `PRON`;
  else pos = `PART`;

  return {
    inflectional_category: category,
    pos,
    wordclass,
  };

}
