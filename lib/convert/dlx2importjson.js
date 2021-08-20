function convertEntry({ fst }) {
  return {
    analysis: fst?.analysis,
  };
}

export default function(dlx) {
  return dlx.map(convertEntry);
}
