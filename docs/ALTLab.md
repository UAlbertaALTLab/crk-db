# ALTLab Database

The ALTLab database is an ALTLab-specific data source which acts as an override to the other data sources. Any data specified in this database will take precedence over the data from other sources. This allows us to permanently store information about certain entries.

This data source is a TSV file because this is the easiest data format to edit by hand.

The conversion and importation steps for this data source are combined into one step, which can be run using the `import/altlab.js` script.
