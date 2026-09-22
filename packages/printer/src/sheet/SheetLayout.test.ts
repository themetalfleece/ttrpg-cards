import { CardLayout } from "@ttrpg-cards/card";
import { describe, expect, it } from "vitest";

import { SheetLayout } from "./SheetLayout";
import {
  CARD_GAP_MILLIMETRES,
  PAGE_ORIENTATIONS,
  PAGE_SIZE_PRESETS,
  PAGE_SIZES,
} from "./sheet.constants";
import type {
  SheetItem,
  SheetLayoutSettings,
  SheetPlacement,
} from "./sheet.types";

/** Every sheet the records allow, which is what the closed sets are worth. */
function everySheet(): SheetLayout[] {
  return PAGE_SIZES.flatMap((size) =>
    PAGE_ORIENTATIONS.map(
      (orientation) =>
        new SheetLayout({
          settings: { size: size.id, orientation: orientation.id },
        }),
    ),
  );
}

/** A square card of a given side, for reading the arithmetic off the test. */
function squareLayout(sideMillimetres: number): CardLayout {
  return CardLayout.default().with({
    size: {
      widthMillimetres: sideMillimetres,
      heightMillimetres: sideMillimetres,
    },
  });
}

/** An entry carrying nothing but the id a sheet counts it by. */
const entries: readonly SheetItem[] = ["a", "b", "c", "d"].map(
  (id) => ({
    id,
  }),
);

describe("SheetLayout.default", () => {
  it("starts on A4, portrait", () => {
    const sheet = SheetLayout.default();

    expect(sheet.widthMillimetres).toBe(210);
    expect(sheet.heightMillimetres).toBe(297);
  });

  it("holds the three by three grid a standard card wants", () => {
    expect(
      SheetLayout.default().capacityFor({
        layout: CardLayout.default(),
      }),
    ).toBe(9);
  });
});

describe("the margin each paper carries", () => {
  // The point of the margin belonging to the paper rather than to a reader.
  // Letter is shorter than A4, so it has less to spare, and giving both the
  // same margin would cost one of them a row.
  it("keeps three rows of standard cards on every paper", () => {
    const layout = CardLayout.default();

    for (const paper of PAGE_SIZES) {
      const sheet = new SheetLayout({
        settings: { size: paper.id, orientation: "portrait" },
      });

      expect(sheet.capacityFor({ layout })).toBe(9);
    }
  });

  it("leaves the grid the room the margin and the gaps do not take", () => {
    const layout = CardLayout.default();

    for (const sheet of everySheet()) {
      const columns = sheet.capacityFor({ layout }) > 0 ? 3 : 0;
      const used =
        columns * layout.widthMillimetres +
        (columns - 1) * sheet.cardGapMillimetres;

      expect(used).toBeLessThanOrEqual(sheet.contentWidthMillimetres);
    }
  });
});

describe("SheetLayout orientation", () => {
  it("keeps the paper as published in portrait", () => {
    const sheet = SheetLayout.default().with({
      orientation: "portrait",
    });

    expect(sheet.widthMillimetres).toBe(
      PAGE_SIZE_PRESETS.a4.widthMillimetres,
    );
    expect(sheet.heightMillimetres).toBe(
      PAGE_SIZE_PRESETS.a4.heightMillimetres,
    );
  });

  it("swaps the two dimensions in landscape", () => {
    const sheet = SheetLayout.default().with({
      orientation: "landscape",
    });

    expect(sheet.widthMillimetres).toBe(
      PAGE_SIZE_PRESETS.a4.heightMillimetres,
    );
    expect(sheet.heightMillimetres).toBe(
      PAGE_SIZE_PRESETS.a4.widthMillimetres,
    );
  });

  it("turns a tall grid into a wide one without changing the paper", () => {
    const layout = CardLayout.default();
    const portrait = SheetLayout.default();
    const landscape = portrait.with({ orientation: "landscape" });

    expect(landscape.size).toBe(portrait.size);
    expect(landscape.capacityFor({ layout })).not.toBe(
      portrait.capacityFor({ layout }),
    );
  });
});

