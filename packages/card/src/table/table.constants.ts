/**
 * Above this many columns a row no longer reads as "key: value", so each cell
 * is written out under its own heading instead.
 *
 * Two columns are a pair, and the line above the rows already names both, so a
 * row that repeats them says everything twice. A third column has nowhere to
 * be named except beside its own cell.
 */
export const LABELLED_COLUMN_THRESHOLD = 2;

/** What the column headings are joined with when they stand in for a caption. */
export const HEADING_SEPARATOR = " / ";

/** What a row's cells are joined with, after the one that leads it. */
export const CELL_SEPARATOR = ", ";

/** What separates the cell leading a row from the rest of it. */
export const LEAD_SEPARATOR = ": ";

/** What sits between a heading and the cell it is naming. */
export const HEADING_GAP = " ";
