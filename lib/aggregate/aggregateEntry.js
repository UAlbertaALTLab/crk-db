/**
 * Aggregates all the data sources in an ALTLab database entry into the main entry.
 * @param  {Object} entry
 * @return {Object} Returns the database entry, modified.
 */
export default function aggregateEntry(entry) {

  const { CW: cw, MD: md } = entry.dataSources;

  entry.head = {
    proto: cw.head.proto,
    sro:   cw.head.sro,
    syll:  cw.head.syll,
  };

  entry.lemma = {
    proto: cw.lemma.proto,
    sro:   cw.lemma.sro,
    syll:  cw.lemma.syll,
  };

  entry.pos = cw.pos ?? md.pos;

  // SENSES

  entry.senses = cw.senses.map(sense => Object.assign({ source: `CW` }, sense));

  switch (md?.mapping?.type) {
      case `broad`:
        entry.senses.push(...md.senses.map(sense => Object.assign({ source: `MD` }, sense)));
        break;
      case `conjugation`: // fall through
      case `dialect`:     // fall through
      case `different`:   // fall through
      case `equivalent`:  // fall through
      case `Err/Orth`:    // fall through
      default: break;
  }

  // decide which senses to display if there's no match type specified

  return entry;

}
