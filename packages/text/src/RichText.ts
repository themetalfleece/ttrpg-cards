import { TEXT_MARKS } from "./text.constants";
import type { TextMark, TextRun, TextRuns } from "./text.types";

/** The order marks are listed in, so one mark set has one spelling. */
const MARK_ORDER: TextMark[] = Object.values(TEXT_MARKS);

/** Why an empty span is refused, shared by the builders that can be handed one. */
const EMPTY_TEXT_MESSAGE =
  "Text cannot be empty. A field with nothing to say is left off.";

/**
 * The operations over a span of card text.
 *
 * Every field the reader sees is runs rather than a string, so this is the
 * one place that builds, normalises and flattens them. The card model, the
 * importer, the renderer and the fitting routine all go through here instead
 * of each walking the list their own way.
 *
 * @example
 * ```ts
 * const name = RichText.joined(
 *   RichText.marked(RichText.of("Lantern"), "strong"),
 *   RichText.of(" Ward"),
 * );
 * // [{ text: "Lantern", marks: ["strong"] }, { text: " Ward" }]
 *
 * RichText.plain(name); // "Lantern Ward"
 * ```
 */
export class RichText {
  /**
   * Unmarked text as a single run, which is most text on most cards.
   *
   * Refuses an empty string rather than building a run the schema rejects.
   * A field with nothing to say is left off, so the caller that might hold
   * nothing is the one that has to decide.
   *
   * @example
   * ```ts
   * RichText.of("Instantaneous"); // [{ text: "Instantaneous" }]
   * RichText.of(""); // throws TypeError
   * ```
   */
  static of(text: string): TextRuns {
    if (text.length === 0) {
      throw new TypeError(EMPTY_TEXT_MESSAGE);
    }

    return [{ text }];
  }

  /**
   * The same span with `mark` added to every run, for text that carries a
   * meaning its own characters do not, such as a table row's label.
   *
   * A run that already carries the mark is left as it is, so applying it twice
   * says the same thing as applying it once.
   *
   * @example
   * ```ts
   * RichText.marked(RichText.of("Guttering"), "strong");
   * // [{ text: "Guttering", marks: ["strong"] }]
   *
   * // Neighbours the mark has made alike are merged.
   * RichText.marked(
   *   [{ text: "one" }, { text: " two", marks: ["strong"] }],
   *   "strong",
   * );
   * // [{ text: "one two", marks: ["strong"] }]
   * ```
   */
  static marked(text: TextRuns, mark: TextMark): TextRuns {
    return RichText.canonical(
      text.map((run) => {
        const marks = new Set<TextMark>(run.marks);
        marks.add(mark);

        return { text: run.text, marks: [...marks] };
      }),
    );
  }

  /**
   * Spans laid end to end, in canonical form, for text assembled from pieces
   * that were marked separately.
   *
   * Refuses to build an empty span, for the same reason {@link RichText.of}
   * refuses an empty string.
   *
   * @example
   * ```ts
   * RichText.joined(
   *   [{ text: "1 reaction", marks: ["strong"] }],
   *   RichText.of(", which you take when a light source is snuffed"),
   * );
   * // [
   * //   { text: "1 reaction", marks: ["strong"] },
   * //   { text: ", which you take when a light source is snuffed" },
   * // ]
   *
   * RichText.joined(); // throws TypeError
   * ```
   */
  static joined(...spans: TextRuns[]): TextRuns {
    const runs = spans.flat();

    if (runs.length === 0) {
      throw new TypeError(EMPTY_TEXT_MESSAGE);
    }

    return RichText.canonical(runs);
  }

