import createSpinner              from 'ora';
import { promises as fsPromises } from 'fs';

const { readFile } = fsPromises;

/**
 * A class representing a CW Toolbox entry.
 * @prop {String} original - The original text of the entry.
 * @prop {Array}  lines    - An Array of Objects containing information about each line.
 */
export class ToolboxEntry {

  /**
   * Regular expression that matches the line code and text from a line.
   * @type {RegExp}
   */
  static lineCodeRegExp = /^\\(?<type>\S+)(?:\s+(?<text>.+))?$/u;

  /**
   * Create a new ToolboxEntry
   * @param {String} entryText The original text of the entry.
   */
  constructor(entryText) {

    this.original = entryText.trim();

    this.lines = this.original
    .split(/\r?\n\s*/gu)
    .map(line => line.trim())
    .filter(Boolean)
    .map(ToolboxEntry.parseLine);

    this.dialects    = this.getLinesByType(`dl`);
    this.definitions = this.getLinesByType(`def`);
    this.features    = this.getLinesByType(`gr1`);
    this.glosses     = this.getLinesByType(`gl`);
    this.new         = typeof this.getLineByType(`new`) !== `undefined`;
    this.pos         = this.getLinesByType(`ps`);
    this.test        = this.getLineByType(`test`);
    this.sources     = this.getLinesByType(`src`);
    this.sro         = this.getLineByType(`sro`);
    this.stems       = this.getLinesByType(`stm`);
    this.syll        = this.getLineByType(`syl`);

  }

  /**
   * Compiles the Toolbox entry and returns the entry as a multiline String.
   * @return {String}
   */
  compile() {
    return this.lines
    .reduce((entry, { text, type }) => {
      entry += `\\${ type }`;
      if (text) entry += ` ${ text }`;
      entry += `\r\n`; // use CRLF because the CW Toolbox database is managed on Windows
      return entry;
    }, ``);
  }

  /**
   * Get the line data for a single line.
   * @param type
   * @returns {Object|undefined}
   */
  getLine(type) {
    return this.lines.find(line => line.type === type);
  }

  /**
   * Get the line data for multiple lines.
   * @param type
   * @returns {Array}
   */
  getLines(type) {
    return this.lines.filter(line => line.type === type);
  }

  /**
   * Retrieves the text content of the first line of the provided type.
   * @param  {String} type The line type to find.
   * @return {String}
   */
  getLineByType(type) {
    return this.lines.find(line => line.type === type)?.text;
  }

  /**
   * Gets all lines of a certain type and returns an Array of their text contents.
   * @param  {String} type The line type to filter for.
   * @return {Array<String>}
   */
  getLinesByType(type) {
    return this.lines
    .filter(line => line.type === type)
    .map(({ text }) => text);
  }

  /**
   * Parses a line from a Toolbox file and returns an Object containing information about that line. This method is designed to be passed to a `.map()` function.
   * @param  {String}  line The Toolbox line to parse.
   * @param  {Integer} i    The index of the line within the Toolbox entry.
   * @return {Object}       Returns an object with `type` (the line type, using the initial backslash code), `text`, and `index`.
   */
  static parseLine(line, index) {
    const { text = ``, type } = line.match(ToolboxEntry.lineCodeRegExp).groups;
    return { index, text, type };
  }

}

/**
 * Reads a Toolbox file and returns an Array of entries, where each entry is an Array of lines in the entry. This script does not do any analysis of lines. Each line is preserved and passed through as is.
 * @param  {String} toolboxPath The path to the Toolbox file.
 * @return {Promise<Array>}
 */
export default async function readToolbox(toolboxPath, { silent = false }) {

  const parseEntriesSpinner = createSpinner(`Parse Toolbox entries`);
  const readFileSpinner     = createSpinner(`Read Toolbox file`);

  if (!silent) readFileSpinner.start();

  const text = await readFile(toolboxPath, `utf8`);

  if (!silent) {
    readFileSpinner.succeed(`Toolbox file read.`);
    parseEntriesSpinner.start();
  }

  let   entries = text.split(/(?:\r?\n\s*){2,}/gu);
  const header  = entries.shift();

  entries = entries
  .filter(Boolean)
  .map((entryText, index) => {
    const entry = new ToolboxEntry(entryText);
    entry.index = index;
    return entry;
  });

  entries.header = header;
  if (!silent) parseEntriesSpinner.succeed();

  return entries;

}
