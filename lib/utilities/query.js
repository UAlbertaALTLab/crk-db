import readNDJSON from './readNDJSON.js';


void async function query() {

  const entries = await readNDJSON(`data/database.ndjson`);

  const matches = entries.filter(e => {

    const md = e.dataSources.MD;
    const cw = e.dataSources.CW;

    return md?.mapping?.type === `PV`;

  });

  const entry = matches[0];

  entry.test = `matchType: PV`;
  console.log(entry.dataSources);

  console.log(JSON.stringify(entry));

}();