describe("SheetLayout content area", () => {
  it("is what the paper's own margin leaves of it", () => {
    const sheet = SheetLayout.default();
    const margin = PAGE_SIZE_PRESETS.a4.marginMillimetres;

    expect(sheet.marginMillimetres).toBe(margin);
    expect(sheet.contentWidthMillimetres).toBe(210 - 2 * margin);
    expect(sheet.contentHeightMillimetres).toBe(297 - 2 * margin);
  });

  it("follows the paper, so changing it changes the margin too", () => {
    const letter = SheetLayout.default().with({ size: "letter" });

    expect(letter.marginMillimetres).toBe(
      PAGE_SIZE_PRESETS.letter.marginMillimetres,
    );
    expect(letter.marginMillimetres).not.toBe(
      SheetLayout.default().marginMillimetres,
    );
  });

  // Nothing validates a sheet, because a sheet is built out of closed sets
  // rather than out of measurements a caller made up. This is what makes that
  // safe: every combination the records allow is one a card can sit on.
  it("leaves room for a card on every sheet the records allow", () => {
    for (const sheet of everySheet()) {
      expect(sheet.contentWidthMillimetres).toBeGreaterThan(0);
      expect(sheet.contentHeightMillimetres).toBeGreaterThan(0);
      expect(
        sheet.capacityFor({ layout: CardLayout.default() }),
      ).toBeGreaterThan(0);
    }
  });
});

describe("SheetLayout.capacityFor", () => {
  it("counts the gaps between cards, and drops the card that needs one too many", () => {
    const sheet = SheetLayout.default();
    const across = sheet.contentWidthMillimetres;
    // Exactly wide enough for two cards across and the gap between them.
    const withGap = squareLayout((across - CARD_GAP_MILLIMETRES) / 2);
    // Half the paper each, which leaves the gap nowhere to go.
    const withoutGap = squareLayout(across / 2);

    expect(sheet.capacityFor({ layout: withGap })).toBeGreaterThan(
      sheet.capacityFor({ layout: withoutGap }),
    );
  });

  it("holds nothing when a card is larger than the paper", () => {
    const sheet = SheetLayout.default();
    const oversized = squareLayout(sheet.heightMillimetres + 1);

    expect(sheet.capacityFor({ layout: oversized })).toBe(0);
  });
});

