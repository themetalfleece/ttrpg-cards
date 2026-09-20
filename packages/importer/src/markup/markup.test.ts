import { describe, expect, it } from "vitest";

import { plainFromMarkup, runsFromMarkup } from "./markup";

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

  // The same emphasis is written four ways in the wild, and a parser that
  // took only one of them would be a single tool's importer.
  it("reads either marker character, in runs of one, two or three", () => {
    expect(runsFromMarkup("*one*")).toEqual([
      { text: "one", marks: ["emphasis"] },
    ]);
    expect(runsFromMarkup("_one_")).toEqual([
      { text: "one", marks: ["emphasis"] },
    ]);
    expect(runsFromMarkup("__one__")).toEqual([
      { text: "one", marks: ["strong"] },
    ]);
    expect(runsFromMarkup("***one***")).toEqual([
      { text: "one", marks: ["strong", "emphasis"] },
    ]);
    expect(runsFromMarkup("___one___")).toEqual([
      { text: "one", marks: ["strong", "emphasis"] },
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

  it("leaves an unclosed marker alone", () => {
    expect(runsFromMarkup("**never closed")).toEqual([
      { text: "**never closed" },
    ]);
  });

  // A card sets strong and emphasis apart by weight, so the inner mark of a
  // nested pair has nothing left to say.
  it("reads a nested pair as the outer mark throughout", () => {
    expect(runsFromMarkup("**a *b* c**")).toEqual([
      { text: "a *b* c", marks: ["strong"] },
    ]);
  });

  it("shows a link's text and drops where it pointed", () => {
    expect(
      runsFromMarkup("see [the ward](https://example.test)"),
    ).toEqual([{ text: "see the ward" }]);
  });

  it("shows a note link's own text, or its target when it has none", () => {
    expect(runsFromMarkup("[[ward-notes|the ward]] again")).toEqual([
      { text: "the ward again" },
    ]);
    expect(runsFromMarkup("[[the ward]] again")).toEqual([
      { text: "the ward again" },
    ]);
  });

  it("drops a picture, which a card has nowhere to put", () => {
    expect(runsFromMarkup("before ![art](art.png)after")).toEqual([
      { text: "before after" },
    ]);
  });

  it("sets a code span in the card's own type", () => {
    expect(runsFromMarkup("roll `1d6` twice")).toEqual([
      { text: "roll 1d6 twice" },
    ]);
  });

  it("refuses text with nothing left in it", () => {
    expect(() => runsFromMarkup("")).toThrow(TypeError);
    expect(() => runsFromMarkup("![art](art.png)")).toThrow(
      TypeError,
    );
  });
});

describe("plainFromMarkup", () => {
  it("resolves every marker away", () => {
    expect(plainFromMarkup("***At Higher Levels.***")).toBe(
      "At Higher Levels.",
    );
  });

  it("is empty when nothing is left to show", () => {
    expect(plainFromMarkup("")).toBe("");
    expect(plainFromMarkup("![art](art.png)")).toBe("");
  });

  it("keeps text a marker never claimed", () => {
    expect(plainFromMarkup("2 * 3 and snake_case")).toBe(
      "2 * 3 and snake_case",
    );
  });
});
