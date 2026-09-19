import { TEXT_MARKS } from "./text.constants";
import type { TextMark, TextRun, TextRuns } from "./text.types";

/** The order marks are listed in, so one mark set has one spelling. */
const MARK_ORDER: TextMark[] = Object.values(TEXT_MARKS);

/** A run's marks in that order, or absent when it carries none. */
function orderedMarks(
  marks: TextMark[] | undefined,
): TextMark[] | undefined {
  if (marks === undefined || marks.length === 0) {
    return undefined;
  }

  return MARK_ORDER.filter((mark) => marks.includes(mark));
}

/** True when two ordered mark lists are the same, so their runs can merge. */
function sameMarks(
  left: TextMark[] | undefined,
  right: TextMark[] | undefined,
): boolean {
  if (left === undefined || right === undefined) {
    return left === undefined && right === undefined;
  }

  return (
    left.length === right.length &&
    left.every((mark, index) => mark === right[index])
  );
}

/** A run carrying `text`, with `marks` left off when there are none. */
function buildRun(
  text: string,
  marks: TextMark[] | undefined,
): TextRun {
  const run: TextRun = { text };

  if (marks !== undefined) {
    run.marks = marks;
  }

  return run;
}

/**
 * The operations over a span of card text.
 *
 * Every field the reader sees is runs rather than a string, so this is the
 * one place that builds, normalises and flattens them. The card model, the
 * importer, the renderer and the fitting routine all go through here instead
 * of each walking the list their own way.
 */
export class RichText {
  /**
   * Unmarked text as a single run, which is most text on most cards.
   *
   * Refuses an empty string rather than building a run the schema rejects.
   * A field with nothing to say is left off, so the caller that might hold
   * nothing is the one that has to decide.
   */
  static of(text: string): TextRuns {
    if (text.length === 0) {
      throw new TypeError(
        "Text cannot be empty. A field with nothing to say is left off.",
      );
    }

    return [{ text }];
  }

  /**
   * The one spelling of a span: neighbours carrying the same marks merged
   * into one run, and each run's marks in a fixed order.
   *
   * The schema cannot express this, because "adjacent runs differ" is not a
   * shape. Non-canonical runs are therefore valid rather than rejected, and
   * this is what turns them into the single form everything else compares.
   */
  static canonical(text: TextRuns): TextRuns {
    const runs: TextRun[] = [];

    for (const run of text) {
      const marks = orderedMarks(run.marks);
      const previous = runs.at(-1);

      if (
        previous !== undefined &&
        sameMarks(previous.marks, marks)
      ) {
        runs[runs.length - 1] = buildRun(
          `${previous.text}${run.text}`,
          marks,
        );
        continue;
      }

      runs.push(buildRun(run.text, marks));
    }

    return runs;
  }

  /** Runs joined back into plain characters, with the marks dropped. */
  static plain(text: TextRuns): string {
    return text.map((run) => run.text).join("");
  }
}
