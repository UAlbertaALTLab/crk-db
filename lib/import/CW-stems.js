import createSpinner from 'ora';
import readTSV       from '../utilities/readTSV.js';
import writeTSV      from '../utilities/writeTSV.js';

const inputColumns = [
  `sro`,
  `syl`,
  `ps`,
  `def`,
  `dl`,
  `gr1`,
  `stm`,
  `fststem`,
  `drv`,
  `mrp`,
  `alt`,
  `rel`,
  `sem`,
  `gl`,
  `cat`,
  `his`,
  `gr2`,
  `src`,
  `dt`,
  `new`,
  `question`,
  `altsp`,
];

const outputColumns = [
  `proto`,
  `pos`,
  `stem`,
  `fst_stem`,
];

/**
 * Imports the FST stems from the old CW TSV file and adds them to the ALTLab database.
 * @param  {String}  stemsPath Path to the CW TSV file.
 * @param  {String}  dbPath    Path to the ALTLab YAML file.
 * @return {Promise}
 */
export default async function importCWStems(stemsPath, dbPath) {

  const loadSpinner = createSpinner(`Reading TSV into memory.`).start();
  const stemEntries = await readTSV(stemsPath, { columns: inputColumns, from: 2 });
  loadSpinner.succeed(`Stems TSV read into memory.`);

  const importSpinner = createSpinner(`Importing FST stems.`).start();

  const dbEntries = stemEntries
  .filter(e => Boolean(e.fststem.trim()))
  .filter(e => e.fststem !== `CHECK`)
  .map(({
    sro,
    ps,
    stm,
    fststem,
  }) => [
    sro,
    ps,
    stm,
    fststem,
  ]);

  importSpinner.succeed(`FST stems imported.`);

  const writeSpinner = createSpinner(`Writing database file.`).start();
  await writeTSV(dbPath, dbEntries, { columns: outputColumns, header: true });
  writeSpinner.succeed(`${ dbEntries.length } entries written to file.`);

}

importCWStems(`data/Wolvengrey.tsv`, `data/altlab.tsv`);
