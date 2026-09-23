import { CardLayout, CARD_SIZES } from "@ttrpg-cards/card";
import { describe, expect, it } from "vitest";

import { SheetLayout } from "./SheetLayout";
import {
  CARD_GAP_MILLIMETRES,
  DEFAULT_FLIP_EDGE,
  DEFAULT_PRINT_SIDES,
  FLIP_EDGES,
  PAGE_ORIENTATIONS,
  PAGE_SIZE_PRESETS,
  PAGE_SIZES,
  PRINT_SIDES,
} from "./sheet.constants";
import type {
  SheetItem,
  SheetLayoutSettings,
  SheetPage,
} from "./sheet.types";

/** Every sheet the records allow, which is what the closed sets are worth. */
function everySheet(): SheetLayout[] {
  return PAGE_SIZES.flatMap((size) =>
    PAGE_ORIENTATIONS.map(
      (orientation) =>
        new SheetLayout({
          settings: {
            size: size.id,
            orientation: orientation.id,
            sides: DEFAULT_PRINT_SIDES,
            flipEdge: DEFAULT_FLIP_EDGE,
          },
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
      const sheet = SheetLayout.default().with({
        size: paper.id,
        orientation: "portrait",
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

describe("SheetLayout.gridRowInsetMillimetres", () => {
  // The same property the column inset is held to, down the sheet instead of
  // across it, and it carries more weight here: a back slot is the mirror of
  // its front, so a grid not centred on the axis being reversed prints every
  // back offset from its front by the whole leftover.
  it("leaves the grid exactly the room the insets do not take, on every sheet and every card", () => {
    for (const sheet of everySheet()) {
      for (const size of CARD_SIZES) {
        const layout = CardLayout.fromPreset({ preset: size.id });
        const rows = sheet.rowsFor({ layout });
        const gridHeight =
          rows * layout.heightMillimetres +
          (rows - 1) * sheet.cardGapMillimetres;
        const inset = sheet.gridRowInsetMillimetres({ layout });

        expect(gridHeight + 2 * inset).toBeCloseTo(
          sheet.contentHeightMillimetres,
          10,
        );
        expect(inset).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // The case the shipped defaults land on: long edge is the default flip, so
  // a reader who only turns the paper round gets a row mirror, and this is
  // the leftover that would otherwise sit under the last row.
  it("is real room on a sheet whose mirror runs down it", () => {
    const sheet = SheetLayout.default().with({
      orientation: "landscape",
    });
    const layout = CardLayout.default();

    expect(sheet.mirrorAxis).toBe("rows");
    expect(sheet.gridRowInsetMillimetres({ layout })).toBeGreaterThan(
      0,
    );
  });

  it("is nothing at all when no row fits", () => {
    const sheet = SheetLayout.default();

    expect(
      sheet.gridRowInsetMillimetres({ layout: squareLayout(400) }),
    ).toBe(0);
  });
});

describe("SheetLayout.paginate", () => {
  // A large card on the default sheet gives a capacity of four, which is
  // small enough to read the packing off the cases below.
  const layout = CardLayout.fromPreset({ preset: "large" });
  const sheet = SheetLayout.default();

  /** Each page as the cards on it, written `id` or `id:from` past the first. */
  const cardsOn = (
    pages: readonly SheetPage<SheetItem>[],
  ): string[][] =>
    pages.map((page) =>
      page.slots.flatMap((slot) =>
        Array.from({ length: slot.count }, (_unused, index) =>
          slot.from + index === 0
            ? slot.item.id
            : `${slot.item.id}:${slot.from + index}`,
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
        const cards = filled.slots.reduce(
          (total, slot) => total + slot.count,
          0,
        );

        expect(cards).toBe(capacity);
      }
    }
  });
});

describe("SheetLayout.mirrorAxis", () => {
  const layout = CardLayout.default();

  // The sheet turns about the axis its flip edge runs along, so which axis
  // reverses is the way round the paper is as much as the edge the reader
  // picked. Both papers are portrait by default and landscape when turned, so
  // one table covers every combination the records allow.
  it("reverses the columns on portrait paper flipped on the long edge", () => {
    for (const sheet of everySheet()) {
      const portrait = sheet.with({
        orientation: "portrait",
        flipEdge: "long-edge",
      });

      expect(portrait.mirrorAxis).toBe("columns");
    }
  });

  it("reverses the rows on portrait paper flipped on the short edge", () => {
    for (const sheet of everySheet()) {
      const portrait = sheet.with({
        orientation: "portrait",
        flipEdge: "short-edge",
      });

      expect(portrait.mirrorAxis).toBe("rows");
    }
  });

  it("swaps the two when the paper is turned the other way round", () => {
    for (const sheet of everySheet()) {
      const landscape = sheet.with({ orientation: "landscape" });

      expect(
        landscape.with({ flipEdge: "long-edge" }).mirrorAxis,
      ).toBe("rows");
      expect(
        landscape.with({ flipEdge: "short-edge" }).mirrorAxis,
      ).toBe("columns");
    }
  });

  it("maps the three by three grid across and down", () => {
    const sheet = SheetLayout.default();
    const slots = Array.from({ length: 9 }, (_unused, slot) => slot);

    expect(
      slots.map((slot) =>
        sheet
          .with({ flipEdge: "long-edge" })
          .mirrorSlot({ slot, layout }),
      ),
    ).toEqual([2, 1, 0, 5, 4, 3, 8, 7, 6]);
    expect(
      slots.map((slot) =>
        sheet
          .with({ flipEdge: "short-edge" })
          .mirrorSlot({ slot, layout }),
      ),
    ).toEqual([6, 7, 8, 3, 4, 5, 0, 1, 2]);
  });

  // Turning the sheet back over is the same turn, so nothing is lost by doing
  // it twice. That is also what makes a back page's slots a permutation of its
  // front's rather than a mapping that could drop or collide.
  it("is its own inverse, on every sheet and every flip", () => {
    for (const sheet of everySheet()) {
      for (const edge of FLIP_EDGES) {
        const flipped = sheet.with({ flipEdge: edge.id });
        const capacity = flipped.capacityFor({ layout });

        for (let slot = 0; slot < capacity; slot++) {
          expect(
            flipped.mirrorSlot({
              slot: flipped.mirrorSlot({ slot, layout }),
              layout,
            }),
          ).toBe(slot);
        }
      }
    }
  });

  it("hands back the slot it was given when nothing fits on the sheet", () => {
    expect(
      SheetLayout.default().mirrorSlot({
        slot: 3,
        layout: squareLayout(400),
      }),
    ).toBe(3);
  });
});

describe("SheetLayout.paginate, printed on both sides", () => {
  // A large card on the default sheet gives a capacity of four, small enough
  // to read the pairing off the cases below.
  const layout = CardLayout.fromPreset({ preset: "large" });
  const sheet = SheetLayout.default().with({ sides: "double" });

  /** Each page as `id:from` per slot, blanks written for the gaps between. */
  const slotsOn = (
    pages: readonly SheetPage<SheetItem>[],
  ): string[][] =>
    pages.map((page) => {
      const filled: string[] = [];

      for (const slot of page.slots) {
        while (filled.length < slot.index) {
          filled.push("-");
        }

        filled.push(`${slot.item.id}:${slot.from}`);
      }

      return filled;
    });

  it("holds these cards two across and two down, which the cases below read against", () => {
    expect(sheet.columnsFor({ layout })).toBe(2);
    expect(sheet.rowsFor({ layout })).toBe(2);
  });

  it("puts a continuation on the mirror of its own front slot", () => {
    expect(
      slotsOn(
        sheet.paginate({
          items: entries.slice(0, 1),
          layout,
          faceCounts: new Map([["a", 2]]),
        }),
      ),
    ).toEqual([["a:0"], ["-", "a:1"]]);
  });

  it("mirrors down the sheet instead when the flip is on the short edge", () => {
    expect(
      slotsOn(
        sheet.with({ flipEdge: "short-edge" }).paginate({
          items: entries.slice(0, 1),
          layout,
          faceCounts: new Map([["a", 2]]),
        }),
      ),
    ).toEqual([["a:0"], ["-", "-", "a:1"]]);
  });

  // A three card entry is two slots, and the second one's back has nothing to
  // put on it. That generalises the two card case rather than special casing
  // it: odd numbered cards take a front, even numbered ones a back.
  it("gives a three card entry two slots and leaves the second back blank", () => {
    expect(
      slotsOn(
        sheet.paginate({
          items: entries.slice(0, 1),
          layout,
          faceCounts: new Map([["a", 3]]),
        }),
      ),
    ).toEqual([
      ["a:0", "a:2"],
      ["-", "a:1"],
    ]);
  });

  // A page the driver never puts out shifts every pairing after it, which
  // ruins the run rather than one card, so the blank one is a page like any
  // other.
  it("emits a back page for every front, including one that carries nothing", () => {
    const pages = sheet.paginate({
      items: entries,
      layout,
      faceCounts: new Map(),
    });

    expect(pages.map((page) => page.side)).toEqual(["front", "back"]);
    expect(pages.map((page) => page.number)).toEqual([1, 1]);
    expect(pages[1]?.slots).toEqual([]);
  });

  it("pairs every sheet of a job that runs to several", () => {
    const many = Array.from({ length: 9 }, (_unused, index) => ({
      id: `entry-${index}`,
    }));
    const pages = sheet.paginate({
      items: many,
      layout,
      faceCounts: new Map(),
    });

    expect(pages.map((page) => page.side)).toEqual([
      "front",
      "back",
      "front",
      "back",
      "front",
      "back",
    ]);
    expect(pages.map((page) => page.number)).toEqual([
      1, 1, 2, 2, 3, 3,
    ]);
  });

  // Which gathers the blank backs at the tail of the run, so a driver still
  // set to skip blank pages drops only trailing pages. It costs the same
  // paper either way: the page count is the sum of the slots.
  it("lays entries needing more than one card out first", () => {
    expect(
      slotsOn(
        sheet.paginate({
          items: entries,
          layout,
          faceCounts: new Map([["d", 2]]),
        }),
      ),
    ).toEqual([
      ["d:0", "a:0", "b:0", "c:0"],
      ["-", "d:1"],
    ]);
  });

  it("mirrors a full sheet of continuations across the grid", () => {
    const pages = sheet.paginate({
      items: entries,
      layout,
      faceCounts: new Map([
        ["a", 2],
        ["b", 2],
        ["c", 2],
        ["d", 2],
      ]),
    });

    expect(slotsOn(pages)).toEqual([
      ["a:0", "b:0", "c:0", "d:0"],
      ["b:1", "a:1", "d:1", "c:1"],
    ]);
  });

  it("loses no card and repeats none", () => {
    const pages = sheet.paginate({
      items: entries,
      layout,
      faceCounts: new Map([
        ["a", 3],
        ["c", 5],
      ]),
    });
    const cards = pages
      .flatMap((page) => page.slots)
      .map((slot) => `${slot.item.id}:${slot.from}`);

    expect(cards.toSorted()).toEqual([
      "a:0",
      "a:1",
      "a:2",
      "b:0",
      "c:0",
      "c:1",
      "c:2",
      "c:3",
      "c:4",
      "d:0",
    ]);
  });

  it("never puts two cards in one slot of a page", () => {
    const pages = sheet.paginate({
      items: entries,
      layout,
      faceCounts: new Map([
        ["a", 3],
        ["c", 5],
      ]),
    });

    for (const page of pages) {
      const taken = page.slots.map((slot) => slot.index);

      expect(taken).toEqual(
        [...new Set(taken)].toSorted((a, b) => a - b),
      );
    }
  });

  it("gives back no pages when it is given no entries", () => {
    expect(
      sheet.paginate({ items: [], layout, faceCounts: new Map() }),
    ).toEqual([]);
  });

  it("gives back no pages when the card is larger than the paper", () => {
    expect(
      sheet.paginate({
        items: entries,
        layout: squareLayout(400),
        faceCounts: new Map(),
      }),
    ).toEqual([]);
  });

  // Off is today's behaviour exactly, which is what a reader who never touches
  // the control is relying on.
  it("goes back to one page a sheet when two sided is turned off", () => {
    const packing = {
      items: entries,
      layout,
      faceCounts: new Map([["b", 4]]),
    };

    expect(sheet.with({ sides: "single" }).paginate(packing)).toEqual(
      SheetLayout.default().paginate(packing),
    );
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

  it("offers both ways of printing a job and nothing else", () => {
    expect(PRINT_SIDES.map((way) => way.id)).toEqual([
      "single",
      "double",
    ]);
  });

  it("offers both flip edges and nothing else", () => {
    expect(FLIP_EDGES.map((edge) => edge.id)).toEqual([
      "long-edge",
      "short-edge",
    ]);
  });

  it("starts one sided, flipped on the long edge", () => {
    expect(DEFAULT_PRINT_SIDES).toBe("single");
    expect(DEFAULT_FLIP_EDGE).toBe("long-edge");
    expect(SheetLayout.default().duplex).toBe(false);
  });

  it("carries a label on every option", () => {
    for (const option of [
      ...PAGE_SIZES,
      ...PAGE_ORIENTATIONS,
      ...PRINT_SIDES,
      ...FLIP_EDGES,
    ]) {
      expect(option.name).not.toBe("");
    }
  });
});
