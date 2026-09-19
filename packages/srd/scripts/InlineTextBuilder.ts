import type { Dehyphenator } from "./Dehyphenator.ts";
import type { TextRun } from "./pdf-text.ts";
import {
  collapseSpaces,
  renderMarkup,
  runsToSegments,
  segmentsText,
  type Segment,
} from "./text.ts";

/** A break the typesetter made mid-word, which is joined without a space. */
const EM_DASH_BREAK = /[\u2014/]$/;

const LEADING_EM_DASH = /^\u2014/;

/**
 * Accumulates styled text across line breaks, handling hyphenated breaks and em-dash breaks.
 *
 * A paragraph in the source is drawn one line at a time, so the text has to be rebuilt by
 * appending. Where the lines join is the whole problem: a trailing hyphen may or may not be a
 * word break, and an em dash or a slash never takes a space around it.
 */
export class InlineTextBuilder {
  #segments: Segment[] = [];

  readonly #dehyphenator: Dehyphenator;

  constructor(dehyphenator: Dehyphenator) {
    this.#dehyphenator = dehyphenator;
  }

  get isEmpty(): boolean {
    return segmentsText(this.#segments).trim() === "";
  }

  appendSegments(next: readonly Segment[]): void {
    const nextText = segmentsText(next).trimStart();
    if (nextText === "") return;
    const currentText = segmentsText(this.#segments).trimEnd();
    if (currentText !== "") {
      if (/-$/.test(currentText)) {
        if (this.#dehyphenator.shouldJoin(currentText, nextText))
          this.#dropTrailingHyphen();
      } else if (
        !EM_DASH_BREAK.test(currentText) &&
        !LEADING_EM_DASH.test(nextText)
      ) {
        this.#segments.push({ text: " ", style: "plain" });
      }
    }
    this.#segments.push(...next);
  }

  appendRuns(runs: readonly TextRun[]): void {
    this.appendSegments(runsToSegments(runs));
  }

  toMarkup(): string {
    return renderMarkup(this.#segments);
  }

  toPlainText(): string {
    return collapseSpaces(segmentsText(this.#segments));
  }

  /** Drops the hyphen that ended the last line, and any whitespace after it. */
  #dropTrailingHyphen(): void {
    for (let index = this.#segments.length - 1; index >= 0; index--) {
      const segment = this.#segments[index]!;
      const trimmed = segment.text.trimEnd();
      if (trimmed === "") {
        this.#segments.splice(index, 1);
        continue;
      }
      this.#segments[index] = {
        ...segment,
        text: trimmed.slice(0, -1),
      };
      return;
    }
  }
}
