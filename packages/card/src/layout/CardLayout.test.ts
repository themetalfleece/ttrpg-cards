import type { Dimensions } from "@ttrpg-cards/core";
import { describe, expect, it } from "vitest";

import { CardLayout } from "./CardLayout";
import {
  CARD_LAYOUT_PRESETS,
  CARD_SIZES,
  CARD_TEXT_SIZE_PRESETS,
  CARD_TEXT_SIZES,
  DEFAULT_CARD_TEXT_SIZE,
} from "./layout.constants";
import type {
  CardLayoutSettings,
  CardTextSizeName,
} from "./layout.types";

/** A layout with round numbers, for reading the arithmetic off the test. */
const plainLayout: CardLayoutSettings = {
  size: { widthMillimetres: 100, heightMillimetres: 200 },
  margins: {
    topMillimetres: 5,
    rightMillimetres: 10,
    bottomMillimetres: 15,
    leftMillimetres: 20,
  },
  fontSizeRange: { minimumMillimetres: 2, maximumMillimetres: 4 },
};

describe("CardLayout.default", () => {
  it("initialises to the standard card size", () => {
    const layout = CardLayout.default();

    expect(layout.widthMillimetres).toBe(63);
    expect(layout.heightMillimetres).toBe(88);
  });

  it("carries margins and a font size range as well as a size", () => {
    const layout = CardLayout.default();

    expect(layout.margins.topMillimetres).toBeGreaterThan(0);
    expect(layout.fontSizeRange.minimumMillimetres).toBeLessThan(
      layout.fontSizeRange.maximumMillimetres,
    );
  });
});

describe("CARD_LAYOUT_PRESETS", () => {
  // A preset is a box, not a whole layout: it carries no font size range, so
  // it only becomes usable geometry once a text size is combined with it.
  it("becomes usable geometry at every text size", () => {
    for (const size of CARD_SIZES) {
      for (const textSize of CARD_TEXT_SIZES) {
        expect(() =>
          CardLayout.fromPreset({
            preset: size.id,
            textSize: textSize.id,
          }),
        ).not.toThrow();
      }
    }
  });

  it("ships more than one size, so a size is something to pick", () => {
    expect(Object.keys(CARD_LAYOUT_PRESETS).length).toBeGreaterThan(
      1,
    );
  });
});

describe("CARD_TEXT_SIZE_PRESETS", () => {
  it("ships more than one, so a text size is something to pick", () => {
    expect(
      Object.keys(CARD_TEXT_SIZE_PRESETS).length,
    ).toBeGreaterThan(1);
  });

  // The whole point of the setting: picking a larger one raises the smallest
  // text anywhere on the card, not just the body.
  it("raises both ends as the setting goes up", () => {
    const floors = CARD_TEXT_SIZES.map(
      (size) => CARD_TEXT_SIZE_PRESETS[size.id].minimumMillimetres,
    );
    const ceilings = CARD_TEXT_SIZES.map(
      (size) => CARD_TEXT_SIZE_PRESETS[size.id].maximumMillimetres,
    );

    expect(floors).toEqual([...floors].sort((a, b) => a - b));
    expect(ceilings).toEqual([...ceilings].sort((a, b) => a - b));
    expect(new Set(floors).size).toBe(floors.length);
  });

  // 9 CSS pixels, the smallest this app sets text at. Pinned because it is the
  // floor the default lands on, and dropping it is a legibility decision
  // rather than a tidy-up.
  it("starts at nine pixels, which is what the default is", () => {
    const smallest =
      CARD_TEXT_SIZE_PRESETS[DEFAULT_CARD_TEXT_SIZE]
        .minimumMillimetres;
    const CSS_PIXELS_PER_INCH = 96;
    const MILLIMETRES_PER_INCH = 25.4;

    expect(
      (smallest / MILLIMETRES_PER_INCH) * CSS_PIXELS_PER_INCH,
    ).toBeCloseTo(9, 1);
  });

  it("leaves the fitting routine room to scale before it splits", () => {
    for (const size of CARD_TEXT_SIZES) {
      const range = CARD_TEXT_SIZE_PRESETS[size.id];

      expect(range.maximumMillimetres).toBeGreaterThan(
        range.minimumMillimetres,
      );
    }
  });
});

