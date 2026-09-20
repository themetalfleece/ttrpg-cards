/** One line of a document, with the 1-based number it was read from. */
export interface SourceLine {
  /** What the reader would count to find it. */
  readonly number: number;
  /** The line itself, unaltered. */
  readonly text: string;
}

/**
 * A stretch of a document that did not become a card.
 *
 * Reported rather than dropped, and reported with a line number, because a
 * reader who pasted forty cards and got thirty-nine has no other way to find
 * the one that went missing.
 */
export interface ImportIssue {
  /** The 1-based line the stretch starts at. */
  readonly line: number;
  /** What was wrong with it, in the reader's own terms. */
  readonly message: string;
}

/** How the lines of a section group before anything is decided about them. */
export type MarkdownBlockKind = "quote" | "bullets" | "paragraph";

/** A run of lines separated from its neighbours by a blank line or a rule. */
export interface MarkdownBlock {
  /** Which of the three shapes the run was written in. */
  readonly kind: MarkdownBlockKind;
  /** The lines themselves, with their markers still on them. */
  readonly lines: readonly SourceLine[];
}
