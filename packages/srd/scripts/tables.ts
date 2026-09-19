import type { EntryBlock } from "../src/catalog/catalog.types.ts";
import type { Dehyphenator } from "./Dehyphenator.ts";
import type { RoledLine } from "./entries.ts";
import { InlineTextBuilder } from "./InlineTextBuilder.ts";
import type { TextRun } from "./pdf-text.ts";
import { lineText } from "./text.ts";

type TableBlock = Extract<EntryBlock, { type: "table" }>;

export interface TableContext {
  readonly columnLeft: readonly [number, number];
  readonly dehyphenator: Dehyphenator;
  readonly anomalies: string[];
  readonly entryName: string;
}

/** Horizontally separated text within one line (a table cell or header label). */
interface Fragment {
  readonly runs: readonly TextRun[];
  /** Left and right edges relative to the text column's left edge. */
  readonly left: number;
  readonly right: number;
}

interface TableColumn {
  readonly label: string;
  readonly left: number;
  readonly right: number;
}

interface TableDraft {
  readonly captions: readonly Fragment[];
  readonly columns: readonly TableColumn[];
  readonly rows: InlineTextBuilder[][];
}

/**
 * Columns of the same table are far apart; words within a cell are separated by roughly a quarter
 * of the font size.
 */
const FRAGMENT_GAP_EM = 0.5;

function fragmentsOf(
  line: RoledLine,
  columnLeft: readonly [number, number],
): Fragment[] {
  const origin = columnLeft[line.column]!;
  const fragments: {
    runs: TextRun[];
    left: number;
    right: number;
  }[] = [];
  for (const run of line.runs) {
    const last = fragments.at(-1);
    const left = run.x - origin;
    const right = left + run.width;
    if (
      last !== undefined &&
      left - last.right < run.size * FRAGMENT_GAP_EM
    ) {
      last.runs.push(run);
      last.right = Math.max(last.right, right);
    } else {
      fragments.push({ runs: [run], left, right });
    }
  }
  return fragments;
}

function buildColumns(
  headerLines: readonly RoledLine[],
  context: TableContext,
): TableColumn[] {
  // The lowest header line names every column; lines above it (e.g. "Similar" over "Area") are
  // stacked labels belonging to whichever column they are centred over.
  const base = fragmentsOf(headerLines.at(-1)!, context.columnLeft);
  const labels = base.map((fragment) => [lineText(fragment.runs)]);
  const extents = base.map((fragment) => ({
    left: fragment.left,
    right: fragment.right,
  }));
  for (const upper of headerLines.slice(0, -1).toReversed()) {
    for (const fragment of fragmentsOf(upper, context.columnLeft)) {
      const centre = (fragment.left + fragment.right) / 2;
      let best = 0;
      base.forEach((candidate, index) => {
        const distance = Math.abs(
          (candidate.left + candidate.right) / 2 - centre,
        );
        const bestDistance = Math.abs(
          (base[best]!.left + base[best]!.right) / 2 - centre,
        );
        if (distance < bestDistance) best = index;
      });
      labels[best]!.unshift(lineText(fragment.runs));
      extents[best] = {
        left: Math.min(extents[best]!.left, fragment.left),
        right: Math.max(extents[best]!.right, fragment.right),
      };
    }
  }
  return extents.map((extent, index) => ({
    label: labels[index]!.join(" "),
    ...extent,
  }));
}

function columnIndexOf(
  columns: readonly TableColumn[],
  left: number,
): number {
  let found = 0;
  for (let index = 1; index < columns.length; index++) {
    // Cells may be centred under their label, so split the gutter between two labels evenly.
    const boundary =
      (columns[index - 1]!.right + columns[index]!.left) / 2;
    if (left >= boundary) found = index;
  }
  return found;
}

function sameLabels(
  columns: readonly TableColumn[],
  other: readonly TableColumn[],
): boolean {
  return (
    columns.length === other.length &&
    columns.every(
      (column, index) => column.label === other[index]!.label,
    )
  );
}

/**
 * Parses consecutive table lines (captions, header rows and body rows, possibly continuing into
 * the next column with or without a repeated header) into table blocks.
 */
