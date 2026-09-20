import {
  RichText,
  TEXT_MARKS,
  type TextMark,
  type TextRun,
  type TextRuns,
} from "@ttrpg-cards/text";

/**
 * A marked span, matched in one pass so two kinds never interleave.
 *
 * Both marker characters are accepted in runs of one, two or three, so
 * `*emphasis*`, `__strong__` and `***both***` all read. The marker is captured
 * and matched back with a reference, which is what keeps `**strong*` from
 * closing against the wrong run.
 *
 * A pair may not be empty and may not wrap whitespace, so a lone marker and an
 * arithmetic `2 * 3` stay literal. An underscore is only a marker at a word
 * boundary, so `snake_case` stays literal too. An asterisk needs no such rule
 * because it does not appear inside words.
 */
const MARKED_SPAN =
  /(?<asterisks>\*{1,3})(?=\S)(?<asteriskText>[\s\S]+?)(?<=\S)\k<asterisks>|(?<![\p{L}\p{N}])(?<underscores>_{1,3})(?=\S)(?<underscoreText>[\s\S]+?)(?<=\S)\k<underscores>(?![\p{L}\p{N}])/gu;

/** What a span carries, by how many marker characters wrap it. */
const MARKS_BY_MARKER_LENGTH: readonly (readonly TextMark[])[] = [
  [],
  [TEXT_MARKS.emphasis],
  [TEXT_MARKS.strong],
  [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
];

/** An embedded picture. A card has nowhere to put one, so it comes off. */
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;

/** A note's internal link that names the text to show after a bar. */
const WIKI_LINK_ALIAS = /\[\[[^\]|]+\|([^\]]+)\]\]/g;

/** A note's internal link that shows what it points at. */
const WIKI_LINK = /\[\[([^\]|]+)\]\]/g;

/** A link. Nothing on a card is clickable, so only its text survives. */
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

/** A code span. The card sets everything in its own type, so the ticks come off. */
const CODE_SPAN = /`+([^`]+)`+/g;

/** A span of text and the marks it carries, pulled out of one match. */
interface MarkedSpan {
  readonly text: string;
  readonly marks: readonly TextMark[];
}

/** Appends `text` as one run carrying `marks`, skipping an empty stretch. */
function appendRun(
  runs: TextRun[],
  text: string,
  marks: readonly TextMark[] = [],
): void {
  if (text === "") {
    return;
  }

  const run: TextRun = { text };

  if (marks.length > 0) {
    run.marks = [...marks];
  }

  runs.push(run);
}

/** The span one match found, or undefined when it captured neither kind. */
function spanFrom(match: RegExpExecArray): MarkedSpan | undefined {
  const groups: Record<string, string | undefined> =
    match.groups ?? {};
  const asterisks = groups["asterisks"];
  const underscores = groups["underscores"];

  if (asterisks !== undefined) {
    return {
      text: groups["asteriskText"] ?? "",
      marks: MARKS_BY_MARKER_LENGTH[asterisks.length] ?? [],
    };
  }

  if (underscores !== undefined) {
    return {
      text: groups["underscoreText"] ?? "",
      marks: MARKS_BY_MARKER_LENGTH[underscores.length] ?? [],
    };
  }

  return undefined;
}

/**
 * The syntax that carries no emphasis, resolved to the text it shows.
 *
 * Links and pictures are written by people whose notes live somewhere a link
 * means something. A card is printed, so there is nothing for one to do, and
 * leaving the brackets in would put punctuation on the card that the writer
 * never meant to be read.
 */
function withoutLinkSyntax(markup: string): string {
  return markup
    .replace(IMAGE, "")
    .replace(WIKI_LINK_ALIAS, "$1")
    .replace(WIKI_LINK, "$1")
    .replace(LINK, "$1")
    .replace(CODE_SPAN, "$1");
}

/** The runs `text` holds, empty only when `text` is. */
function markedRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let plainFrom = 0;

  for (const match of text.matchAll(MARKED_SPAN)) {
    appendRun(runs, text.slice(plainFrom, match.index));

    const span = spanFrom(match);

    if (span !== undefined) {
      appendRun(runs, span.text, span.marks);
    }

    plainFrom = match.index + match[0].length;
  }

  appendRun(runs, text.slice(plainFrom));

  return runs;
}

/**
 * Inline markup turned into the runs a card carries.
 *
 * This is the boundary the markup stops at, and the only one: the model stores
 * emphasis as structure, so nothing downstream has to know a marker exists.
 * Both the bundled extraction and a document a reader brings come through
 * here, which is what keeps the two reading the same text the same way.
 *
 * Nesting is not resolved. A strong span wrapping an emphasised one is read as
 * strong throughout, because a card sets the two apart by weight and the inner
 * mark would have nothing left to say.
 *
 * Refuses text with nothing left in it, because a field with nothing to say is
 * left off rather than carrying an empty run. Use {@link plainFromMarkup} to
 * check for that before building a field that might be empty.
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
 *
 * runsFromMarkup(""); // throws TypeError
 * ```
 */
export function runsFromMarkup(markup: string): TextRuns {
  const text = withoutLinkSyntax(markup);
  const runs = markedRuns(text);

  if (runs.length === 0) {
    return RichText.of(text);
  }

  return RichText.canonical(runs);
}

/**
 * The same text with every marker resolved away, for a caller that has to
 * decide something about the words before it builds a field out of them.
 *
 * @example
 * ```ts
 * plainFromMarkup("***At Higher Levels.***"); // "At Higher Levels."
 * plainFromMarkup("![a picture](art.png)"); // ""
 * ```
 */
export function plainFromMarkup(markup: string): string {
  return markedRuns(withoutLinkSyntax(markup))
    .map((run) => run.text)
    .join("");
}
