# Updating the Database for itwêwina
This document describes the current process to generate a complete `inputjson` file for morphodict from the available sources (most of them described in the main README of this repo).

As referenced in UAlbertaALTLab/crk-db#108, the process is:

1. Update dictionary sources
2. Update LEXC sources based on updated dictionary sources
3. Compile new FSTs in giellalt/lang-crk
4. Aggregate and process dictionary sources into an `importjson` file for uploading to the intelligent dictionary
5. Update the internal database for the intelligent dictionary, including whatever geenration of forms in paradigms or English translation equivalents.

