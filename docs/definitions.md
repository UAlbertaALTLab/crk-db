# Definition Fields

# `coreDefinition`

* Used for auto-translation.
* Should not include notes.
* Should not include any disallowed kinds of parenthetical comments.
* _Should_ include desired parenthetical comments.

# `displayDefinition`

* The definition displayed to the user.
* Should contain the full original definition, with all of the following:
  - general notes
  - usage notes
  - cross-references
  - examples
  - literal meaning
  - scientific name
  - parenthetical comments

# `semanticDefinition`

* Used for both search and semantic vectors.
* `coreDefinition` + `literalMeaning`
* Should not include any notes.
* Should not include any disallowed kinds of parenthetical comments.
* _Should_ include desired parenthetical comments.
