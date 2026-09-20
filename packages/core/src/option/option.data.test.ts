import { describe, expect, it } from "vitest";

import { optionsFrom } from "./option.data";

describe("optionsFrom", () => {
  it("keeps the order the record declares", () => {
    expect(
      optionsFrom({ none: "None", narrow: "Narrow", wide: "Wide" }),
    ).toEqual([
      { id: "none", name: "None" },
      { id: "narrow", name: "Narrow" },
      { id: "wide", name: "Wide" },
    ]);
  });

  it("offers nothing for a set with nothing in it", () => {
    expect(optionsFrom({})).toEqual([]);
  });

  it("carries a label through unchanged, however it is written", () => {
    expect(optionsFrom({ a4: "A4" })[0]?.name).toBe("A4");
  });

  // Each call builds its own list, so a caller that sorts or filters what it
  // is handed cannot reorder the set for everyone else.
  it("builds a fresh list each time", () => {
    const names = { a4: "A4", letter: "US Letter" };

    expect(optionsFrom(names)).not.toBe(optionsFrom(names));
    expect(optionsFrom(names)).toEqual(optionsFrom(names));
  });
});
