/**
 * A class representing a database index.
 * @extends Map
 */
export default class DatabaseIndex extends Map {

  /**
   * Create a new database index. Assumes all entries unique SRO headword + POS combinations.
   * @param {Array}    entries   An array of database entries to index.
   * @param {Function} createKey A function that accepts an entry as an argument and returns a key. The key does not have to be unique. Non-unique keys will be mapped to Arrays.
   */
  constructor(entries, createKey) {

    super();

    this.createKey = createKey;

    for (const entry of entries) {
      this.add(entry);
    }

  }

  /**
   * Adds an entry to the index.
   * @param {Object} entry The entry to add to the index.
   */
  add(entry) {

    const key           = this.createKey(entry);
    const existingEntry = this.get(key);

    if (existingEntry) {

      if (Array.isArray(existingEntry)) {
        existingEntry.push(entry);
        return this;
      }

      return this.set(key, [existingEntry, entry]);

    }

    return this.set(key, entry);

  }

  /**
   * Removes an entry from the index.
   * @param  {String} key The key of the entry to remove from the index.
   * @return {Map}
   */
  remove(key) {
    return this.delete(key);
  }

}
