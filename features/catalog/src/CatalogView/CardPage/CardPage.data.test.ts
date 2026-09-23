import { CardLayout, type Card } from "@ttrpg-cards/card";
import { SheetLayout, type SheetSlot } from "@ttrpg-cards/printer";
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
  it("prints on the paper the preview is drawn at", () => {
    const sheet = SheetLayout.default();

    expect(pageRule({ sheet })).toBe(
      "@page { size: 210mm 297mm; margin: 8mm; }",
    );
  });

  it("follows every choice the sheet carries", () => {
    const sheet = SheetLayout.default().with({
      size: "letter",
      orientation: "landscape",
    });

    expect(pageRule({ sheet })).toBe(
      "@page { size: 279.4mm 215.9mm; margin: 5mm; }",
    );
  });

  // The rule is built into a stylesheet, so what goes into it matters. Every
  // number comes from a closed preset record rather than from a reader.
  it("is nothing but numbers and units", () => {
    for (const sheet of [
      SheetLayout.default(),
      SheetLayout.default().with({
        size: "letter",
        orientation: "landscape",
      }),
    ]) {
      expect(pageRule({ sheet })).toMatch(
        /^@page \{ size: [\d.]+mm [\d.]+mm; margin: [\d.]+mm; \}$/,
      );
    }
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
