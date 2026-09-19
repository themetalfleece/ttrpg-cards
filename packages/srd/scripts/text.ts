import type { Line } from "./layout.ts";
import type { TextRun } from "./pdf-text.ts";

export type InlineStyle = "plain" | "bold" | "italic";

/** A piece of inline text with a single style. */
export interface Segment {
  readonly text: string;
  readonly style: InlineStyle;
}

/**
 * The 5.1 PDF encodes every hyphen as a run of "-", soft hyphen (U+00AD), hyphen (U+2010) and
 * non-breaking hyphen (U+2011); collapse any such run to one ASCII hyphen.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/[-\u00ad\u2010\u2011]{2,}/g, "-")
    .replace(/\u00ad/g, "")
    .replace(/[\u2010\u2011]/g, "-")
    .replace(/[\u00a0\s]+/g, " ");
}

export function collapseSpaces(text: string): string {
  return text.replace(/ {2,}/g, " ").trim();
}

export function styleOfFont(font: string): InlineStyle {
  if (/Bold|SemiBold|Black|Heavy/i.test(font)) return "bold";
  if (/Italic|Oblique/i.test(font)) return "italic";
  return "plain";
}

export function isBoldFont(font: string): boolean {
  return styleOfFont(font) === "bold";
}

/**
 * Whitespace-only runs are dropped during layout, so word boundaries between runs are recovered
 * from the horizontal gap. A quarter of the font size is well below a word space in these fonts
 * but above the sub-point gaps between kerned fragments of one word.
 */
function needsSpaceBetween(
  previous: TextRun,
  next: TextRun,
): boolean {
  const gap = next.x - (previous.x + previous.width);
  return gap > Math.min(previous.size, next.size) * 0.15;
}

/** Styled segments of the given runs (all assumed to be on one baseline), in reading order. */
export function runsToSegments(runs: readonly TextRun[]): Segment[] {
  const segments: Segment[] = [];
  let previous: TextRun | undefined;
  for (const run of runs) {
    if (previous !== undefined && needsSpaceBetween(previous, run)) {
      segments.push({ text: " ", style: "plain" });
    }
    segments.push({
      text: normalizeText(run.text),
      style: styleOfFont(run.font),
    });
    previous = run;
  }
  return segments;
}

export function segmentsText(segments: readonly Segment[]): string {
  return segments.map((segment) => segment.text).join("");
}

/** Plain text of a line with normalized hyphens and whitespace. */
export function lineText(line: Line | readonly TextRun[]): string {
  const runs = "runs" in line ? line.runs : line;
  return collapseSpaces(segmentsText(runsToSegments(runs)));
}

const PUNCTUATION_ONLY =
  /^[\s.,;:!?()[\]\u2019'"\u201c\u201d\u2026\u2014\u2013-]*$/;

/**
 * Renders segments as `**bold**` / `_italic_` markup: adjacent runs of one style are merged
 * (including the spaces between them), whitespace and trailing commas stay outside the markers,
 * and styling on stray punctuation is dropped so no marker pair is empty or dangling.
 */
export function renderMarkup(segments: readonly Segment[]): string {
  const nonEmpty = segments
    .map((segment) => ({
      text: segment.text.replace(/\s+/g, " "),
      style: segment.style,
    }))
    .filter((segment) => segment.text !== "");
  // Styled punctuation is kept only when it is glued to text of the same style ("Effects" + ":").
  const cleaned = nonEmpty.map((segment, index) => {
    if (
      segment.style === "plain" ||
      !PUNCTUATION_ONLY.test(segment.text) ||
      /\s/.test(segment.text)
    )
      return segment;
    const glued = [nonEmpty[index - 1], nonEmpty[index + 1]].some(
      (neighbour) =>
        neighbour !== undefined &&
        neighbour.style === segment.style &&
        !PUNCTUATION_ONLY.test(neighbour.text),
    );
    return glued ? segment : { ...segment, style: "plain" as const };
  });

  // Punctuation-only and whitespace-only pieces take the style of their neighbours when both
  // neighbours share it, so "_dispel_" + " " + "_magic_" becomes one italic span.
  const resolved = cleaned.map((segment, index) => {
    if (
      segment.style !== "plain" ||
      !PUNCTUATION_ONLY.test(segment.text)
    )
      return segment;
    const before = cleaned
      .slice(0, index)
      .findLast(
        (candidate) => !PUNCTUATION_ONLY.test(candidate.text),
      );
    const after = cleaned
      .slice(index + 1)
      .find((candidate) => !PUNCTUATION_ONLY.test(candidate.text));
    if (
      /^\s+$/.test(segment.text) &&
      before &&
      after &&
      before.style === after.style
    ) {
      return { ...segment, style: before.style };
    }
    return segment;
  });

  const merged: Segment[] = [];
  for (const segment of resolved) {
    const last = merged.at(-1);
    if (last !== undefined && last.style === segment.style) {
      merged[merged.length - 1] = {
        style: last.style,
        text: last.text + segment.text,
      };
    } else {
      merged.push(segment);
    }
  }

  let markup = "";
  for (const { text, style } of merged) {
    if (style === "plain") {
      markup += text;
      continue;
    }
    // Run-in headings keep their period inside bold ("**Aquatic Adaptation.**"), but an entry name
    // that happens to end a sentence reads better as "_wish_.".
    const outside =
      style === "italic"
        ? /^(\s*)(.*?)([.,;]*\s*)$/s
        : /^(\s*)(.*?)([,;]*\s*)$/s;
    const [, lead = "", core = "", trail = ""] = outside.exec(text)!;
    const marker = style === "bold" ? "**" : "_";
    markup +=
      core === "" ? text : `${lead}${marker}${core}${marker}${trail}`;
  }
  return collapseSpaces(markup);
}

/** An entry name reduced to a stable key, used to match it against the printed lists. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
