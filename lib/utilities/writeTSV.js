import createTSVStream      from 'csv-stringify';
import { createWriteStream } from 'fs';

export default function writeTSV(outputPath, data, options = { delimiter: `\t` }) {
  return new Promise((resolve, reject) => {

    const defaultOptions = { delimiter: `\t` };
    const writeSteam     = createWriteStream(outputPath);
    const tsvStream      = createTSVStream(Object.assign(defaultOptions, options));

    tsvStream.on(`error`, reject);
    writeSteam.on(`error`, reject);
    writeSteam.on(`close`, resolve);
    writeSteam.on(`finish`, resolve);

    tsvStream.pipe(writeSteam);

    for (const item of data) {
      tsvStream.write(Object.values(item));
    }

    tsvStream.end();

  });
}
