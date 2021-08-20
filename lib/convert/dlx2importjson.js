/**
 * Converts a single entry in DaFoDiL format to import JSON format.
 * @param   {Object} dlxEntry        The DaFoDiL entry to convert.
 * @param   {Object} [options={}]    An options object.
 * @param   {String} [options.ortho] The abbreviation of the internal orthography to use. Defaults to the first orthography found.
 * @returns {Object}                 Returns an Object in import JSON format.
 */
function convertEntry(
  {
    fst = {},
    head,
    lexicalRelations = [],
  },
  { ortho } = {},
) {
  return {
    analysis: fst.analysis,
    formOf:   lexicalRelations.find(relation => relation.relationType === `formOf`)?.key,
    fstLemma: fst.analysis ? undefined : fst.lemma,
    head:     head[ortho] || Object.values(head)[0],
  };
}

export default function(dlx) {
  return dlx.map(convertEntry);
}
