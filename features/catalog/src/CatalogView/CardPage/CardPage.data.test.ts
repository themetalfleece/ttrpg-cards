import { CardLayout } from "@ttrpg-cards/card";
import { SheetLayout } from "@ttrpg-cards/printer";
import { describe, expect, it } from "vitest";

import { cardPageStyle, pageRule } from "./CardPage.data";

/** The size the properties below are worked out against. */
const layout = CardLayout.default();

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
});
