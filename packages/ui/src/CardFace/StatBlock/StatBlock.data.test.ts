import { describe, expect, it } from "vitest";

import { MAXIMUM_STRIP_COLUMNS } from "../CardFace.constants";
import {
  opensRow,
  statBlockStyle,
  stripColumns,
} from "./StatBlock.data";

describe("stripColumns", () => {
  it("gives a card with fewer fields than the maximum one column each", () => {
    expect(stripColumns(1)).toBe(1);
    expect(stripColumns(2)).toBe(2);
    expect(stripColumns(3)).toBe(3);
  });

  it("fills the row at the maximum", () => {
    expect(stripColumns(MAXIMUM_STRIP_COLUMNS)).toBe(
      MAXIMUM_STRIP_COLUMNS,
    );
  });

  // Past the maximum the strip takes a second row rather than cells too thin
  // for a value to be read in.
  it("stops widening past the maximum", () => {
    expect(stripColumns(MAXIMUM_STRIP_COLUMNS + 1)).toBe(
      MAXIMUM_STRIP_COLUMNS,
    );
    expect(stripColumns(40)).toBe(MAXIMUM_STRIP_COLUMNS);
  });

  // A grid needs a track even when the card carries nothing to put in one.
  it("keeps a track for a card with no fields at all", () => {
    expect(stripColumns(0)).toBe(1);
    expect(stripColumns(-3)).toBe(1);
  });
});

describe("opensRow", () => {
  it("names the first cell of every row", () => {
    const columns = 4;
    const opening = [0, 1, 2, 3, 4, 5, 6, 7].filter((index) =>
      opensRow({ index, columns }),
    );

    expect(opening).toEqual([0, 4]);
  });

  it("names every cell when the strip is one across", () => {
    expect(opensRow({ index: 0, columns: 1 })).toBe(true);
    expect(opensRow({ index: 5, columns: 1 })).toBe(true);
  });
});

describe("statBlockStyle", () => {
  it("hands the grid the count it lays the cells out from", () => {
    expect(statBlockStyle({ columns: 4 })).toEqual({
      "--card-stat-columns": "4",
    });
  });
});
