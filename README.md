# Plains Cree Dictionary Database Management

The repository contains scripts and documentation for managing the multiple data sources for [ALTLab's][ALTLab] [Plains Cree][Cree] dictionary, which can be viewed online [here][itwewina]. This repository does _not_ (and should not) contain the actual data. That data is stored in the private ALTLab repo under `crk/dicts`.

The database uses the [Data Format for Digital Linguistics][DaFoDiL] (DaFoDiL) as its underlying data format, a set of recommendations for storing linguistic data in JSON.

## Contents

<!-- TOC -->
- [Sources](#sources)
- [Process](#process)
- [The Database](#the-database)
- [Building & Updating the Database](#building--updating-the-database)
- [Steps to incrementally update the production database](#steps-to-incrementally-update-the-production-database)
- [Tests](#tests)
<!-- /TOC -->

## Sources

ALTLab's dictionary database is / will be aggregated from the following sources:

* [Arok Wolvengrey][Arok]'s [_nêhiyawêwin: itwêwina / Cree: Words_][CW] (`CW`)
  - This is a living source.
* [Maskwacîs][Maskwacis] [_Nehiyawêwina Pîkiskwewinisa / Dictionary of Cree Words_][MD] (`MD`)
  - This a static source. We are using a manually-edited version of the original dictionary.
* _Alberta Elders' Cree Dictionary_ (`AECD` or `AE` or `ED`)
  - This is a static source.
* [Albert Lacombe][Lacombe]'s _Dictionnaire de la langue des Cris_ (`DLC`)
  - This will be a static source.
* _The Student's Dictionary of Literary Plains Cree, Based on Contemporary Texts_
  - This source has already been integrated into _Cree: Words_.
* ALTLab's internal database
  - This is mostly a set of overrides, where we can store information about certain entries permanently.

Also check out the [Plains Cree Grammar Pages][grammar].

## Process

At a high level, the process for aggregating the sources is as follows:

1. **convert** each data source from original format to [DaFoDiL][DaFoDiL] and save it as an [NDJSON] file.
3. **import** the data into the Plains Cree database using an algorithm that first matches entries and then aggregates the information in them
4. create **outputs**:
   - the **import JSON** database for itwêwina
   - the **FST** LEXC files

## The Database

The database is located in the private ALTLab repo at `crk/dicts/database.ndjson`. This repo includes the following JavaScript utilities for working with the database, both located in `lib/utlities`.

* `readNDJSON.js`: Reads all the entries from the database (or any NDJSON file) into memory and returns a Promise that resolves to an Array of the entries for further querying and manipulation.
* `writeNDJSON.js`: Accepts an Array of database entries (or any JavaScript Objects) and saves it to the specified path as an NDJSON file.

## Building & Updating the Database

To build and/or update the database, follow the steps below. Each of these steps can be performed independently of the others. You can also rebuild the entire database with a single command (see the end of this section).

1. Download the original data sources. These are stored in the private ALTLab repo in `crk/dicts`. **Do not commit these files to git.**

     * ALTLab data: `altlab.tsv`
     * _Cree: Words_: `Wolvengrey.toolbox`
     * Maskwacîs dictionary: `Maskwacis.tsv`

2. Install [Node.js][Node]. This will allow you to run the JavaScript scripts used by this project. Note that the Node installation includes the **npm** package manager, which allows you to install Node packages.

3. Install the dependencies for this repo: `npm install`.

4. Convert each data source by running `node bin/convert-*.js <inputPath> <outputPath>`, where `*` stands for the abbreviation of the data source, ex. `convert-CW data/Wolvengrey.toolbox data/CW.ndjson`.

    You can also convert individual data sources by running the conversion scripts as modules. Each conversion script is located in `lib/convert/{ABBR}.js`, where `{ABBR}` is the abbreviation for the data source. Each module exports a function which takes two arguments: the path to the data source and optionally the path where you would like the converted data saved (this should have a `.ndjson` extension). Each module returns an array of the converted entries as well.

5. Import each data source into the dictionary database with `node bin/import-*.js <sourcePath> <databasePath>`, where `*` stands for the abbreviation of the data source, `<sourcePath>` is the path to the individual source database, and `<databasePath>` is the path to the combined ALTLab database.

    You can also import individual data sources by running the import scripts as modules. Each import script is located in `/lib/import/{ABBR}.js`, where `{ABBR}` is the abbreviation for the data source.

    Entries from individual sources are **not** imported as main entries in the ALTLab database. Instead they are stored as subentries (using the `dataSources` field). The import script merely matches entries from individual sources to a main entry, or creates a main entry if none exists. An aggregation script then does the work of combining information from each of the subentries into a main entry (see the next step).

    Each import step prints a table to the console, showing how many entries from the original data source were unmatched.

    When importing the Maskwacîs database, you can add an `-r` or `--report` flag to output a list of unmatched entries to a file. The flag takes the file path as its argument.

6. Aggregate the data from the individual data sources: `node bin/aggregate.js <inputPath> <outputPath>` (the output path can be the same as the input path; this will overwrite the original).

7. For convenience, you can perform all the above steps with a single command in the terminal: `npm run build` | `yarn build`. In order for this command to work, you will need each of the following files to be present in the `/data` directory, with these exact filenames:

   * `ALTLab.tsv`
   * `Maskwacis.tsv`
   * `Wolvengrey.toolbox`

    The database will be written to `data/database.ndjson`.

    You can also run this script as a JavaScript module. It is located in `lib/buildDatabase.js`.

## Steps to incrementally update the production database

1. Clear the existing database: `rm src/crkeng/db/db.sqlite3`
2. Start a virtual environment: `pipenv shell`
3. Migrate the database: `./crkeng-manage migrate`
4. Import latest version of database: `./crkeng-manage importjsondict {path/to/database.importjson}`
   - incremental update: `--incremental`
   - don't translate wordforms (runs faster): `--no-translate-wordforms`
5. Run a local server to test results: `./crkeng-manage runserver`
6. Build test database: `./crkeng-manage buildtestimportjson --full-importjson {path/to/database.importjson}`
7. Run tests: `pipenv run test`
   - If either the structure of the database or the definitions of the test entries have changed, the tests may fail. You will need to update the tests.
8. Log into U Alberta VPN using Cisco VPN or similar.
9. Save the latest version of the import JSON to the private ALTLab repo (under `home/morphodict/altlab`) or your user directory. (It can't be copied directly to its final destination because you must assume the morphodict user in order to have write access to the `morphodict/` directory.)
10. SSH into the ALTLab gateway and tunnel to the morphodict server.
11. Become the morphodict user: `sudo -i -u morphodict`
12. Update the import JSON file located at `/opt/morphodict/home/morphodict/src/crkeng/resources/dictionary/crkeng_dictionary.importjson` by copying it from the private ALTLab repo located at `/opt/morphodict/home/altlab/crk/dicts`.
13. Get the ID of the current Docker container:
    1. `cd /opt/morphodict/home/morphodict/src/crkeng/resources/dictionary`
    2. `docker ps | grep crkeng` (`docker ps` lists docker processes)
    3. Copy container ID.
14. Run incremental import on new version of database:
   1. `docker exec -it --user=morphodict {containerID} ./crkeng-manage importjsondict --purge --incremental {path/to/database}`
   * The `morphodict` user is required to write changes.
   * The path to the database will be `src/crkeng/resources/dictionary/crkeng_dictionary.importjson` or some variation thereof.

## Tests

Tests for this repository are written using Mocha + Chai. The tests check that the conversion scripts are working properly, and test for known edge cases. There is one test suite for each conversion script (and some other miscellaneous unit tests as well), located alongside that script in `lib` with the extension `.test.js`. You can run the entire test suite with `npm test`.

<!-- Links -->
[ALTLab]:     https://github.com/UAlbertaALTLab
[Arok]:       https://www.fnuniv.ca/academic/faculty/dr-arok-wolvengrey/
[Cree]:       https://en.wikipedia.org/wiki/Plains_Cree
[CW]:         https://uofrpress.ca/Books/C/Cree-Words
[DaFoDiL]:    https://format.digitallinguistics.io/
[grammar]:    https://plainscree.atlas-ling.ca/grammar/
[itwewina]:   https://itwewina.altlab.app/
[Lacombe]:    https://en.wikipedia.org/wiki/Albert_Lacombe
[Maskwacis]:  https://en.wikipedia.org/wiki/Maskwacis
[MD]:         https://www.altlab.dev/maskwacis/dictionary.html
[NDJSON]:     http://ndjson.org/
[Node]:       https://nodejs.org/en/