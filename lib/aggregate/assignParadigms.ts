import { join as joinPath } from "path";
import { fileURLToPath }    from "url";
import { Transducer }       from "hfstol";
import readNDJSON           from '../utilities/readNDJSON.js';
import writeNDJSON          from '../utilities/writeNDJSON.js';

import { intersection, isEqual, min, uniqBy } from "lodash-es";

type Analysis = [string[], string, string[]];

export type NdjsonEntry = {
  dataSources: {
    [SourceAbbreviation: string]: {
      pos?: string;
    };
  };
  fst: { analysis?: Analysis };
  head: { proto?: string; sro?: string };
  paradigm?: string | null;
};

export const PERSONAL_PRONOUNS = new Set([
  // Personal pronouns
  "niya",
  "kiya",
  "wiya",
  "niyanân",
  "kiyânaw",
  "kiyawâw",
  "wiyawâw",
]);

export const DEMONSTRATIVE_PRONOUNS = new Set([
  // Animate demonstratives
  "awa",
  "ana",
  "nâha",
  "ôki",
  "aniki",
  "nêki",
  // Inanimate demonstratives
  "ôma",
  "ôhi",
  "anima",
  "anihi",
  "nêma",
  "nêhi",
  // Inanimate/Obviative inanimate demonstratives
  "ôhi",
  "anihi",
  "nêhi",
]);

// If we’ve whittled choices down to just the analyses listed, take the first
// one in the list.
const TIE_BREAKERS = [
  ["maskwa+N+A+Sg", "maskwa+N+A+Obv"],
  ["niska+N+A+Sg", "niska+N+A+Obv"],
  ["môswa+N+A+Sg", "môswa+N+A+Obv"],
];

function getTieBreaker(analyses: Analysis[]) {
  // FIXME: on all but tiny input dictionaries, tieBreakers should be turned
  // into a map by lemma.
  const smushed = analyses.map((a) => smushAnalysis(a));
  for (const tb of TIE_BREAKERS) {
    if (isEqual(tb, smushed)) {
      for (const a of analyses) {
        if (smushAnalysis(a) === tb[0]) {
          return a;
        }
      }
    }
  }
  return null;
}

let analyzer = new Transducer(
  joinPath(
    fileURLToPath(import.meta.url),
    "..",
    "..",
    "..",
    "crk-relaxed-analyzer-for-dictionary.hfstol"
  )
);

export function smushAnalysis(lemma_with_affixes: Analysis) {
  const [prefixTags, lemma, suffixTags] = lemma_with_affixes;
  return [prefixTags.join(""), lemma, suffixTags.join("")].join("");
}

/**
 * Attempt to infer the correct FST analysis of the provided head, given the pos.
 *
 * matchAnalysis() does the work of figuring out if an FST analysis could
 * potentially apply to the given headword. If there are multiple viable
 * candidates, this method tries to pick the best one.
 *
 * Currently it will pick the matching analysis with the lowest tag count if
 * there is one, otherwise it requires a manual entry in TIE_BREAKERS
 * above.
 */
export function inferAnalysis({
  head,
  pos,
}: {
  head: string;
  pos?: string;
}): { analysis?: Analysis; paradigm?: string; ok: boolean } {
  let ok = false;

  // bug? cwd analyzer has duplicate results for nitha
  const analyses = uniqBy(
    analyzer.lookup_lemma_with_affixes(head),
    smushAnalysis
  );
  // Does FST analysis match POS from toolbox file?
  let matches = [];
  for (const a of analyses) {
    const match = matchAnalysis(a, { head, pos });
    if (match) {
      matches.push(match);
    }
  }
  let analysis, paradigm;
  if (matches.length > 0) {
    // ôma analyzes as +Pron+Def or +Pron+Dem; since we have a paradigm for
    // the latter, let’s prefer it.
    const matchesWithParadigms = matches.filter((m) => m.paradigm !== null);
    if (matchesWithParadigms.length > 0) {
      matches = matchesWithParadigms;
    }

    function analysisTagCount(analysis: Analysis) {
      const [prefixTags, _lemma, suffixTags] = analysis;
      return prefixTags.length + suffixTags.length;
    }

    const minTagCount = min(matches.map((m) => analysisTagCount(m.analysis)));
    const matchesWithMinTagCount = matches.filter(
      (m) => analysisTagCount(m.analysis) === minTagCount
    );
    if (matchesWithMinTagCount.length === 1) {
      const bestMatch = matchesWithMinTagCount[0];
      analysis = bestMatch.analysis;
      paradigm = bestMatch.paradigm;
      ok = true;
    } else if (getTieBreaker(matchesWithMinTagCount.map((m) => m.analysis))) {
      const tieBreakerAnalysis = getTieBreaker(
        matchesWithMinTagCount.map((m) => m.analysis)
      );
      for (const m of matchesWithMinTagCount) {
        if (m.analysis === tieBreakerAnalysis) {
          analysis = m.analysis;
          paradigm = m.paradigm;
          ok = true;
          break;
        }
      }
      if (!ok) {
        throw Error("tie breaker exists but was not applied");
      }
    } else {
      // console.log(`${matches.length} matches for ${head}`);
      ok = false;
    }
  } else {
    // console.log(`${matches.length} matches for ${head}`);
    ok = false;
  }

  return { analysis, paradigm: paradigm ?? undefined, ok };

}

