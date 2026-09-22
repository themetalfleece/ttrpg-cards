import {
  CardLayout,
  type Card,
  type CardTypefaceId,
} from "@ttrpg-cards/card";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CardFace } from "./CardFace.component";
import {
  CARD_FONT_SIZE_PROPERTY,
  FIT_TOLERANCE_PIXELS,
} from "./CardFace.constants";
import { contentFitsInside } from "./CardFace.hooks";
import { longBodyCard, spellShapedCard } from "./CardFace.fixtures";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * jsdom does no layout, so the card's box is stubbed: the card's inner edge is
 * a fixed distance down the page and its content reaches as far as the type is
 * large. That is the one relationship the fitting routine relies on.
 *
 * What is under test here is the wiring, that the hook measures, asks the
 * layout, and puts the answer on the card. Whether the search finds the right
 * size is {@link CardLayout.fittedFontSize}'s own tests.
 */
const AVAILABLE_PIXELS = 100;

/** Restores whatever the stubs below replaced. */
const restores: Array<() => void> = [];

/**
 * Rectangles for the card and its children. The card ends at
 * {@link AVAILABLE_PIXELS}; a child reaches `pixelsPerMillimetre` down the
 * page for each millimetre of type the card is currently set at.
 *
 * Taken as a function as well as a number, so a test can widen the content
 * partway through, which is what a wider face does to the same words.
 */
function stubRectangles(
  pixelsPerMillimetre: number | (() => number),
): void {
  const perMillimetre =
    typeof pixelsPerMillimetre === "function"
      ? pixelsPerMillimetre
      : () => pixelsPerMillimetre;
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function stubbed(
    this: Element,
  ): DOMRect {
    const card = this.closest("article");
    const declared =
      card === null
        ? ""
        : card.style.getPropertyValue(CARD_FONT_SIZE_PROPERTY);

    const bottom =
      this === card
        ? AVAILABLE_PIXELS
        : Number.parseFloat(declared) * perMillimetre();

    // A rect starting at the top of the page, so its height is its bottom.
    return new DOMRect(0, 0, 0, bottom);
  };

  restores.push(() => {
    Element.prototype.getBoundingClientRect = original;
  });
}

/**
 * Enough of a `ResizeObserver` for a hook that only ever observes one box, and
 * a way to report a resize the way a browser would.
 */
function stubResizeObserver(): {
  disconnected: () => boolean;
  reportResize: () => void;
} {
  let disconnectedCount = 0;
  const watchers: Array<() => void> = [];

  class StubResizeObserver {
    constructor(callback: () => void) {
      watchers.push(callback);
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {
      disconnectedCount += 1;
    }
  }

  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;
  restores.push(() => {
    globalThis.ResizeObserver = original;
  });

  return {
    disconnected: () => disconnectedCount > 0,
    reportResize: () => {
      for (const watcher of watchers) {
        act(() => {
          watcher();
        });
      }
    },
  };
}

/**
 * A font set whose faces a test can hold back and then land, which is what a
 * browser does to every card on the page and what jsdom has nothing of.
 *
 * `load` is what the card waits on, because it is the question with the
 * pairing in it. It answers when the test lands the faces.
 */
function stubFontSet(): { land: () => void } {
  let loaded = false;
  let land = () => {};
  const arrived = new Promise<void>((resolve) => {
    land = () => {
      loaded = true;
      resolve();
    };
  });

  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      check: () => loaded,
      load: async () => {
        await arrived;

        return [];
      },
      ready: arrived,
    },
  });
  restores.push(() => {
    Reflect.deleteProperty(document, "fonts");
  });

  return { land: () => land() };
}

/** A laid out box the test can move, which jsdom otherwise reports as zero. */
function stubLaidOutHeight(element: HTMLElement): {
  set: (height: number) => void;
} {
  let height = 0;

  Object.defineProperty(element, "offsetHeight", {
    configurable: true,
    get: () => height,
  });

  return {
    set: (next: number) => {
      height = next;
    },
  };
}