export function buildTables(
  lines: readonly RoledLine[],
  context: TableContext,
): EntryBlock[] {
  const drafts: TableDraft[] = [];
  let captions: Fragment[] = [];
  let current: TableDraft | undefined;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (line.role === "table-caption") {
      captions.push(...fragmentsOf(line, context.columnLeft));
      current = undefined;
      continue;
    }
    if (line.role === "table-header") {
      const headerLines = [line];
      while (
        lines[index + 1]?.role === "table-header" &&
        lines[index + 1]!.column === line.column
      ) {
        headerLines.push(lines[++index]!);
      }
      const columns = buildColumns(headerLines, context);
      const repeatsHeader =
        current !== undefined &&
        captions.length === 0 &&
        sameLabels(current.columns, columns);
      if (!repeatsHeader) {
        current = { captions, columns, rows: [] };
        drafts.push(current);
        captions = [];
      }
      continue;
    }
    if (current === undefined) {
      context.anomalies.push(
        `${context.entryName}: table row without a header: "${line.text}"`,
      );
      continue;
    }
    const cells = new Map<number, TextRun[]>();
    for (const fragment of fragmentsOf(line, context.columnLeft)) {
      for (const run of fragment.runs) {
        const column = columnIndexOf(
          current.columns,
          run.x - context.columnLeft[line.column]!,
        );
        const columnRuns = cells.get(column);

        if (columnRuns === undefined) {
          cells.set(column, [run]);
        } else {
          columnRuns.push(run);
        }
      }
    }
    // Wrapped cell text continues on lines that fill only one column.
    const startsRow = current.rows.length === 0 || cells.size >= 2;
    if (startsRow) {
      current.rows.push(
        current.columns.map(
          () => new InlineTextBuilder(context.dehyphenator),
        ),
      );
    }
    const row = current.rows.at(-1)!;
    for (const [column, runs] of cells) row[column]!.appendRuns(runs);
  }

  if (captions.length > 0) {
    context.anomalies.push(
      `${context.entryName}: table caption without a table`,
    );
  }
  return drafts.flatMap((draft) => finishDraft(draft, context));
}

/** Two copies of the same label sequence side by side, e.g. "Stage Condition Stage Condition". */
function sideBySideHalves(
  columns: readonly TableColumn[],
): number | undefined {
  if (columns.length < 2 || columns.length % 2 !== 0)
    return undefined;
  const half = columns.length / 2;
  const same = columns
    .slice(0, half)
    .every(
      (column, index) =>
        column.label === columns[half + index]!.label,
    );
  return same ? half : undefined;
}

function finishDraft(
  draft: TableDraft,
  context: TableContext,
): TableBlock[] {
  const cellRows = draft.rows.map((row) =>
    row.map((cell) => cell.toMarkup()),
  );
  const labels = draft.columns.map((column) => column.label);
  const half = sideBySideHalves(draft.columns);
  const captionTexts = draft.captions.map((caption) =>
    lineText(caption.runs),
  );
  const nonEmpty = (rows: string[][]) =>
    rows.filter((row) => row.some((cell) => cell !== ""));

  if (half === undefined) {
    if (captionTexts.length > 1) {
      context.anomalies.push(
        `${context.entryName}: several captions for one table: ${captionTexts.join(" | ")}`,
      );
    }
    return [
      table(captionTexts.join(" "), labels, nonEmpty(cellRows)),
    ];
  }
  const left = nonEmpty(cellRows.map((row) => row.slice(0, half)));
  const right = nonEmpty(cellRows.map((row) => row.slice(half)));
  const header = labels.slice(0, half);
  if (captionTexts.length === 2) {
    return [
      table(captionTexts[0]!, header, left),
      table(captionTexts[1]!, header, right),
    ];
  }
  // One logical table printed in two halves to save space (e.g. a d10 table split 1-5 / 6-10).
  return [table(captionTexts.join(" "), header, [...left, ...right])];
}

function table(
  caption: string,
  header: string[],
  rows: string[][],
): TableBlock {
  return caption === ""
    ? { type: "table", header, rows }
    : { type: "table", caption, header, rows };
}
