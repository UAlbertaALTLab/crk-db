import createCSVStream      from 'csv-parse';
import { createReadStream } from 'fs';

/**
 * Reads the CSV file into an Array of JSON objects
 * @param  {String}         inputPath The path to the TSV file.
 * @param  {Object}         options   The options object to pass to csv-parse
 * @return {Promise<Array>}           Resolves to an Array of Objects representing rows in the TSV.
 */
export default async function readCSV(inputPath, options = {}) {

  const defaultOptions = {
    columns(header) {
      return header.map(column => column.trim())
    },
    delimiter: `\t`,
    relax:     true,
  };

  const csvOptions = Object.assign(defaultOptions, options);
  const readStream = createReadStream(inputPath);
  const csvStream  = createCSVStream(csvOptions);

  readStream.pipe(csvStream);

  const records = [];

  for await (const record of csvStream) {
    records.push(record);
  }

  return records;

}