/**
 * If the FST analysis matches, return {analysis, paradigm}. Otherwise return null.
 *
 * For example, a +V+II analysis will match to an entry with pos = VII, but
 * not to one with pos = VAI.
 */
export function matchAnalysis(
  analysis: Analysis,
  { head, pos }: { head: string; pos: unknown }
): { analysis: Analysis; paradigm: string | null } | null {
  if (!pos || !(typeof pos === "string")) {
    return null;
  }

  const [_prefixTags, _lemma, suffixTags] = analysis;

  if (pos.startsWith("I")) {
    if (suffixTags.includes("+Ipc")) {
      return { analysis, paradigm: null };
    }
  }

  if (
    pos === "PrA" &&
    PERSONAL_PRONOUNS.has(head) &&
    suffixTags.includes("+Pron") &&
    suffixTags.includes("+Pers")
  ) {
    return { analysis, paradigm: "personal-pronouns" };
  }

  if (
    pos === "PrA" &&
    DEMONSTRATIVE_PRONOUNS.has(head) &&
    suffixTags.includes("+Pron") &&
    suffixTags.includes("+Dem") &&
    suffixTags.includes("+A")
  ) {
    return { analysis, paradigm: "demonstrative-pronouns" };
  }

  if (
    pos === "PrI" &&
    DEMONSTRATIVE_PRONOUNS.has(head) &&
    suffixTags.includes("+Pron") &&
    suffixTags.includes("+Dem") &&
    suffixTags.includes("+I")
  ) {
    return { analysis, paradigm: "demonstrative-pronouns" };
  }

  if ((pos === "PrA" || pos === "PrI") && suffixTags.includes("+Pron")) {
    return { analysis, paradigm: null };
  }

  const specificWordClass = pos.split("-")[0];

  for (let [paradigmName, paradigmSpecificWordClass, paradigmTags] of [
    ["NA", "NA", ["+N", "+A"]],
    ["NI", "NI", ["+N", "+I"]],
    ["NDA", "NDA", ["+N", "+A", "+D"]],
    ["NDI", "NDI", ["+N", "+I", "+D"]],
    ["VTA", "VTA", ["+V", "+TA"]],
    ["VTI", "VTI", ["+V", "+TI"]],
    ["VAI", "VAI", ["+V", "+AI"]],
    ["VII", "VII", ["+V", "+II"]],
  ] as [string, string, string[]][]) {
    if (
      specificWordClass === paradigmSpecificWordClass &&
      intersection(paradigmTags, suffixTags).length === paradigmTags.length
    ) {
      return { analysis, paradigm: paradigmName };
    }
  }
  return null;
}

function doAssignment(entries: NdjsonEntry[]) {
  const unusedPersonalPronouns = new Set(PERSONAL_PRONOUNS);
  const unusedDemonstrativePronouns = new Set(DEMONSTRATIVE_PRONOUNS);

  for (const entry of entries) {
    const head = entry.head.sro!;
    const pos = entry.dataSources?.CW?.pos?.toString();

    const isProbablyMorpheme =
      head.startsWith("-") || (head.endsWith("-") && pos !== "IPV");
    const shouldTryAssigningParadigm = !isProbablyMorpheme;

    if (shouldTryAssigningParadigm) {
      let analysis;
      let paradigm;
      let ok = false;
      if (pos === "IPV") {
        ok = true;
      } else if (head.includes(" ")) {
        ok = true;
      } else {
        ({ analysis, paradigm, ok } = inferAnalysis({
          head,
          pos,
        }));
      }

      if (ok) {

        entry.fst          ??= {};
        entry.fst.analysis   = analysis;
        entry.paradigm       = paradigm;

        if (entry.paradigm === "demonstrative-pronouns") {
          unusedDemonstrativePronouns.delete(head);
        } else if (entry.paradigm === "personal-pronouns") {
          unusedPersonalPronouns.delete(head);
        }

      }

    }

  }

  if (unusedDemonstrativePronouns.size !== 0) {
    throw new Error(
      `Unused demonstrative pronouns: ${[...unusedDemonstrativePronouns].join(
        ", "
      )}`
    );
  }

  if (unusedPersonalPronouns.size !== 0) {
    throw new Error(
      `Unused personal pronouns: ${[...unusedPersonalPronouns].join(", ")}`
    );
  }

}

export default async function aggregate(dbPath: string, outPath: string) {
    const entries = await readNDJSON(dbPath);
    doAssignment(entries);
    await writeNDJSON(outPath, entries);
}

