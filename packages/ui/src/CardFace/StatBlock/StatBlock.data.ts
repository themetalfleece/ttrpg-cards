import { MAXIMUM_STRIP_COLUMNS } from "../CardFace.constants";

import type { StatBlockStyle } from "./StatBlock.types";

/**
 * How many cells the strip sets across.
 *
 * A card carrying fewer fields than the maximum gets one column each and fills
 * the row. One carrying more takes a second row rather than cells too thin to
 * read a value in.
 *
 * @example
 * ```ts
 * stripColumns(4); // 4
 * stripColumns(7); // 4
 * stripColumns(2); // 2
 * stripColumns(0); // 1, since a grid needs a track even with nothing in it
 * ```
 */
export function stripColumns(fieldCount: number): number {
  return Math.min(Math.max(fieldCount, 1), MAXIMUM_STRIP_COLUMNS);
}

/**
 * Whether the cell at `index` opens a row, which is where the rule between
 * cells comes off: a rule there would be drawn against the edge of the card
 * rather than between two values.
 *
 * @example
 * ```ts
 * opensRow({ index: 0, columns: 4 }); // true
 * opensRow({ index: 3, columns: 4 }); // false
 * opensRow({ index: 4, columns: 4 }); // true
 * ```
 */
export function opensRow(options: {
  index: number;
  columns: number;
}): boolean {
  return options.index % options.columns === 0;
}

/**
 * How wide the strip is set, as the custom property its stylesheet reads. The
 * cells are equal, so the count is all the grid needs.
 *
 * @example
 * ```ts
 * statBlockStyle({ columns: 4 })["--card-stat-columns"]; // "4"
 * ```
 */
export function statBlockStyle(options: {
  columns: number;
}): StatBlockStyle {
  return { "--card-stat-columns": String(options.columns) };
}