describe("CARD_SIZES", () => {
  it("names every preset exactly once, in the order they are declared", () => {
    expect(CARD_SIZES.map((size) => size.id)).toEqual(
      Object.keys(CARD_LAYOUT_PRESETS),
    );
  });

  it("carries a label and lays out from the preset it names", () => {
    for (const size of CARD_SIZES) {
      expect(size.name).not.toBe("");
      expect(CardLayout.fromPreset({ preset: size.id }).size).toEqual(
        CARD_LAYOUT_PRESETS[size.id].size,
      );
    }
  });
});

describe("CARD_TEXT_SIZES", () => {
  it("names every text size exactly once, in the order they are declared", () => {
    expect(CARD_TEXT_SIZES.map((size) => size.id)).toEqual(
      Object.keys(CARD_TEXT_SIZE_PRESETS),
    );
  });

  it("carries a label and sets type in the band it names", () => {
    for (const size of CARD_TEXT_SIZES) {
      expect(size.name).not.toBe("");
      expect(
        CardLayout.fromPreset({ textSize: size.id }).fontSizeRange,
      ).toEqual(CARD_TEXT_SIZE_PRESETS[size.id]);
    }
  });

  /*
   * Asking for smaller type buys tighter margins with it, so the two pull the
   * same way instead of the blank eating the room the smaller type just won.
   */
  it("brings the margins in with the text size", () => {
    const marginsAt = (textSize: CardTextSizeName) =>
      CardLayout.fromPreset({ textSize }).margins.topMillimetres;

    expect(marginsAt("small")).toBeLessThan(marginsAt("medium"));
    expect(marginsAt("medium")).toBeLessThan(marginsAt("large"));
  });

  // The preset states the blank a card wants, and the middle setting is what
  // states it at: a scale has to leave one setting reading the number as given.
  it("gives the middle setting the margins the preset declares", () => {
    for (const size of CARD_SIZES) {
      expect(
        CardLayout.fromPreset({ preset: size.id, textSize: "medium" })
          .margins,
      ).toEqual(CARD_LAYOUT_PRESETS[size.id].margins);
    }
  });

  // The two are independent choices, which is why they are separate records.
  it("sets the same band on every card size", () => {
    for (const size of CARD_SIZES) {
      expect(
        CardLayout.fromPreset({ preset: size.id, textSize: "large" })
          .fontSizeRange,
      ).toEqual(CARD_TEXT_SIZE_PRESETS.large);
    }
  });
});

describe("CardLayout.fromPreset", () => {
  it("falls back to the default preset", () => {
    expect(CardLayout.fromPreset({}).settings).toEqual(
      CardLayout.default().settings,
    );
  });

  it("applies overrides over the preset it names", () => {
    const layout = CardLayout.fromPreset({
      preset: "standard",
      overrides: { size: { widthMillimetres: 70 } },
    });

    expect(layout.widthMillimetres).toBe(70);
    expect(layout.heightMillimetres).toBe(
      CardLayout.default().heightMillimetres,
    );
  });

  it("rejects overrides that leave the geometry unusable", () => {
    expect(() =>
      CardLayout.fromPreset({
        overrides: { size: { widthMillimetres: 1 } },
      }),
    ).toThrow(TypeError);
  });
});

describe("CardLayout constructor", () => {
  it("reads back the geometry it was given", () => {
    const layout = new CardLayout({ settings: plainLayout });

    expect(layout.settings).toEqual(plainLayout);
    expect(layout.size).toEqual(plainLayout.size);
    expect(layout.margins).toEqual(plainLayout.margins);
    expect(layout.fontSizeRange).toEqual(plainLayout.fontSizeRange);
  });

  it("copies what it is given, so a later edit cannot reach it", () => {
    const settings = structuredClone(plainLayout);
    const layout = new CardLayout({ settings });

    settings.size.widthMillimetres = 999;

    expect(layout.widthMillimetres).toBe(100);
  });

  it("hands out a copy of its settings", () => {
    const layout = new CardLayout({ settings: plainLayout });
    const settings = layout.settings;

    settings.size.widthMillimetres = 999;

    expect(layout.widthMillimetres).toBe(100);
  });

  it("throws when the geometry is not usable", () => {
    expect(
      () =>
        new CardLayout({
          settings: {
            ...plainLayout,
            size: { widthMillimetres: 0, heightMillimetres: 200 },
          },
        }),
    ).toThrow(TypeError);
  });
});

describe("CardLayout size", () => {
  // A sheet compares a card to a paper, so both have to be the one shape the
  // app measures things in. The schema is what makes a card size what it is,
  // so this is the assignment that keeps the two from drifting apart.
  it("is the shape every measurement in the app takes", () => {
    const size: Dimensions = CardLayout.default().size;

    expect(size.widthMillimetres).toBe(63);
    expect(size.heightMillimetres).toBe(88);
  });
});

