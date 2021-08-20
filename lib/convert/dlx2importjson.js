function convertEntry({ fst, lexicalRelations = [] }) {
  return {
    analysis: fst?.analysis,
    formOf:   lexicalRelations.find(relation => relation.relationType === `formOf`)?.key,
  };
}

export default function(dlx) {
  return dlx.map(convertEntry);
}
