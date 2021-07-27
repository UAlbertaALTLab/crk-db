import readNDJSON from './readNDJSON.js';


void async function query() {

  const entries = await readNDJSON(`data/database.ndjson`);

  const entry = entries.find(e => {

    const md = e.dataSources.MD;
    const cw = e.dataSources.CW;

    return md?.mapping?.type === `broad`;

  });

  entry.test = `matchType: broad`;
  // console.log(entry.dataSources.CW);

  console.log(JSON.stringify(entry));

}();
