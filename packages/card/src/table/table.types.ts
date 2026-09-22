import type { TextRuns } from "@ttrpg-cards/text";

/**
 * One cell, or nothing where the source printed an empty one.
 *
 * Text is never empty in this model, so an empty cell cannot be runs. It is
 * still a cell: a row's cells line up with the columns above them, and one
 * dropped would move every cell after it under the wrong heading.
 */
export type TableCell = TextRuns | undefined;

/**
 * A table as a source printed it, with every span already read as text.
 *
 * Runs rather than markup, because this package is downstream of every
 * parser: whoever read the table knows what its markup meant, and the card
 * model only deals in what the text says.
 */
export interface CardTable {
  /** What the table is read under, where the source printed one. */
  readonly caption?: TextRuns | undefined;
  /** The column headings, in order. A column may be headed by nothing. */
  readonly header: readonly TableCell[];
  /** The rows under them, each as many cells as it was written with. */
  readonly rows: readonly (readonly TableCell[])[];
}