describe("CardLayout content area", () => {
  it("is what the margins leave of the card", () => {
    const layout = new CardLayout({ settings: plainLayout });

    expect(layout.contentWidthMillimetres).toBe(70);
    expect(layout.contentHeightMillimetres).toBe(180);
  });

  it("follows a size chosen at runtime", () => {
    const layout = new CardLayout({ settings: plainLayout }).with({
      size: { widthMillimetres: 50 },
    });

    expect(layout.contentWidthMillimetres).toBe(20);
  });
});

describe("CardLayout.with", () => {
  it("changes the size and leaves the rest alone", () => {
    const layout = new CardLayout({ settings: plainLayout });

    const resized = layout.with({
      size: { widthMillimetres: 70, heightMillimetres: 120 },
    });

    expect(resized.size).toEqual({
      widthMillimetres: 70,
      heightMillimetres: 120,
    });
    expect(resized.margins).toEqual(plainLayout.margins);
    expect(resized.fontSizeRange).toEqual(plainLayout.fontSizeRange);
  });

  it("changes one side of a group and keeps the others", () => {
    const layout = new CardLayout({ settings: plainLayout }).with({
      margins: { topMillimetres: 1 },
    });

    expect(layout.margins).toEqual({
      ...plainLayout.margins,
      topMillimetres: 1,
    });
  });

  it("leaves the layout it came from unchanged", () => {
    const layout = new CardLayout({ settings: plainLayout });

    layout.with({ size: { widthMillimetres: 50 } });

    expect(layout.widthMillimetres).toBe(100);
  });

  it("rejects a change that leaves the geometry unusable", () => {
    const layout = new CardLayout({ settings: plainLayout });

    expect(() =>
      layout.with({ size: { widthMillimetres: 25 } }),
    ).toThrow(/left and right margin/);
  });
});

describe("CardLayout.from", () => {
  it("builds a layout from a record read back from storage", () => {
    expect(CardLayout.from(plainLayout).settings).toEqual(
      plainLayout,
    );
  });

  it("names what is wrong with input that is not a layout", () => {
    expect(() => CardLayout.from(null)).toThrow(TypeError);
    expect(() => CardLayout.from({})).toThrow(/Not a card layout\./);
  });

  it("rejects a record carrying a field a layout does not have", () => {
    expect(() =>
      CardLayout.from({ ...plainLayout, bleedMillimetres: 3 }),
    ).toThrow(TypeError);
  });

  it("rejects a record whose fields are each fine but do not fit", () => {
    expect(() =>
      CardLayout.from({
        ...plainLayout,
        size: { widthMillimetres: 25, heightMillimetres: 200 },
      }),
    ).toThrow(/left and right margin/);
  });
});

describe("CardLayout.isCardLayoutSettings", () => {
  it("accepts a usable geometry", () => {
    expect(CardLayout.isCardLayoutSettings(plainLayout)).toBe(true);
  });

  it("rejects input that is not a layout at all", () => {
    expect(CardLayout.isCardLayoutSettings(null)).toBe(false);
    expect(CardLayout.isCardLayoutSettings(undefined)).toBe(false);
    expect(CardLayout.isCardLayoutSettings({})).toBe(false);
  });

  it("rejects a layout whose fields are each fine but do not fit", () => {
    expect(
      CardLayout.isCardLayoutSettings({
        ...plainLayout,
        size: { widthMillimetres: 25, heightMillimetres: 200 },
      }),
    ).toBe(false);
  });
});