  /**
   * The one spelling of a span: neighbours carrying the same marks merged
   * into one run, and each run's marks in a fixed order.
   *
   * The schema cannot express this, because "adjacent runs differ" is not a
   * shape. Non-canonical runs are therefore valid rather than rejected, and
   * this is what turns them into the single form everything else compares.
   *
   * @example
   * ```ts
   * RichText.canonical([{ text: "one" }, { text: " two" }]);
   * // [{ text: "one two" }]
   *
   * // Marks come back in a fixed order, so one mark set has one spelling.
   * RichText.canonical([
   *   { text: "both", marks: ["emphasis", "strong"] },
   * ]);
   * // [{ text: "both", marks: ["strong", "emphasis"] }]
   * ```
   */
  static canonical(text: TextRuns): TextRuns {
    const runs: TextRun[] = [];

    for (const run of text) {
      const marks = RichText.#orderedMarks(run.marks);
      const previous = runs.at(-1);

      if (
        previous !== undefined &&
        RichText.#sameMarks(previous.marks, marks)
      ) {
        runs[runs.length - 1] = RichText.#run(
          `${previous.text}${run.text}`,
          marks,
        );
        continue;
      }

      runs.push(RichText.#run(run.text, marks));
    }

    return runs;
  }

  /**
   * A span cut in two at a character offset, both halves canonical.
   *
   * `at` counts plain characters, so a caller that found a boundary in
   * {@link RichText.plain} can hand back the offset it found. A run straddling
   * the cut is divided and both halves keep the marks it carried, which is
   * what makes splitting a card across a continuation safe: nothing is
   * re-parsed and no emphasis is lost at the seam.
   *
   * Refuses an offset at either end, because an empty half is not a span.
   *
   * @example
   * ```ts
   * RichText.split({
   *   text: [{ text: "Loud." }, { text: " Quiet.", marks: ["emphasis"] }],
   *   at: 5,
   * });
   * // [[{ text: "Loud." }], [{ text: " Quiet.", marks: ["emphasis"] }]]
   *
   * RichText.split({ text: RichText.of("one"), at: 0 }); // throws TypeError
   * ```
   */
  static split(options: {
    text: TextRuns;
    at: number;
  }): [TextRuns, TextRuns] {
    const { text, at } = options;
    const length = RichText.plain(text).length;

    if (!Number.isInteger(at) || at <= 0 || at >= length) {
      throw new TypeError(
        `A span can only be cut inside itself: ${at} is not between 1 and ${length - 1}.`,
      );
    }

    const before: TextRun[] = [];
    const after: TextRun[] = [];
    let consumed = 0;

    for (const run of text) {
      const start = consumed;
      consumed += run.text.length;

      if (consumed <= at) {
        before.push(run);
        continue;
      }

      if (start >= at) {
        after.push(run);
        continue;
      }

      const cut = at - start;
      const marks = RichText.#orderedMarks(run.marks);
      before.push(RichText.#run(run.text.slice(0, cut), marks));
      after.push(RichText.#run(run.text.slice(cut), marks));
    }

    return [RichText.canonical(before), RichText.canonical(after)];
  }

  /**
   * Runs joined back into plain characters, with the marks dropped, for
   * measuring and searching.
   *
   * @example
   * ```ts
   * RichText.plain([
   *   { text: "Loud.", marks: ["strong"] },
   *   { text: " Then quiet." },
   * ]);
   * // "Loud. Then quiet."
   * ```
   */
  static plain(text: TextRuns): string {
    return text.map((run) => run.text).join("");
  }

  /** A run's marks in that order, or absent when it carries none. */
  static #orderedMarks(
    marks: TextMark[] | undefined,
  ): TextMark[] | undefined {
    if (marks === undefined || marks.length === 0) {
      return undefined;
    }

    return MARK_ORDER.filter((mark) => marks.includes(mark));
  }

  /** True when two ordered mark lists are the same, so their runs can merge. */
  static #sameMarks(
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
  static #run(text: string, marks: TextMark[] | undefined): TextRun {
    const run: TextRun = { text };

    if (marks !== undefined) {
      run.marks = marks;
    }

    return run;
  }
}
