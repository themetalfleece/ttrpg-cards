import { CardLayout, type Card } from "@ttrpg-cards/card";
import { SheetLayout } from "@ttrpg-cards/printer";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CardPage } from "./CardPage.component";
import { NOTHING_FITS } from "./CardPage.constants";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Whatever a test replaced or mounted, undone after it. */
const restores: Array<() => void> = [];

/** Enough of a `ResizeObserver` for cards that each observe one box. */
function stubResizeObserver(): void {
  class StubResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;

  restores.push(() => {
    globalThis.ResizeObserver = original;
  });
}

/**
 * A `matchMedia` that answers for print and can be told the answer changed,
 * standing in for the browser that has the query and not the event.
 */
function stubPrintMedia(): { startPrinting: () => void } {
  const listeners: ((event: MediaQueryListEvent) => void)[] = [];
  const original = window.matchMedia;

  window.matchMedia = ((media: string) => ({
    media,
    matches: false,
    addEventListener: (
      _: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      listeners.push(listener);
    },
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  restores.push(() => {
    window.matchMedia = original;
  });

  return {
    startPrinting: () => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    },
  };
}

/** A card carrying nothing but the name it is recognised by. */
function entry(id: string): Card {
  return { id, name: [{ text: id }], meta: [], body: [] };
}

const entries: readonly Card[] = ["first", "second"].map(entry);

/** More cards than one sheet holds, so the page has to stage them. */
const manyEntries: readonly Card[] = Array.from(
  { length: 20 },
  (_, index) => entry(`card-${index + 1}`),
);

/** Every sheet currently on the page. */
function sheetsOn(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'section[aria-label^="Card page"]',
    ),
  );
}

/** A card cut larger than any paper the app prints on. */
const oversizedLayout = CardLayout.default().with({
  size: { widthMillimetres: 400, heightMillimetres: 500 },
});

/** The page mounted for real, so the cards on it measure themselves. */
async function renderPage(options: {
  layout?: CardLayout;
  cards?: readonly Card[];
}): Promise<HTMLElement> {
  stubResizeObserver();

  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      <CardPage
        cards={options.cards ?? entries}
        layout={options.layout ?? CardLayout.default()}
        sheet={SheetLayout.default()}
      />,
    );
  });

  restores.push(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  return container;
}

/**
 * The page as it stands after the first commit and before a frame has gone by,
 * which is what a reader sees first.
 */
function renderFirstFrame(cards: readonly Card[]): HTMLElement {
  stubResizeObserver();

  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  act(() => {
    root.render(
      <CardPage
        cards={cards}
        layout={CardLayout.default()}
        sheet={SheetLayout.default()}
      />,
    );
  });

  restores.push(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  return container;
}

/** What every sheet on the page says about whether it has finished arriving. */
function busyStates(container: HTMLElement): (string | null)[] {
  return sheetsOn(container).map((sheet) =>
    sheet.getAttribute("aria-busy"),
  );
}

/**
 * Lets frames go by until every sheet says it has stopped arriving.
 *
 * The page concludes that from frames rather than from an event, and the
 * sheets go up over several of them, so a test that wants the finished answer
 * has to let the frames happen. It gives up well after the point the page
 * should have got there, so a page that never settles fails on what the sheets
 * say rather than by hanging.
 */
async function waitForArrival(container: HTMLElement): Promise<void> {
  for (let attempt = 0; attempt < ARRIVAL_ATTEMPTS; attempt += 1) {
    const states = busyStates(container);

    if (
      states.length > 0 &&
      states.every((state) => state === "false")
    ) {
      return;
    }

    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }
}

/** How many frames `waitForArrival` will wait through before giving up. */
const ARRIVAL_ATTEMPTS = 40;

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

describe("CardPage", () => {
  it("lays out the entries it is given", async () => {
    const container = await renderPage({});

    expect(container.querySelectorAll("article")).toHaveLength(
      entries.length,
    );
    expect(container.textContent).not.toContain(NOTHING_FITS);
  });

  // A dead end otherwise: nothing renders, so nothing measures, so the answer
  // never changes until the reader picks differently, and a blank sheet does
  // not tell them that is what to do.
  it("says so when the sheet has room for nothing", async () => {
    const container = await renderPage({ layout: oversizedLayout });

    expect(container.querySelectorAll("article")).toHaveLength(0);
    expect(container.textContent).toContain(NOTHING_FITS);
  });

  it("stays quiet when there is nothing to lay out in the first place", async () => {
    const container = await renderPage({ cards: [] });

    expect(container.textContent).not.toContain(NOTHING_FITS);
  });

  // Every card on a sheet measures itself as it mounts, so a whole set in one
  // commit is a locked tab and a blank page until the last of them is done.
  it("puts the first sheet up before the rest of them", () => {
    const container = renderFirstFrame(manyEntries);

    expect(sheetsOn(container)).toHaveLength(1);
  });

  // And says how many are coming, rather than letting the total climb while
  // the reader is reading it.
  it("counts the sheets that are still arriving in the label", () => {
    const container = renderFirstFrame(manyEntries);

    expect(sheetsOn(container)[0]?.getAttribute("aria-label")).toBe(
      "Card page 1 of 3",
    );
  });

  it("puts every sheet up before the browser draws any pages", () => {
    const container = renderFirstFrame(manyEntries);

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(sheetsOn(container)).toHaveLength(3);
    expect(container.querySelectorAll("article")).toHaveLength(
      manyEntries.length,
    );
  });

  // Safari has never implemented the event, on desktop or on phone, so the
  // media query is the only warning it gives that a print has started.
  it("puts every sheet up for a browser that only has the media query", () => {
    const media = stubPrintMedia();
    const container = renderFirstFrame(manyEntries);

    expect(sheetsOn(container)).toHaveLength(1);

    act(() => {
      media.startPrinting();
    });

    expect(sheetsOn(container)).toHaveLength(3);
  });

  // The print button holds on this, and so does the headless print
  // verification, which has no other way to tell a page that has finished from
  // one that is midway through measuring itself.
  it("says a sheet is still arriving, and says when it has arrived", async () => {
    const container = renderFirstFrame(manyEntries);

    expect(busyStates(container)).toEqual(["true"]);

    await waitForArrival(container);

    expect(busyStates(container)).toEqual([
      "false",
      "false",
      "false",
    ]);
  });

  it("says a sheet with room for nothing is not still arriving", async () => {
    const container = await renderPage({ layout: oversizedLayout });

    await waitForArrival(container);

    expect(busyStates(container)).toEqual(["false"]);
  });

  it("tells the printer which paper the sheet is", async () => {
    const container = await renderPage({});
    const sheet = SheetLayout.default();

    expect(container.querySelector("style")?.textContent).toBe(
      `@page { size: ${sheet.widthMillimetres}mm ${sheet.heightMillimetres}mm; margin: 0; }`,
    );
  });
});
