import removeParentheticals from './removeParentheticals.js';

export default function normalizeDefinition(str) {

  const coreDefinition = removeParentheticals(str.toLowerCase());

  return coreDefinition
  .replaceAll(/\s*\ban?\b\s*/gu, ` `)
  .replaceAll(`her/him`, `him`)
  .replaceAll(`him/her`, `him`)
  .replaceAll(`him/herself`, `himself`)
  .replaceAll(`his/her`, `his`)
  .replaceAll(`it/him`, `him`)
  .replaceAll(`s.o.`, `him`)
  .replaceAll(`s.t.`, `something`)
  .replaceAll(`s.w.`, `somewhere`)
  .replaceAll(`s/he`, `he`)
  .replaceAll(/\bthem\b/gu, `him`)
  .replaceAll(/[.,?!"'()]/gu, ``)
  .replaceAll(/\s{2,}/gu, ` `)
  .trim();

}
