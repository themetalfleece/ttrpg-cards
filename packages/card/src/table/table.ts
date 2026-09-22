import {
  RichText,
  TEXT_MARKS,
  type TextRuns,
} from "@ttrpg-cards/text";

import { CARD_BLOCK_KINDS, type CardBlock } from "../card";
import {
  CELL_SEPARATOR,
  HEADING_GAP,
  HEADING_SEPARATOR,
  LABELLED_COLUMN_THRESHOLD,
  LEAD_SEPARATOR,
} from "./table.constants";
import type { CardTable, TableCell } from "./table.types";

/**
 * A table as the blocks a card can hold: a line to read it under, then one
 * list item per row.
 *
 * The card model has no table, and that is the right shape for a card this
 * small: a grid sized for a page column does not survive being set at card
 * width. Each row is written out instead, led by its first cell.
 *
 * One rule for every source. A table a reader wrote in their own document and
 * a table lifted out of a bundled release are the same thing once they have
 * been read, so they are set the same way rather than each source inventing
 * its own arrangement.
 *
 * @example
 * ```ts
 * tableBlocks({
 *   header: [RichText.of("Roll"), RichText.of("Effect")],
 *   rows: [[RichText.of("1"), RichText.of("The light fails")]],
 * });
 * // [{ kind: "paragraph", text: [{ text: "Roll / Effect", marks: ["strong"] }] },
 * //  { kind: "list", items: [[{ text: "1", marks: ["strong"] }, { text: ": The light fails" }]] }]
 * ```
 */
export function tableBlocks(table: CardTable): CardBlock[] {
  const blocks: CardBlock[] = [];
  const heading = tableHeading(table);

  if (heading !== undefined) {
    blocks.push({
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.marked(heading, TEXT_MARKS.strong),
    });
  }

  const rows = table.rows.filter((row) => row.some(saysSomething));

  if (rows.length > 0) {
    blocks.push({
      kind: CARD_BLOCK_KINDS.list,
      items: rows.map((row) => rowRuns(row, table)),
    });
  }

  return blocks;
}

/**
 * The line a table is read under: its caption where it printed one, otherwise
 * its column headings.
 *
 * Most printed tables carry no caption, and for those the first column's
 * heading is the only thing that says what the first cell means. It has to be
 * written out, because the header row does not survive onto the card and
 * nothing downstream can recover it. Past two columns only that first heading
 * is still unsaid, since {@link rowRuns} writes the rest beside their cells.
 */
function tableHeading(table: CardTable): TextRuns | undefined {
  if (saysSomething(table.caption)) {
    return table.caption;
  }

  const unsaid =
    table.header.length > LABELLED_COLUMN_THRESHOLD
      ? table.header.slice(0, 1)
      : table.header;
  const headings = unsaid.filter(saysSomething);

  if (headings.length === 0) {
    return undefined;
  }

  return joined(headings, HEADING_SEPARATOR);
}

/**
 * One row as a line of text: the first cell in strong, then the rest.
 *
 * A two column table reads as "key: value", and the heading line above
 * already names both columns, so a row does not repeat them. A wider one does
 * not read that way, so each cell is written out under its own heading.
 */
function rowRuns(
  row: readonly TableCell[],
  table: CardTable,
): TextRuns {
  const [lead, ...rest] = row;
  const spans: TextRuns[] = [];

  if (lead !== undefined && saysSomething(lead)) {
    spans.push(RichText.marked(lead, TEXT_MARKS.strong));
  }

  const labelled = table.header.length > LABELLED_COLUMN_THRESHOLD;
  const values = rest
    .map((cell, index) =>
      labelledCell(cell, table.header[index + 1], labelled),
    )
    .filter((cell) => cell !== undefined);

  if (values.length > 0) {
    const text = joined(values, CELL_SEPARATOR);

    spans.push(
      spans.length > 0
        ? RichText.joined(RichText.of(LEAD_SEPARATOR), text)
        : text,
    );
  }

  return RichText.joined(...spans);
}

/** One cell, named by its column where a row is too wide to read in pairs. */
function labelledCell(
  cell: TableCell,
  heading: TableCell,
  labelled: boolean,
): TextRuns | undefined {
  if (cell === undefined || !saysSomething(cell)) {
    return undefined;
  }

  if (!labelled || heading === undefined || !saysSomething(heading)) {
    return cell;
  }

  return RichText.joined(heading, RichText.of(HEADING_GAP), cell);
}

/** Spans run together with `separator` between them. */
function joined(
  spans: readonly TextRuns[],
  separator: string,
): TextRuns {
  const between = RichText.of(separator);

  return RichText.joined(
    ...spans.flatMap((span, index) =>
      index === 0 ? [span] : [between, span],
    ),
  );
}

/** True when a cell carries anything a reader would see. */
function saysSomething(cell: TableCell): cell is TextRuns {
  return cell !== undefined && RichText.plain(cell).trim() !== "";
}
