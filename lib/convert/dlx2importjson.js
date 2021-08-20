function convertEntry({ fst = {}, lexicalRelations = [] }) {
  return {
    analysis: fst.analysis,
    formOf:   lexicalRelations.find(relation => relation.relationType === `formOf`)?.key,
    fstLemma: fst.analysis ? undefined : fst.lemma,
  };
}

export default function(dlx) {
  return dlx.map(convertEntry);
}
