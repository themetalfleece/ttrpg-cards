import { CardLayout, type Card } from "@ttrpg-cards/card";
import { SheetLayout } from "@ttrpg-cards/printer";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { usePageFill } from "./CardPage.hooks";
import type { PageFill } from "./CardPage.types";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Whatever a test mounted, taken down after it. */
const restores: Array<() => void> = [];

/** A card carrying nothing but the name it is recognised by. */
function entry(id: string): Card {
  return { id, name: [{ text: id }], meta: [], body: [] };
}

/** As many plain cards as a test needs, named in order. */
function entries(count: number): readonly Card[] {
  return Array.from({ length: count }, (_, index) =>
    entry(`card-${index + 1}`),
  );
}

/** One entry's cards on one sheet, as a test reads them. */
interface Placement {
  readonly id: string;
  readonly from: number;
  readonly count: number;
}

interface FillHarness {
  /** The fill as it stands after the last render. */
  latest: () => PageFill;
  /** The cards on each sheet, which is what a reader sees move. */
  arrangement: () => Placement[][];
  /** How many cards each sheet holds. */
  totals: () => number[];
  /** Says what an entry cost, and whether that came from a measurement. */
  report: (
    cardId: string,
    faceCount: number,
    measured?: boolean,
  ) => void;
  /** Draws again with something changed. */
  redraw: (next: { cards: readonly Card[] }) => void;
}

/** A page fill mounted on its own, so a test can drive what it is told. */
function renderFill(options: {
  cards: readonly Card[];
}): FillHarness {
  const layout = CardLayout.default();
  const sheet = SheetLayout.default();
  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);
  let fill: PageFill | undefined;

  function Harness(props: { cards: readonly Card[] }) {
    const current = usePageFill({
      cards: props.cards,
      layout,
      sheet,
    });

    useEffect(() => {
      fill = current;
    });

    return null;
  }

  let drawn = { cards: options.cards };

  const draw = () => {
    act(() => {
      root.render(<Harness cards={drawn.cards} />);
    });
  };

  draw();

  restores.push(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const latest = (): PageFill => {
    if (fill === undefined) {
      throw new Error("The harness rendered no fill");
    }

    return fill;
  };

  return {
    latest,
    arrangement: () =>
      latest().sheets.map((run) =>
        run.map((placement) => ({
          id: placement.item.id,
          from: placement.from,
          count: placement.count,
        })),
      ),
    totals: () =>
      latest().sheets.map((run) =>
        run.reduce((cards, placement) => cards + placement.count, 0),
      ),
    report: (cardId, faceCount, measured = true) => {
      act(() => {
        latest().reportFaceCount({ cardId, faceCount, measured });
      });
    },
    redraw: (next) => {
      drawn = { ...drawn, ...next };
      draw();
    },
  };
}

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

describe("usePageFill", () => {
  const capacity = SheetLayout.default().capacityFor({
    layout: CardLayout.default(),
  });

  /** One more entry than a sheet holds, so there is a boundary to move. */
  const overOneSheet = entries(capacity + 1);

  /** Every entry saying the one card it is, which is what a mount reports. */
  function reportAllUnmeasured(page: FillHarness): void {
    for (const card of overOneSheet) {
      page.report(card.id, 1, false);
    }
  }

  it("fills the first sheet and starts a second with what is left", () => {
    const page = renderFill({ cards: overOneSheet });

    reportAllUnmeasured(page);

    expect(page.arrangement()).toHaveLength(2);
    expect(page.totals()).toEqual([capacity, 1]);
  });

  // The board's flashing bug. An entry that grows no longer fits where it was,
  // so it moves to the next sheet, and moving sheets means moving React
  // parents, which is an unmount and a fresh mount. A fresh mount has measured
  // nothing and reports the one card it is. Taking that back would send it
  // home, where it would measure again, grow again, and move again, forever.
  it("holds an arrangement when an entry that moved reports itself unmeasured", () => {
    const page = renderFill({ cards: overOneSheet });
    const last = overOneSheet[capacity - 1];

    if (last === undefined) {
      throw new Error("The sheet holds nothing");
    }

    reportAllUnmeasured(page);
    page.report(last.id, 2);

    const moved = page.arrangement();

    // The entry that grew fills the sheet and carries its second card over,
    // so the sheet stays full and the next one opens on the rest of it.
    expect(page.totals()[0]).toBe(capacity);
    expect(moved[0]?.at(-1)).toEqual({
      id: last.id,
      from: 0,
      count: 1,
    });
    expect(moved[1]?.[0]).toEqual({
      id: last.id,
      from: 1,
      count: 1,
    });

    page.report(last.id, 1, false);

    expect(page.arrangement()).toEqual(moved);
  });

  it("never lets what an entry costs fall on its own", () => {
    const page = renderFill({ cards: overOneSheet });
    const first = overOneSheet[0];

    if (first === undefined) {
      throw new Error("The sheet holds nothing");
    }

    page.report(first.id, 3);
    page.report(first.id, 1, false);
    page.report(first.id, 2, false);

    expect(page.arrangement()[0]?.[0]).toEqual({
      id: first.id,
      from: 0,
      count: 3,
    });
  });

  // The other direction, and the one the guard alone gets wrong. Every face is
  // swapped in after the page has already drawn once, so a cold load measures
  // in the fallback and again in the real face, and the second answer is
  // worked out from the top rather than from the first: which way it moves is
  // font metrics on the reader's machine, so neither direction can be assumed.
  // Refusing a fall would leave the sheet holding a slot for a card that no
  // longer exists, for good.
  it("takes a measurement that comes back smaller than the last one", () => {
    const page = renderFill({ cards: overOneSheet });
    const first = overOneSheet[0];

    if (first === undefined) {
      throw new Error("The sheet holds nothing");
    }

    reportAllUnmeasured(page);
    page.report(first.id, 2);

    expect(page.arrangement()[0]?.[0]?.count).toBe(2);

    page.report(first.id, 1);

    expect(page.arrangement()[0]?.[0]?.count).toBe(1);
    expect(page.arrangement()).toHaveLength(2);
  });

  // What an entry cost is kept across a redraw rather than thrown away, which
  // is what keeps a change of face or card size cheap: every entry on the page
  // measures itself again and says what it really came to, and until it does
  // the last answer is a far better guess than the single card a fresh mount
  // assumes. Started over instead, the page lays every entry out as one card
  // and then moves each one that grew to the sheet after it, and every move is
  // a remount and another round of measuring.
  it("keeps what an entry cost across a redraw, until it measures again", () => {
    const page = renderFill({ cards: overOneSheet });
    const first = overOneSheet[0];

    if (first === undefined) {
      throw new Error("The sheet holds nothing");
    }

    reportAllUnmeasured(page);
    page.report(first.id, 2);

    expect(page.arrangement()[0]?.[0]?.count).toBe(2);

    // The same entries handed over again, which is what a reader bringing an
    // edited document back looks like: identifiers are reused, so the count
    // stands in for the new content until that content has been measured.
    page.redraw({ cards: entries(capacity + 1) });
    reportAllUnmeasured(page);

    expect(page.arrangement()[0]?.[0]?.count).toBe(2);

    // And the measurement replaces it, whichever way it moves.
    page.report(first.id, 1);

    expect(page.arrangement()[0]?.[0]?.count).toBe(1);
  });
});
