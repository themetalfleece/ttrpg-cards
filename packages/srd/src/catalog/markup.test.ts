import { describe, expect, it } from "vitest";

import { runsFromMarkup } from "./markup";

describe("runsFromMarkup", () => {
  it("reads unmarked text as a single run", () => {
    expect(runsFromMarkup("a plain line")).toEqual([
      { text: "a plain line" },
    ]);
  });

  it("reads a strong span", () => {
    expect(runsFromMarkup("**Loud.** Then quiet.")).toEqual([
      { text: "Loud.", marks: ["strong"] },
      { text: " Then quiet." },
    ]);
  });

  it("reads an emphasis span", () => {
    expect(runsFromMarkup("cast _lantern ward_ again")).toEqual([
      { text: "cast " },
      { text: "lantern ward", marks: ["emphasis"] },
      { text: " again" },
    ]);
  });

  it("reads both kinds in one line", () => {
    expect(
      runsFromMarkup("**Name.** _Failed Save:_ nothing"),
    ).toEqual([
      { text: "Name.", marks: ["strong"] },
      { text: " " },
      { text: "Failed Save:", marks: ["emphasis"] },
      { text: " nothing" },
    ]);
  });

  it("reads a line that is entirely marked", () => {
    expect(runsFromMarkup("**Otherworldly Steed**")).toEqual([
      { text: "Otherworldly Steed", marks: ["strong"] },
    ]);
  });

  it("leaves an underscore inside a word alone", () => {
    expect(runsFromMarkup("snake_case_name stays")).toEqual([
      { text: "snake_case_name stays" },
    ]);
  });

  it("leaves a lone marker alone", () => {
    expect(runsFromMarkup("2 * 3 and _ alone")).toEqual([
      { text: "2 * 3 and _ alone" },
    ]);
  });

  it("merges neighbouring spans that carry the same marks", () => {
    expect(runsFromMarkup("**one****two**")).toEqual([
      { text: "onetwo", marks: ["strong"] },
    ]);
  });

  it("keeps text that runs across a marked span", () => {
    expect(runsFromMarkup("a **b** c **d** e")).toEqual([
      { text: "a " },
      { text: "b", marks: ["strong"] },
      { text: " c " },
      { text: "d", marks: ["strong"] },
      { text: " e" },
    ]);
  });

  it("refuses an empty string", () => {
    expect(() => runsFromMarkup("")).toThrow(TypeError);
  });
});
