import { CardLayout, type Card } from "@ttrpg-cards/card";
import {
  CUSTOM_PAGE_SIZE,
  SheetLayout,
  type SheetSlot,
} from "@ttrpg-cards/printer";
import { describe, expect, it } from "vitest";

import { cardPageStyle, pageCells, pageRule } from "./CardPage.data";

/** The size the properties below are worked out against. */
const layout = CardLayout.default();

/** A card carrying nothing but the name it is recognised by. */
function entry(id: string): Card {
  return { id, name: [{ text: id }], meta: [], body: [] };
}

/** One entry's cards at a stated slot. */
function slot(options: {
  id: string;
  index: number;
  from?: number;
  count?: number;
}): SheetSlot<Card> {
  return {
    item: entry(options.id),
    from: options.from ?? 0,
    count: options.count ?? 1,
    index: options.index,
  };
}

describe("cardPageStyle", () => {
  it("states every length in millimetres, so screen and paper agree", () => {
    const style = cardPageStyle({
      sheet: SheetLayout.default(),
      layout,
    });

    for (const value of Object.values(style)) {
      expect(value).toMatch(/^[\d.]+mm$/);
    }
  });

  it("is the sheet it is given", () => {
    const sheet = SheetLayout.default().with({ size: "letter" });
    const style = cardPageStyle({ sheet, layout });

    expect(style["--page-width"]).toBe(`${sheet.widthMillimetres}mm`);
    expect(style["--page-height"]).toBe(
      `${sheet.heightMillimetres}mm`,
    );
    expect(style["--page-margin"]).toBe(
      `${sheet.marginMillimetres}mm`,
    );
  });

  // The reach is how the sheet says whether it carries guides at all: the
  // stylesheet lays the marks out at whatever it is given, and nothing is
  // what draws nothing, so there is no second rule and no branch here.
  //
  // Both settings are named rather than one taken from the default. Left to
  // the default, the two sides of this would both be nothing the day it
  // moved, and the test would keep passing while covering half of what it
  // says it covers.
  it("reaches the guides out by what the sheet says, or not at all", () => {
    const guided = SheetLayout.default().with({ cutGuides: "on" });
    const plain = SheetLayout.default().with({ cutGuides: "off" });

    expect(
      cardPageStyle({ sheet: guided, layout })["--page-guide-reach"],
    ).toBe(`${guided.cutGuideReachMillimetres}mm`);
    expect(guided.cutGuideReachMillimetres).toBeGreaterThan(0);
    expect(
      cardPageStyle({ sheet: plain, layout })["--page-guide-reach"],
    ).toBe("0mm");
  });

  // The margin belongs to the paper, so picking a paper moves it too.
  it("carries the margin the paper brings with it", () => {
    const a4 = cardPageStyle({
      sheet: SheetLayout.default(),
      layout,
    });
    const letter = cardPageStyle({
      sheet: SheetLayout.default().with({ size: "letter" }),
      layout,
    });

    expect(letter["--page-margin"]).not.toBe(a4["--page-margin"]);
  });

  it("follows the sheet round when it turns", () => {
    const portrait = cardPageStyle({
      sheet: SheetLayout.default(),
      layout,
    });
    const landscape = cardPageStyle({
      sheet: SheetLayout.default().with({
        orientation: "landscape",
      }),
      layout,
    });

    expect(landscape["--page-width"]).toBe(portrait["--page-height"]);
    expect(landscape["--page-height"]).toBe(portrait["--page-width"]);
  });
});

describe("pageRule", () => {
  /**
   * Every sheet the rule is checked against.
   *
   * The reader's own paper is one of them, and it is the reason the shape of
   * the rule is asserted at all: it is the only size here that did not come
   * out of a record, so it is the only one that could reach a stylesheet as
   * something other than a measurement.
   */
  const sheets: readonly SheetLayout[] = [
    SheetLayout.default(),
    SheetLayout.default().with({
      size: "letter",
      orientation: "landscape",
    }),
    SheetLayout.default().with({
      size: CUSTOM_PAGE_SIZE,
      custom: { widthMillimetres: 148, heightMillimetres: 200 },
    }),
  ];

  // Read off the sheet rather than written out. A paper measurement is
  // written down once, in the print package, and the harness behind
  // `pnpm verify:print` is what restates the numbers and checks a browser
  // really printed on them. What is this test's to prove is that the rule
  // carries whatever the preview was drawn at.
  it("prints on the paper the preview is drawn at", () => {
    for (const sheet of sheets) {
      expect(pageRule({ sheet })).toBe(
        `@page { size: ${sheet.widthMillimetres}mm ${sheet.heightMillimetres}mm; margin: 0; }`,
      );
    }
  });

  // The sheet draws its own blank inside the paper's edges, because nothing
  // in the page box can be drawn in a `@page` margin and the cut guides at
  // the outside of the grid reach into exactly that blank.
  it("hands the whole paper to the sheet", () => {
    expect(pageRule({ sheet: SheetLayout.default() })).toContain(
      "margin: 0",
    );
  });

  // The rule is built into a stylesheet, so what goes into it matters: a
  // paper the reader typed reaches a browser as text, and only as text.
  it("is nothing but numbers and units", () => {
    for (const sheet of sheets) {
      expect(pageRule({ sheet })).toMatch(
        /^@page \{ size: [\d.]+mm [\d.]+mm; margin: 0; \}$/,
      );
    }
  });

  it("gives a browser nothing to read past the rule it was handed", () => {
    const rule = pageRule({
      sheet: SheetLayout.default().with({
        size: CUSTOM_PAGE_SIZE,
        custom: {
          widthMillimetres: Number.NaN,
          heightMillimetres: 200,
        },
      }),
    });

    expect(rule).not.toContain("NaN");
    expect(rule).toMatch(
      /^@page \{ size: [\d.]+mm [\d.]+mm; margin: 0; \}$/,
    );
  });
});

