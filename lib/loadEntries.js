/**
 * Loads all the entries in the CW database into memory.
 */

import fs     from 'fs';
import ndjson from 'ndjson';

function loadEntries() {
  return new Promise((resolve, reject) => {

    const entries = [];

    fs.createReadStream(`data/Wolvengrey.json`)
    .pipe(ndjson.parse())
    .on(`data`, entry => entries.push(entry))
    .on(`end`, () => resolve(entries))
    .on(`error`, error => reject(error));

  });
}

export default loadEntries;
