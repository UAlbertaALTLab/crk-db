#!/usr/bin/env node

import compare      from '../utilities/compare.js';
import program      from 'commander';
import readToolbox  from '../utilities/readToolbox.js';
import writeToolbox from '../utilities/writeToolbox.js';

async function cleanCW(dbPath, outputPath) {
  const entries = await readToolbox(dbPath);
  entries.forEach(orderLines);
  await writeToolbox(outputPath, entries);
}

function orderLines(entry) {

  // preserve the existing order of these bunches of lines
  // - ps + def
  // - stm + drv + mrp + mrp2
  // - alt-s + altsp

  const alt = entry.getLines(`alt`)
  .sort((a, b) => compare(a.text.normalize(`NFD`), b.text.normalize(`NFD`)));

  if (!alt.length) alt.push({ type: `alt`, text: `` });

  const altSp = entry.lines
  .filter(line => line.type === `alt-s` || line.type === `altsp` || line.type === `alt-sp`)
  .sort((a, b) => compare(a.text.normalize(`NFD`), b.text.normalize(`NFD`)));

  altSp.forEach(line => {
    line.type = `alt-sp`;
  });

  const morphology = entry.lines
  .filter(line => line.type === `stm`
    || line.type === `drv`
    || line.type === `mrp`
    || line.type === `mrp2`);

  const newLine = entry.new ? { type: `new`, text: `new` } : undefined;

  const senses = entry.lines
  .filter(line => line.type === `ps` || line.type === `def`);

  const sources = entry.getLines(`src`)
  .sort((a, b) => compare(a.text, b.text));

  if (!sources.length) sources.push({ type: `src`, text: `` });

  // order the lines here
  // with few exceptions, always use getLines()
  // just in case there are extra, unintended lines
  entry.lines = [
    ...entry.getLines(`sro`),
    ...entry.getLines(`syl`),
    ...senses,
    ...entry.getLines(`dl`),
    ...entry.getLines(`gr1`),
    ...morphology,
    ...alt,
    ...altSp,
    ...entry.getLines(`rel`),
    ...entry.getLines(`sem`),
    ...entry.getLines(`gl`),
    ...entry.getLines(`cat`),
    ...entry.getLines(`his`),
    ...entry.getLines(`gr2`),
    ...entry.getLines(`??`),
    ...sources,
    newLine,
    entry.getLine(`dt`),
  ]
  .filter(Boolean);

}

program
.arguments(`<dbPath> <outputPath>`)
.usage(`<dbPath> <outputPath>`)
.action(cleanCW);

program.parseAsync(process.argv);
