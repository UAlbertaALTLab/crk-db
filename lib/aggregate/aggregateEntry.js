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

  if (md?.mapping?.type) {

    switch (md?.mapping?.type) {
        // copy MD senses into main entry for these match types
        case `broad`:
        case `narrow`:
          entry.senses.push(...md.senses.map(sense => Object.assign({ source: `MD` }, sense)));
          break;
          // do not copy MD senses into main entry for these match types
        case `conjugation`:
        case `dialect`:
        case `different`:
        case `equivalent`:
        case `Err/Orth`:
        case `lemma`: // currently no entries with this match type
        case `PV`: // currently no entries with this match type
        case `same`:
        case `similar`:
        default: break;
    }

  }

  // NOTE: Currently not displaying MD senses for programmatic matches.
  // TODO: Use a bag-of-words approach to decide which MD senses to display.

  return entry;

}