describe("CardLayout.validate", () => {
  it("reports nothing for a usable geometry", () => {
    expect(CardLayout.validate(plainLayout)).toEqual([]);
  });

  it("rejects a dimension of zero or less", () => {
    const issues = CardLayout.validate({
      ...plainLayout,
      size: { widthMillimetres: 0, heightMillimetres: -1 },
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      "/size/widthMillimetres",
      "/size/heightMillimetres",
    ]);
  });

  it("rejects a dimension that is not a finite number", () => {
    for (const widthMillimetres of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      const issues = CardLayout.validate({
        ...plainLayout,
        size: { widthMillimetres, heightMillimetres: 200 },
      });

      expect(issues[0]?.path).toBe("/size/widthMillimetres");
    }
  });

  it("rejects a negative margin", () => {
    const issues = CardLayout.validate({
      ...plainLayout,
      margins: { ...plainLayout.margins, topMillimetres: -1 },
    });

    expect(issues[0]?.path).toBe("/margins/topMillimetres");
  });

  it("rejects side margins that do not fit across the card", () => {
    const issues = CardLayout.validate({
      ...plainLayout,
      size: { widthMillimetres: 30, heightMillimetres: 200 },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("/margins");
    expect(issues[0]?.message).toContain("left and right margin");
  });

  it("rejects margins that do not fit down the card", () => {
    const issues = CardLayout.validate({
      ...plainLayout,
      size: { widthMillimetres: 100, heightMillimetres: 20 },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("/margins");
    expect(issues[0]?.message).toContain("top and bottom margin");
  });

  it("rejects margins that leave the card exactly no content area", () => {
    const issues = CardLayout.validate({
      ...plainLayout,
      size: { widthMillimetres: 30, heightMillimetres: 20 },
    });

    expect(issues).toHaveLength(2);
  });

  it("rejects an inverted font size range", () => {
    const issues = CardLayout.validate({
      ...plainLayout,
      fontSizeRange: {
        minimumMillimetres: 4,
        maximumMillimetres: 2,
      },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("/fontSizeRange");
    expect(issues[0]?.message).toContain("smallest size upwards");
  });

  it("accepts a font size range pinned to one size", () => {
    expect(
      CardLayout.validate({
        ...plainLayout,
        fontSizeRange: {
          minimumMillimetres: 3,
          maximumMillimetres: 3,
        },
      }),
    ).toEqual([]);
  });

  it("reports a failure at the root for input of the wrong type", () => {
    const issues = CardLayout.validate(42);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.path).toBe("");
  });

  it("reports a missing group rather than throwing", () => {
    const issues = CardLayout.validate({ size: plainLayout.size });

    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("CardLayout.fittedFontSize", () => {
  const range = { minimumMillimetres: 2, maximumMillimetres: 4 };
  const layout = CardLayout.default().with({ fontSizeRange: range });

  it("gives up nothing when the content already fits", () => {
    expect(layout.fittedFontSize({ fits: () => true })).toBe(
      range.maximumMillimetres,
    );
  });

  it("bottoms out at the floor when nothing in the range fits", () => {
    expect(layout.fittedFontSize({ fits: () => false })).toBe(
      range.minimumMillimetres,
    );
  });

  it("finds the largest size that fits", () => {
    const fitted = layout.fittedFontSize({
      fits: (size) => size <= 3,
    });

    expect(fitted).toBeLessThanOrEqual(3);
    expect(fitted).toBeGreaterThan(2.99);
  });

  it("never answers outside the range", () => {
    for (const threshold of [1, 2, 2.5, 3.25, 4, 5]) {
      const fitted = layout.fittedFontSize({
        fits: (size) => size <= threshold,
      });

      expect(fitted).toBeGreaterThanOrEqual(range.minimumMillimetres);
      expect(fitted).toBeLessThanOrEqual(range.maximumMillimetres);
    }
  });

  // 1.13 / 0.01 is 112.99999999999999 in binary floating point, so snapping the
  // answer to the grid used to drop it a whole step below the layout's floor.
  it("does not round a floor that sits between grid steps below itself", () => {
    for (const minimumMillimetres of [1.13, 2.29, 3.57]) {
      const layout = CardLayout.default().with({
        fontSizeRange: { minimumMillimetres, maximumMillimetres: 4 },
      });

      expect(layout.fittedFontSize({ fits: () => false })).toBe(
        minimumMillimetres,
      );
    }
  });

  it("answers on the precision grid rather than to fifteen decimal places", () => {
    const fitted = layout.fittedFontSize({
      fits: (size) => size <= 2.718281828,
    });

    expect(fitted).toBe(Math.round(fitted * 100) / 100);
  });

  // Halving rather than stepping is what makes this affordable for a caller
  // that measures the browser once per candidate.
  it("asks about a bounded number of candidates", () => {
    let asked = 0;

    layout.fittedFontSize({
      fits: (size) => {
        asked += 1;

        return size <= 2.5;
      },
    });

    expect(asked).toBeLessThanOrEqual(12);
  });

  it("handles a range with no room to move", () => {
    const fixed = CardLayout.default().with({
      fontSizeRange: { minimumMillimetres: 3, maximumMillimetres: 3 },
    });

    expect(fixed.fittedFontSize({ fits: () => false })).toBe(3);
    expect(fixed.fittedFontSize({ fits: () => true })).toBe(3);
  });
});
