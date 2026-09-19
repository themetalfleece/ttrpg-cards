import { type Card, CardLayout, CardModel } from "@ttrpg-cards/card";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CardSetView } from "./CardSetView.component";
import * as setViewFixtures from "./CardSetView.fixtures";
import { overflowingCard, settledCard } from "./CardSetView.fixtures";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * jsdom does no layout, so a card's box is stubbed. The stub sets text the way
 * a browser roughly does, reading the card's own dimensions and type size off
 * the custom properties it declares: the card ends at the bottom of its
 * content area, and its text runs as far down as the characters on it wrap to.
 *
 * Reading the geometry rather than fixing a number is the point. A card cut to
 * another size gives a different answer here for the same reason it would in a
 * browser, with nothing about the stub changed.
 */
const CHARACTER_WIDTH_RATIO = 0.5;
const LINE_HEIGHT_RATIO = 1.5;
const PIXELS_PER_MILLIMETRE = 4;

/** Restores whatever the stubs below replaced. */
const restores: Array<() => void> = [];

/** A length the card declares, in millimetres. */
function declared(card: HTMLElement, property: string): number {
  return Number.parseFloat(card.style.getPropertyValue(property));
}

/** How far down the page the card's content area ends. */
function cardBottom(card: HTMLElement): number {
  const height =
    declared(card, "--card-height") -
    declared(card, "--card-margin-top") -
    declared(card, "--card-margin-bottom");

  return height * PIXELS_PER_MILLIMETRE;
}

/** How far down the page the text on the card reaches. */
function textBottom(card: HTMLElement): number {
  const fontSize = declared(card, "--card-font-size");
  const width =
    declared(card, "--card-width") -
    declared(card, "--card-margin-left") -
    declared(card, "--card-margin-right");
  const perLine = Math.max(
    1,
    Math.floor(width / (fontSize * CHARACTER_WIDTH_RATIO)),
  );
  const lines = Math.ceil((card.textContent ?? "").length / perLine);

  return lines * fontSize * LINE_HEIGHT_RATIO * PIXELS_PER_MILLIMETRE;
}

/** Rectangles for every card and its children, from the geometry each sets. */
function stubRectangles(): void {
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function stubbed(
    this: Element,
  ): DOMRect {
    const card = this.closest("article");

    if (card === null) {
      return new DOMRect(0, 0, 0, 0);
    }

    // A rect starting at the top of the page, so its height is its bottom.
    const bottom =
      this === card ? cardBottom(card) : textBottom(card);

    return new DOMRect(0, 0, 0, bottom);
  };

  restores.push(() => {
    Element.prototype.getBoundingClientRect = original;
  });
}

/** Enough of a `ResizeObserver` for a card that only ever observes one box. */
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
 * The set's cards, mounted for real so the measurement runs.
 *
 * Awaited, because the measurement happens in a microtask just after the
 * commit rather than inside it: React will not render a card of its own while
 * it is in the middle of one.
 */
async function renderSet(options: {
  card: Card;
  layout?: CardLayout;
}): Promise<{ cards: HTMLElement[]; unmount: () => void }> {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      <CardSetView
        card={options.card}
        layout={options.layout ?? layout}
      />,
    );
  });

  return {
    cards: [...container.querySelectorAll("article")],
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

/** Everything the reader sees across a set, as one run of text. */
function textOf(cards: readonly HTMLElement[]): string {
  return cards.map((card) => card.textContent ?? "").join(" ");
}

/** How many times `phrase` occurs in `text`. */
function occurrences(text: string, phrase: string): number {
  return text.split(phrase).length - 1;
}

/** The first and last sentence of a card's body, as they read. */
function ends(card: Card): [string, string] {
  const sentences = new CardModel({ card }).bodyText
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 0);

  return [sentences[0] ?? "", sentences.at(-1) ?? ""];
}

const layout = CardLayout.default();

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

describe("CardSetView", () => {
  it("renders one card, with no position on it, for an entry that fits", async () => {
    stubResizeObserver();
    stubRectangles();

    const { cards, unmount } = await renderSet({ card: settledCard });

    expect(cards).toHaveLength(1);
    expect(textOf(cards)).not.toContain("1/1");
    unmount();
  });

  it("splits an entry that will not fit into two numbered cards", async () => {
    stubResizeObserver();
    stubRectangles();

    const { cards, unmount } = await renderSet({
      card: overflowingCard,
    });

    expect(cards).toHaveLength(2);
    expect(cards[0]?.textContent).toContain("1/2");
    expect(cards[1]?.textContent).toContain("2/2");
    unmount();
  });

  it("keeps the name on the continuation and the stat block off it", async () => {
    stubResizeObserver();
    stubRectangles();

    const { cards, unmount } = await renderSet({
      card: overflowingCard,
    });
    const continuation = cards[1];

    expect(continuation?.textContent).toContain("Watchman's Lantern");
    expect(continuation?.querySelector("dl")).toBeNull();
    expect(continuation?.textContent).not.toContain("Rarity");
    unmount();
  });

  it("carries every word across the split, once each", async () => {
    stubResizeObserver();
    stubRectangles();

    const { cards, unmount } = await renderSet({
      card: overflowingCard,
    });
    const text = textOf(cards);

    for (const sentence of ends(overflowingCard)) {
      expect(occurrences(text, sentence)).toBe(1);
    }

    unmount();
  });

  it("splits differently when the card is cut to another size", async () => {
    stubResizeObserver();
    stubRectangles();

    // Nothing about the card changes, only the geometry it is laid out at.
    const { cards, unmount } = await renderSet({
      card: overflowingCard,
      layout: layout.with({
        size: { widthMillimetres: 40, heightMillimetres: 56 },
      }),
    });

    expect(cards.length).toBeGreaterThan(2);
    unmount();
  });

  it("measures every card in one off-page card rather than building another", async () => {
    stubResizeObserver();
    stubRectangles();

    const split = await renderSet({ card: overflowingCard });
    const whole = await renderSet({ card: settledCard });

    const frames = document.body.querySelectorAll(
      ':scope > div[aria-hidden="true"]',
    );

    expect(frames).toHaveLength(1);
    // Emptied when a search finishes, so it holds no card between them.
    expect(frames[0]?.querySelector("article")).toBeNull();

    split.unmount();
    whole.unmount();
  });

  it("renders sample cards the model accepts", () => {
    const cards = Object.values(setViewFixtures);

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(CardModel.validate(card)).toEqual([]);
    }
  });
});
