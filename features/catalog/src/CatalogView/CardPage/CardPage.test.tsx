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

/** A card carrying nothing but the name it is recognised by. */
function entry(id: string): Card {
  return { id, name: [{ text: id }], meta: [], body: [] };
}

const entries: readonly Card[] = ["first", "second"].map(entry);

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

  it("tells the printer which paper the sheet is", async () => {
    const container = await renderPage({});

    expect(container.querySelector("style")?.textContent).toBe(
      "@page { size: 210mm 297mm; margin: 8mm; }",
    );
  });
});
