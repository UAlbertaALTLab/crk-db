import createSpinner from 'ora';
import readToolbox   from '../utilities/readToolbox.js';
import writeNDJSON   from '../utilities/writeNDJSON.js';
import partition     from '../utilities/general.js';
import {splitEntry, Entry}    from './CW.js';

/**
 * The main, top-level function which converts a Toolbox file to DaFoDiL.
 * @param  {String} toolboxPath  The path to the Toolbox file.
 * @param  {String} [outputPath] The path where the resulting NDJSON file should be saved.
 * @return {Array}               Returns an array of the entries in the database.
 */
export default async function convertCW(toolboxPath, outputPath) {

    const conversionSpinner = createSpinner(`Converting Toolbox entries to JSON.`).start();
  
    const parseObjects = (await readToolbox(toolboxPath))
    .map(splitEntry)
    .flat()
    .filter(Boolean);
  
    const { succeeding: records, failing: errors } = partition(parseObjects, obj => obj.name !== `ParseError`)
  
    const entries = records.map(record => new Entry(record));
  
    conversionSpinner.succeed(`${ entries.length } Toolbox entries converted to JSON.`);
  
    if (outputPath) {
      const writeFileSpinner = createSpinner(`Writing entries to NDJSON file.`).start();
      await writeNDJSON(outputPath, entries);
      writeFileSpinner.succeed(`${ entries.length } written to NDJSON file.\n`);
    }
  
    return { entries, errors };
  
  }
  