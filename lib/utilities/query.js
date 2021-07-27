import readNDJSON from './readNDJSON.js';


void async function query() {

  const entries = await readNDJSON(`data/database.ndjson`);

  const matches = entries.filter(e => {

    const md = e.dataSources.MD;
    const cw = e.dataSources.CW;

    return md?.mapping?.type === `same`;

  });

  const entry = matches[0];

  entry.test = `matchType: same`;
  console.log(entry.dataSources);

  console.log(JSON.stringify(entry));

}();
