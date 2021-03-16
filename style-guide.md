# Style Guide

This style guide documents the lexicographical conventions used in the ALT Lab Plains Cree dictionary database.

## Glossary

<dl>

  <dt>citation form</dt>
  <dd>
    <p>The form of the word used when spoken in isolation. In Plains Cree, the citation form is usually different from the stem.</p>
    <ul>
      <li><b>English example</b>: The citation form for verbs in English is usually the infinitive. <i>to be</i> is the citation form of the verb <i>be</i>.</li>
      <li><b>Plains Cree example:</b> The citation form for verbs is the third person singular independent (<small>3SG.INDEP</small>) form. <i>mîciw</i> is the citation form of the verb <i>mîci‑</i> <q>eat</q>.</li>
    </ul>
  </dd>

  <dt>headword</dt>
  <dd>The word under which a set of related dictionary entries or definitions appears. Used to alphabetize and look up entries.</dd>

  <dt>inflection</dt>
  <dd>The parts of the word that indicate grammatical categories such as tense, aspect, voice, mood, person, number, gender, animacy, etc.</dd>

  <dt>lemma</dt>
  <dd>
    <p>The form of a lexeme (usually the stem) conventionally used to represent that lexeme.</p>
    <ul>
      <li><b>English example:</b> The lemma for the wordforms <i>am</i>, <i>are</i>, <i>is</i>, <i>was</i>, <i>were</i> is conventionally <i>be</i>.</li>
      <li><b>Plains Cree example:</b> The lemma for the wordforms <i>nimîcin</i> <q>I eat</q>, <i>kimîcin</i> <q>you eat</q>, and <i>mîciw</i> <q>s/he eats</q> is <i>mîci‑</i> <q>eat</q>.</li>
    </ul>
  </dd>

  <dt>lexeme</dt>
  <dd>A vocabulary item. Lexemes often have many different inflected forms with different grammatical distinctions, but share a core semantic meaning. By convention, one of those forms is chosen to represent the lexeme, and that form is called the <dfn>lemma</dfn>.</dd>

  <dt>stem</dt>
  <dd>
    <p>The part of the word which is common to all its inflected variants. <b>OR</b> The part of the word that inflection is added to.</p>
    <p>In Plains Cree, verb stems are <dfn>bound forms</dfn> that always require additional affixes, so they are typically written with a following hyphen: <i>mîci‑</i> <q>eat</q>.</p>
  </dd>

</dl>

## Database Fields

Most types of information in the database fit nicely within the [DLx DaFoDiL specification][DaFoDiL]. The following are potential exceptions / additions:

* `comparisons`: Manual comparisons of the entries in CW and MD.

* `fstStem`: The stem used by the FST, when it is different from the stem in the entry.

* `headword`
  - The headword is always the citation form of the word, not necessarily the stem.
  - Homographs are not distinguished with a homograph number.

## Citation Forms

- **verb:** <small>3SG.INDEP</small>
- **noun (dependent):** <small>1SG.POSS</small>
- **noun (independent):** <small>SG</small> (non-possessed)
- **noun (plural-only):** <small>PL</small> (non-possessed)
- probably others…

<!-- LINKS -->
[DaFoDiL]: https://format.digitallinguistics.io/
