import {
  RichText,
  TEXT_MARKS,
  type TextMark,
  type TextRun,
  type TextRuns,
} from "@ttrpg-cards/text";

/**
 * Strong and emphasis as the extracted files spell them, matched in one pass
 * so the two never interleave.
 *
 * The markers are the same ones the extraction's validator checks for before a
 * file is written: a pair may not be empty and may not wrap whitespace, and an
 * emphasis marker is only a marker at a word boundary, so `snake_case` stays
 * literal. Anything that fails those rules never reaches this parser.
 */
const INLINE_MARKUP =
  /\*\*(?=\S)(?<strong>.+?)(?<=\S)\*\*|(?<![\p{L}\p{N}])_(?=\S)(?<emphasis>.+?)(?<=\S)_(?![\p{L}\p{N}])/gsu;

/** Appends `text` as one run carrying `marks`, skipping an empty stretch. */
function append(
  runs: TextRun[],
  text: string,
  marks?: TextMark[],
): void {
  if (text === "") {
    return;
  }

  const run: TextRun = { text };

  if (marks !== undefined) {
    run.marks = marks;
  }

  runs.push(run);
}

/**
 * Inline markup turned into the runs a card carries.
 *
 * This is the boundary the markup stops at. The extracted files are an import
 * format and write emphasis as characters; the model stores it as structure,
 * so nothing downstream has to know a marker exists.
 *
 * Refuses an empty string, because a field with nothing to say is left off
 * rather than carrying an empty run.
 *
 * @example
 * ```ts
 * runsFromMarkup("A **steady** glow, and _nothing_ unlit.");
 * // [
 * //   { text: "A " },
 * //   { text: "steady", marks: ["strong"] },
 * //   { text: " glow, and " },
 * //   { text: "nothing", marks: ["emphasis"] },
 * //   { text: " unlit." },
 * // ]
 *
 * // An underscore inside a word is not a marker.
 * runsFromMarkup("snake_case_name"); // [{ text: "snake_case_name" }]
 * ```
 */
export function runsFromMarkup(markup: string): TextRuns {
  const runs: TextRun[] = [];
  let plainFrom = 0;

  for (const match of markup.matchAll(INLINE_MARKUP)) {
    append(runs, markup.slice(plainFrom, match.index));

    const strong = match.groups?.strong;
    const emphasis = match.groups?.emphasis;

    if (strong !== undefined) {
      append(runs, strong, [TEXT_MARKS.strong]);
    } else if (emphasis !== undefined) {
      append(runs, emphasis, [TEXT_MARKS.emphasis]);
    }

    plainFrom = match.index + match[0].length;
  }

  append(runs, markup.slice(plainFrom));

  if (runs.length === 0) {
    return RichText.of(markup);
  }

  return RichText.canonical(runs);
}