describe("SheetLayout.gridInsetMillimetres", () => {
  const layout = CardLayout.default();

  // What the inset is for: the grid is columns wide, not content wide, and
  // the leftover has to be split rather than trailing on one edge.
  it("is half of what the columns leave", () => {
    for (const sheet of everySheet()) {
      const columns = sheet.columnsFor({ layout });
      const gridWidth =
        columns * layout.widthMillimetres +
        (columns - 1) * sheet.cardGapMillimetres;

      expect(sheet.gridInsetMillimetres({ layout })).toBeCloseTo(
        (sheet.contentWidthMillimetres - gridWidth) / 2,
        10,
      );
    }
  });

  it("leaves the grid exactly the room the insets do not take", () => {
    for (const sheet of everySheet()) {
      const columns = sheet.columnsFor({ layout });
      const gridWidth =
        columns * layout.widthMillimetres +
        (columns - 1) * sheet.cardGapMillimetres;
      const inset = sheet.gridInsetMillimetres({ layout });

      expect(gridWidth + 2 * inset).toBeCloseTo(
        sheet.contentWidthMillimetres,
        10,
      );
    }
  });

  it("is never negative, so a grid is never inset off its own sheet", () => {
    for (const sheet of everySheet()) {
      expect(
        sheet.gridInsetMillimetres({ layout }),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("is nothing at all when no column fits", () => {
    const sheet = SheetLayout.default();

    expect(
      sheet.gridInsetMillimetres({ layout: squareLayout(400) }),
    ).toBe(0);
  });
});

describe("SheetLayout.paginate", () => {
  // A large card on the default sheet gives a capacity of four, which is
  // small enough to read the packing off the cases below.
  const layout = CardLayout.fromPreset({ preset: "large" });
  const sheet = SheetLayout.default();

  /** Each sheet as the cards on it, written `id` or `id:from` past the first. */
  const cardsOn = (
    sheets: readonly (readonly SheetPlacement<SheetItem>[])[],
  ): string[][] =>
    sheets.map((placements) =>
      placements.flatMap((placement) =>
        Array.from({ length: placement.count }, (_unused, index) =>
          placement.from + index === 0
            ? placement.item.id
            : `${placement.item.id}:${placement.from + index}`,
        ),
      ),
    );

  it("holds four of these cards, which is what the cases below count against", () => {
    expect(sheet.capacityFor({ layout })).toBe(4);
  });

  it("counts an entry nothing has measured as the one card it is at least", () => {
    expect(
      cardsOn(
        sheet.paginate({
          items: entries,
          layout,
          faceCounts: new Map(),
        }),
      ),
    ).toEqual([["a", "b", "c", "d"]]);
  });

  it("gives back a slot for every continuation an entry turned out to need", () => {
    expect(
      cardsOn(
        sheet.paginate({
          items: entries,
          layout,
          faceCounts: new Map([["b", 2]]),
        }),
      ),
    ).toEqual([["a", "b", "b:1", "c"], ["d"]]);
  });

  // The whole point of packing cards rather than entries. An entry whose
  // cards will not all fit puts the ones that do in the room that is left,
  // because a slot held open for a card that could not use it is paper spent
  // on an adjacency the scissors take away anyway.
  it("splits an entry across the boundary rather than leaving a gap", () => {
    expect(
      cardsOn(
        sheet.paginate({
          items: entries,
          layout,
          faceCounts: new Map([["b", 4]]),
        }),
      ),
    ).toEqual([
      ["a", "b", "b:1", "b:2"],
      ["b:3", "c", "d"],
    ]);
  });

  it("runs an entry larger than a whole sheet across as many as it needs", () => {
    expect(
      cardsOn(
        sheet.paginate({
          items: entries,
          layout,
          faceCounts: new Map([["b", 6]]),
        }),
      ),
    ).toEqual([
      ["a", "b", "b:1", "b:2"],
      ["b:3", "b:4", "b:5", "c"],
      ["d"],
    ]);
  });

  // No room for a single card is not an arrangement to be found, so there is
  // nothing to hand back and a consumer can say the one thing that is true
  // instead of showing a run of overflowing sheets.
  it("gives back no sheets at all when the card is larger than the paper", () => {
    expect(
      sheet.paginate({
        items: entries,
        layout: squareLayout(400),
        faceCounts: new Map(),
      }),
    ).toEqual([]);
  });

  it("gives back no sheets when it is given no entries", () => {
    expect(
      sheet.paginate({ items: [], layout, faceCounts: new Map() }),
    ).toEqual([]);
  });

  it("loses no card and repeats none, however they pack", () => {
    const sheets = sheet.paginate({
      items: entries,
      layout,
      faceCounts: new Map([
        ["a", 3],
        ["c", 5],
      ]),
    });

    expect(cardsOn(sheets).flat()).toEqual([
      "a",
      "a:1",
      "a:2",
      "b",
      "c",
      "c:1",
      "c:2",
      "c:3",
      "c:4",
      "d",
    ]);
  });

  // Zero gaps is the whole promise, so it is asserted directly rather than
  // read off one arrangement: every sheet but the last is full.
  it("leaves no sheet but the last one short", () => {
    const capacity = sheet.capacityFor({ layout });

    for (const counts of [
      new Map(),
      new Map([["b", 2]]),
      new Map([["b", 4]]),
      new Map([
        ["a", 3],
        ["c", 5],
      ]),
      new Map([
        ["a", 2],
        ["b", 2],
        ["c", 2],
        ["d", 2],
      ]),
    ]) {
      const sheets = sheet.paginate({
        items: entries,
        layout,
        faceCounts: counts,
      });

      for (const filled of sheets.slice(0, -1)) {
        const cards = filled.reduce(
          (total, placement) => total + placement.count,
          0,
        );

        expect(cards).toBe(capacity);
      }
    }
  });
});

describe("SheetLayout.with", () => {
  it("changes one field and keeps the others", () => {
    const sheet = SheetLayout.default().with({ size: "letter" });

    expect(sheet.size).toBe("letter");
    expect(sheet.orientation).toBe(SheetLayout.default().orientation);
  });

  it("leaves the sheet it came from unchanged", () => {
    const sheet = SheetLayout.default();

    sheet.with({ size: "letter" });

    expect(sheet.size).toBe("a4");
  });

  it("hands out a copy of its settings", () => {
    const sheet = SheetLayout.default();
    const settings: SheetLayoutSettings = sheet.settings;

    expect(settings).not.toBe(sheet.settings);
    expect(settings).toEqual(sheet.settings);
  });
});

describe("the page records", () => {
  it("names every paper exactly once", () => {
    expect(PAGE_SIZES.map((paper) => paper.id)).toEqual(
      Object.keys(PAGE_SIZE_PRESETS),
    );
  });

  it("offers both ways round and nothing else", () => {
    expect(PAGE_ORIENTATIONS.map((way) => way.id)).toEqual([
      "portrait",
      "landscape",
    ]);
  });

  it("carries a label on every option", () => {
    for (const option of [...PAGE_SIZES, ...PAGE_ORIENTATIONS]) {
      expect(option.name).not.toBe("");
    }
  });
});
