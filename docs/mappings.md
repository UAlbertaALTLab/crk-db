# MD > CW Mappings

@katieschmirler created a TSV file mapping entries in the MD database to their equivalent entry in the CW database. There are 5,153 mappings in total, 51 of which have duplicate MD headwords. It consists of the following columns:

* lemma_MD: The headword in the MD database.
* lemma_CW: The headword of the match in the CW database.
* definition_MD: The definition from the MD database.
* definition_CW: The definition from the CW database.
* matchType: The type of match (see [Match Types](#match-types) below)
* FST stem: The FST stem for the corresponding CW entry.

## Match Types

There are several types of matches:

Match Type    | Description
--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
`broad`       | MD has a broader meaning; probably the same lemma. Show in itwêwina.
`conjugation` | MD is the same lemma as a CW entry, but inflected (person, number, preverb, diminutive, etc.). This MD might be same/equivalent, similar, broader, or narrower meaning. Show in itwêwina. Would be good to associate this with its stem.
`dialect`     | Needs review.
`different`   | Needs review.
`equivalent`  | Glosses and lemmas match. Show in itwêwina.
`Err/Orth`    | "A very small but miscellaneous category. Ignore for now." [KS]
`lemma`       | Not the right lemma, but not necessarily a new lemma (usually due to vowel length). _Do not show in itwêwina_.
`narrow`      | MD has a narrower meaning; probably the same lemma. Show in itwêwina.
`PV`          | Something is wrong because of a preverb (e.g. misidentification of a preverb; wrong preverb because of vowel length). Otherwise these would be a `conjugation` type. _Do not show in itwêwina._
`same`        | Glosses and lemmas match. Show in itwêwina.
`similar`     | Very similar glosses, probably the same lemma. Needs review.

## Using the Mappings

The utility script `lib/utilities/getMappings.js` reads the MD > CW mappings file and returns a JavaScript Map of the records in the mappings TSV. The keys for the map are the MD headwords.