describe("pageCells", () => {
  // A front page fills from zero, so the cards are already in the order they
  // are drawn and nothing has to be held open.
  it("draws a full page as its cards and nothing else", () => {
    const cells = pageCells({
      number: 1,
      side: "front",
      slots: [
        slot({ id: "a", index: 0 }),
        slot({ id: "b", index: 1 }),
      ],
    });

    expect(cells.map((cell) => cell.kind)).toEqual([
      "cards",
      "cards",
    ]);
  });

  // The page wraps its cards in reading order, so a card only lands at the
  // slot the mirror gave it if the slots before it are occupied.
  it("holds open every slot before the first card on a back page", () => {
    const cells = pageCells({
      number: 1,
      side: "back",
      slots: [slot({ id: "a", from: 1, index: 2 })],
    });

    expect(cells).toEqual([
      { kind: "blank", index: 0 },
      { kind: "blank", index: 1 },
      { kind: "cards", slot: slot({ id: "a", from: 1, index: 2 }) },
    ]);
  });

  it("holds open the gaps between cards as well as the ones before them", () => {
    const cells = pageCells({
      number: 1,
      side: "back",
      slots: [
        slot({ id: "a", from: 1, index: 1 }),
        slot({ id: "b", from: 1, index: 4 }),
      ],
    });

    expect(cells.map((cell) => cell.kind)).toEqual([
      "blank",
      "cards",
      "blank",
      "blank",
      "cards",
    ]);
  });

  // A run of several cards fills the slots after its own, so the next gap is
  // measured from the end of the run rather than from where it started.
  it("counts a run of cards as the slots it takes", () => {
    const cells = pageCells({
      number: 1,
      side: undefined,
      slots: [
        slot({ id: "a", index: 0, count: 3 }),
        slot({ id: "b", index: 4 }),
      ],
    });

    expect(cells.map((cell) => cell.kind)).toEqual([
      "cards",
      "blank",
      "cards",
    ]);
  });

  // A back with no children at all is an element of no height once the page
  // box supplies the height on paper, and a browser collapses the forced break
  // before it into the one after it. The page is then never put out, and every
  // back after it lands on the wrong front.
  it("gives a back that carries nothing something to stand it up", () => {
    expect(pageCells({ number: 1, side: "back", slots: [] })).toEqual(
      [{ kind: "blank", index: 0 }],
    );
  });
});

describe("the grid inset", () => {
  // The grid is columns wide, not content wide. Insetting the whole grid is
  // what keeps every row on the same columns, which centring the rows does
  // not: a short last row centred on its own lands between the columns above.
  it("is half of what the columns leave, in the style the sheet reads", () => {
    const sheet = SheetLayout.default();
    const style = cardPageStyle({ sheet, layout });

    expect(style["--page-grid-inset"]).toBe(
      `${sheet.gridInsetMillimetres({ layout })}mm`,
    );
  });

  it("puts the grid in the middle of what the margins leave", () => {
    const sheet = SheetLayout.default();
    const inset = sheet.gridInsetMillimetres({ layout });
    const columns = sheet.columnsFor({ layout });
    const gridWidth =
      columns * layout.widthMillimetres +
      (columns - 1) * sheet.cardGapMillimetres;

    expect(gridWidth + 2 * inset).toBeCloseTo(
      sheet.contentWidthMillimetres,
      10,
    );
  });

  // Down the sheet the inset is what makes a back land on its front, since a
  // back slot is the mirror of its front across the grid. A one sided sheet
  // has no back to register, so it keeps the grid where it already was.
  it("centres the grid down the sheet only when the job is two sided", () => {
    const sheet = SheetLayout.default().with({
      orientation: "landscape",
    });
    const oneSided = cardPageStyle({ sheet, layout });
    const twoSided = cardPageStyle({
      sheet: sheet.with({ sides: "double" }),
      layout,
    });

    expect(oneSided["--page-grid-row-inset"]).toBe("0mm");
    expect(twoSided["--page-grid-row-inset"]).toBe(
      `${sheet.gridRowInsetMillimetres({ layout })}mm`,
    );
    expect(sheet.gridRowInsetMillimetres({ layout })).toBeGreaterThan(
      0,
    );
  });
});
