const instrRegExp = /^by\s+/u;

// NOTE: There must be white space before the opening parenthesis for this to match.
// This prevents matches on things like "house(s)".
const parentheticalRegExp = /(?<parenthetical>\s+\(\s*(?<parenText>.+?)\s*\)\s*)/gu;

const EnglishPronouns = new Set([
  `his/her own`,
  `him/herself`,
  `it as`,
  `it/him`,
  `it`,
  `of it`,
  `of something`,
  `on s.t.`,
  `s.o. as`,
  `s.t.`,
  `something`,
  `that`,
  `them`,
  `to it/him`,
  `to something`,
]);

export default function removeParentheticals(definition) {

  let coreDefinition = definition;
  let match;

  while ((match = parentheticalRegExp.exec(coreDefinition)) !== null) {

    const { parenText, parenthetical } = match.groups;

    // allow desired parentheticals
    if (
      instrRegExp.test(parenText) || // allow "by" phrases (instrumentals)
      EnglishPronouns.has(parenText) // allow pronouns
    ) {
      continue;
    }

    // remove all other parentheticals (including "e.g." and "i.e." parentheticals)
    coreDefinition = coreDefinition.replace(parenthetical, ` `);

  }

  return coreDefinition
  .replace(/\s{2,}/gu, ` `)
  .replace(/\s+,/gu, `,`)
  .trim();

}
