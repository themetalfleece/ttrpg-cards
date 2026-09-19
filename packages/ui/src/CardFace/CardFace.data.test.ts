import { CardLayout } from "@ttrpg-cards/card";
import { describe, expect, it } from "vitest";

import { cardFaceStyle } from "./CardFace.data";

/** A layout with distinct round numbers, so each property names its source. */
const distinctLayout = CardLayout.fromPreset({
  overrides: {
    size: { widthMillimetres: 100, heightMillimetres: 200 },
    margins: {
      topMillimetres: 1,
      rightMillimetres: 2,
      bottomMillimetres: 3,
      leftMillimetres: 4,
    },
    fontSizeRange: { minimumMillimetres: 5, maximumMillimetres: 6 },
  },
});

describe("cardFaceStyle", () => {
  it("reads every length off the layout it is handed", () => {
    expect(cardFaceStyle({ layout: distinctLayout })).toEqual({
      "--card-width": "100mm",
      "--card-height": "200mm",
      "--card-margin-top": "1mm",
      "--card-margin-right": "2mm",
      "--card-margin-bottom": "3mm",
      "--card-margin-left": "4mm",
      "--card-font-size": "6mm",
      "--card-font-size-minimum": "5mm",
    });
  });

  it("carries the bottom of the range as the floor the type scale clamps to", () => {
    const style = cardFaceStyle({ layout: distinctLayout });

    expect(style["--card-font-size-minimum"]).toBe(
      `${distinctLayout.fontSizeRange.minimumMillimetres}mm`,
    );
  });

  it("starts body text at the top of the range, leaving the fitting routine room to scale down", () => {
    const style = cardFaceStyle({ layout: distinctLayout });
    const { fontSizeRange } = distinctLayout;

    expect(style["--card-font-size"]).toBe(
      `${fontSizeRange.maximumMillimetres}mm`,
    );
    expect(style["--card-font-size"]).not.toBe(
      `${fontSizeRange.minimumMillimetres}mm`,
    );
  });

  it("sets body text at the size it is given, which is what the fitting hook measured", () => {
    const style = cardFaceStyle({
      layout: distinctLayout,
      fontSizeMillimetres: 5.25,
    });

    expect(style["--card-font-size"]).toBe("5.25mm");
    // The floor travels with it, so the type scale still clamps.
    expect(style["--card-font-size-minimum"]).toBe("5mm");
  });

  it("gives every measurement in millimetres, so screen and print agree", () => {
    const style = cardFaceStyle({ layout: CardLayout.default() });

    for (const value of Object.values(style)) {
      expect(value).toMatch(/^\d+(\.\d+)?mm$/);
    }
  });

  it("follows the layout when it changes", () => {
    const layout = CardLayout.default();
    const wider = layout.with({ size: { widthMillimetres: 89 } });

    expect(cardFaceStyle({ layout: wider })["--card-width"]).toBe(
      "89mm",
    );
    expect(cardFaceStyle({ layout: wider })["--card-height"]).toBe(
      cardFaceStyle({ layout })["--card-height"],
    );
  });
});