/** The card's element, mounted for real so its effects run. */
function renderCard(
  layout: CardLayout,
  typeface?: CardTypefaceId,
): {
  face: HTMLElement;
  setTypeface: (next: CardTypefaceId) => void;
  setCard: (next: Card) => void;
  unmount: () => void;
} {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);
  let drawn = { card: spellShapedCard, typeface };
  const draw = () => {
    act(() => {
      root.render(
        <CardFace
          card={drawn.card}
          layout={layout}
          typeface={drawn.typeface}
        />,
      );
    });
  };

  draw();

  const face = container.querySelector("article");

  if (face === null) {
    throw new Error("The card did not render.");
  }

  return {
    face,
    setTypeface: (next: CardTypefaceId) => {
      drawn = { ...drawn, typeface: next };
      draw();
    },
    setCard: (next: Card) => {
      drawn = { ...drawn, card: next };
      draw();
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

/** The size the card ended up setting its text at. */
function fittedMillimetres(face: HTMLElement): number {
  return Number.parseFloat(
    face.style.getPropertyValue(CARD_FONT_SIZE_PROPERTY),
  );
}

const layout = CardLayout.default();
const { minimumMillimetres, maximumMillimetres } =
  layout.fontSizeRange;

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

describe("useFittedFontSize", () => {
  it("leaves the type at the top of the range when the content already fits", () => {
    stubResizeObserver();
    stubRectangles(1);

    const { face, unmount } = renderCard(layout);

    expect(fittedMillimetres(face)).toBe(maximumMillimetres);
    unmount();
  });

  it("gives up type size when the content is too tall for the card", () => {
    stubResizeObserver();
    // Enough content per millimetre of type that the top of the range spills
    // out of the card, and little enough that somewhere in the range does not.
    const pixelsPerMillimetre = 40;
    stubRectangles(pixelsPerMillimetre);

    const { face, unmount } = renderCard(layout);
    const fitted = fittedMillimetres(face);

    expect(fitted).toBeLessThan(maximumMillimetres);
    expect(fitted).toBeGreaterThanOrEqual(minimumMillimetres);
    expect(fitted * pixelsPerMillimetre).toBeLessThanOrEqual(
      AVAILABLE_PIXELS + FIT_TOLERANCE_PIXELS,
    );
    unmount();
  });

  it("stops at the floor when nothing in the range fits", () => {
    stubResizeObserver();
    stubRectangles(1000);

    const { face, unmount } = renderCard(layout);

    expect(fittedMillimetres(face)).toBe(minimumMillimetres);
    unmount();
  });

  /*
   * A pairing is not a colour: it decides how much of the card the same words
   * take, and the card's box never moves to say so, so nothing else would tell
   * the fit to run again. An entry that fits on one card is the exposed case,
   * because the set it renders from is the object it was handed and its
   * identity does not change either.
   */
  it("fits the card again when the faces under it change", () => {
    stubResizeObserver();
    // Enough content per millimetre that the answer is somewhere inside the
    // range, so a second measurement against a wider face has room to differ.
    let pixelsPerMillimetre = 40;

    stubRectangles(() => pixelsPerMillimetre);

    const { face, setTypeface, unmount } = renderCard(
      layout,
      "rounded",
    );
    const inRounded = fittedMillimetres(face);

    // A wider body face: the same words now take more of the card.
    pixelsPerMillimetre = 80;
    setTypeface("soft");

    expect(fittedMillimetres(face)).toBeLessThan(inRounded);
    unmount();
  });

  /*
   * The screen size control puts a `zoom` above the sheet, and a
   * `ResizeObserver` reports that as a resize even though nothing was laid out
   * differently: the card and everything in it scaled together, and the box it
   * hands back has moved by the rounding of a scaled edge. Measuring again
   * there costs every card on the page a fitting search for an answer that
   * cannot have changed, which is what made the page crawl while the slider
   * was being dragged.
   */
  it("measures again only when the card is really laid out differently", () => {
    const observer = stubResizeObserver();
    let pixelsPerMillimetre = 40;

    stubRectangles(() => pixelsPerMillimetre);

    const { face, unmount } = renderCard(layout);
    const laidOut = stubLaidOutHeight(face);
    const fitted = fittedMillimetres(face);

    // The same box, drawn at another scale. Widening the content proves it
    // never looked: a measurement here would find the new answer.
    pixelsPerMillimetre = 80;
    observer.reportResize();

    expect(fittedMillimetres(face)).toBe(fitted);

    // And a box that really moved, which is what the observer is there for.
    laidOut.set(AVAILABLE_PIXELS);
    observer.reportResize();

    expect(fittedMillimetres(face)).toBeLessThan(fitted);
    unmount();
  });

  /*
   * The band is as tall as the title makes it, so a name that took a second
   * line leaves the body less room than it was last measured against. Watching
   * the band is what catches that: the card's own box never moves, because a
   * card is cut to a size.
   */
  it("fits the card again when the band grows over it", () => {
    const observer = stubResizeObserver();
    let pixelsPerMillimetre = 40;

    stubRectangles(() => pixelsPerMillimetre);

    const { face, unmount } = renderCard(layout);
    const band = face.querySelector("header");

    if (band === null) {
      throw new Error("The card drew no band");
    }

    const laidOut = stubLaidOutHeight(band);
    const fitted = fittedMillimetres(face);

    pixelsPerMillimetre = 80;
    laidOut.set(AVAILABLE_PIXELS / 2);
    observer.reportResize();

    expect(fittedMillimetres(face)).toBeLessThan(fitted);
    unmount();
  });

  /*
   * Every face swaps in after the page has drawn, so a card that has never
   * been measured has to be fitted in the fallback: an unfitted card is worse
   * than one fitted to the wrong face. A card that already carries a size does
   * not, and fitting it to a face it is about to stop being drawn in is a full
   * search for an answer that is thrown away a moment later.
   */
  it("waits for a face rather than fitting to the one it is leaving", async () => {
    stubResizeObserver();

    const faces = stubFontSet();
    let pixelsPerMillimetre = 40;

    stubRectangles(() => pixelsPerMillimetre);

    const { face, setTypeface, unmount } = renderCard(
      layout,
      "rounded",
    );
    const inFallback = fittedMillimetres(face);

    expect(inFallback).toBeLessThan(maximumMillimetres);

    // Another pairing, whose faces are not there yet. The card keeps the size
    // it has: widening the content proves nothing measured it.
    pixelsPerMillimetre = 80;
    setTypeface("soft");

    expect(fittedMillimetres(face)).toBe(inFallback);

    await act(async () => {
      faces.land();
    });

    expect(fittedMillimetres(face)).toBeLessThan(inFallback);
    unmount();
  });

  /*
   * The other half of that rule. A size is only an answer about the content it
   * was measured against, so a card that has been handed different content has
   * nothing worth holding on to and is fitted now, whatever face it is drawn
   * in meanwhile. Waiting there would leave the new content overflowing.
   */
  it("fits new content at once, even while a face is still coming", () => {
    stubResizeObserver();
    stubFontSet();

    let pixelsPerMillimetre = 40;

    stubRectangles(() => pixelsPerMillimetre);

    const { face, setCard, unmount } = renderCard(layout, "rounded");
    const fitted = fittedMillimetres(face);

    pixelsPerMillimetre = 80;
    setCard(longBodyCard);

    expect(fittedMillimetres(face)).toBeLessThan(fitted);
    unmount();
  });

  it("stops watching the card when it goes away", () => {
    const observer = stubResizeObserver();
    stubRectangles(1);

    const { unmount } = renderCard(layout);

    expect(observer.disconnected()).toBe(false);
    unmount();
    expect(observer.disconnected()).toBe(true);
  });
});

/**
 * A card whose box and content are stubbed, drawn at `scale` by something
 * above it: the rectangles come back scaled, the computed lengths do not, and
 * `offsetHeight` stays in laid out pixels. That is what a browser reports
 * under a `zoom` or a `transform`, measured rather than assumed.
 */
function stubbedCard(options: {
  scale: number;
  contentHeight: number;
}): HTMLElement {
  const cardHeight = 100;
  const paddingBottom = 10;
  const card = document.createElement("article");

  card.style.paddingBottom = `${paddingBottom}px`;

  const child = document.createElement("div");

  card.append(child);
  document.body.append(card);

  Object.defineProperty(card, "offsetHeight", {
    configurable: true,
    value: cardHeight,
  });
  card.getBoundingClientRect = () =>
    new DOMRect(0, 0, 0, cardHeight * options.scale);
  child.getBoundingClientRect = () =>
    new DOMRect(0, 0, 0, options.contentHeight * options.scale);

  restores.push(() => {
    card.remove();
  });

  return card;
}

describe("contentFitsInside", () => {
  // The room a card has is the same room whatever size it is drawn at, so the
  // answer has to be too. Subtracting an unscaled padding from a scaled edge
  // would hand a scaled up card room it does not have and overflow it.
  it("gives the same answer however the card is being drawn", () => {
    for (const scale of [1, 1.4, 2.5, 0.75]) {
      expect(
        contentFitsInside(stubbedCard({ scale, contentHeight: 80 })),
      ).toBe(true);
      expect(
        contentFitsInside(stubbedCard({ scale, contentHeight: 95 })),
      ).toBe(false);
    }
  });

  it("treats a card with no laid out height as unscaled", () => {
    const card = document.createElement("article");

    document.body.append(card);
    card.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
    restores.push(() => {
      card.remove();
    });

    expect(contentFitsInside(card)).toBe(true);
  });
});
