import type { PdfPage, TextRun } from "./pdf-text.ts";

/** Runs sharing a baseline within one text column, ordered left to right. */
export interface Line {
  readonly page: number;
  /** 0 = left column, 1 = right column. */
  readonly column: number;
  readonly y: number;
  /** Left edge of the first run. */
  readonly x: number;
  /** Right edge of the last run. */
  readonly right: number;
  /** Largest font size on the line. */
  readonly size: number;
  readonly runs: readonly TextRun[];
}

/** Anything drawn this close to the bottom edge is a running footer (document title, page number). */
const FOOTER_MAX_Y = 45;
/** Baselines closer than this belong to the same line (covers slightly raised glyphs such as "="). */
const BASELINE_TOLERANCE = 2;

/**
 * Splits a two-column page into lines in reading order: the left column top to bottom, then the
 * right column. The PDF content stream is not in reading order (floating stat blocks and column
 * continuations are drawn out of sequence), so ordering is purely geometric.
 */
export function pageLines(page: PdfPage): Line[] {
  const middle = page.width / 2;
  const columns: TextRun[][] = [[], []];
  for (const run of page.runs) {
    if (run.y < FOOTER_MAX_Y || run.text.trim() === "") continue;
    columns[run.x < middle ? 0 : 1]!.push(run);
  }
  const lines: Line[] = [];
  columns.forEach((runs, column) => {
    const sorted = runs.toSorted(
      (first, second) => second.y - first.y || first.x - second.x,
    );
    let current: TextRun[] = [];
    const flush = () => {
      if (current.length > 0)
        lines.push(makeLine(page.number, column, current));
      current = [];
    };
    for (const run of sorted) {
      if (
        current.length > 0 &&
        Math.abs(current[0]!.y - run.y) > BASELINE_TOLERANCE
      )
        flush();
      current.push(run);
    }
    flush();
  });
  return lines;
}

/**
 * The left edge of each text column: the most common starting x of lines in that column, which is
 * where unindented body lines begin.
 */
export function columnLeftEdges(
  lines: readonly Line[],
): [number, number] {
  const edges: [number, number] = [0, 0];
  for (const column of [0, 1] as const) {
    const counts = new Map<number, number>();
    for (const line of lines) {
      if (line.column !== column) continue;
      const key = Math.round(line.x * 2) / 2;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best = 0;
    let bestCount = -1;
    for (const [edge, count] of counts) {
      if (count > bestCount || (count === bestCount && edge < best))
        [best, bestCount] = [edge, count];
    }
    edges[column] = best;
  }
  return edges;
}

/** True when both lines are in the same column of the same page, so their spacing is meaningful. */
export function sameColumn(line: Line, other: Line): boolean {
  return line.page === other.page && line.column === other.column;
}

function makeLine(
  page: number,
  column: number,
  runs: TextRun[],
): Line {
  const ordered = runs.toSorted(
    (first, second) => first.x - second.x,
  );
  const first = ordered[0]!;
  return {
    page,
    column,
    y: Math.max(...ordered.map((run) => run.y)),
    x: first.x,
    right: Math.max(...ordered.map((run) => run.x + run.width)),
    size: Math.max(...ordered.map((run) => run.size)),
    runs: ordered,
  };
}
