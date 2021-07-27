import readNDJSON from './readNDJSON.js';


void async function query() {

  const entries = await readNDJSON(`data/database.ndjson`);

  const matches = entries.filter(e => {

    const md = e.dataSources.MD;
    const cw = e.dataSources.CW;

    return md?.mapping?.type === `dialect`;

  });

  const entry = matches[1];

  entry.test = `matchType: dialect`;
  console.log(entry.dataSources);

  console.log(JSON.stringify(entry));

}();
