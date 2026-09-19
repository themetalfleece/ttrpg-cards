import { CardLayout } from "@ttrpg-cards/card";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CardFace } from "./CardFace.component";
import {
  CARD_FONT_SIZE_PROPERTY,
  FIT_TOLERANCE_PIXELS,
} from "./CardFace.constants";
import { spellShapedCard } from "./CardFace.fixtures";

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
 */
function stubRectangles(pixelsPerMillimetre: number): void {
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
        : Number.parseFloat(declared) * pixelsPerMillimetre;

    // A rect starting at the top of the page, so its height is its bottom.
    return new DOMRect(0, 0, 0, bottom);
  };

  restores.push(() => {
    Element.prototype.getBoundingClientRect = original;
  });
}

/** Enough of a `ResizeObserver` for a hook that only ever observes one box. */
function stubResizeObserver(): { disconnected: () => boolean } {
  let disconnectedCount = 0;

  class StubResizeObserver {
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

  return { disconnected: () => disconnectedCount > 0 };
}

/** The card's element, mounted for real so its effects run. */
function renderCard(layout: CardLayout): {
  face: HTMLElement;
  unmount: () => void;
} {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);

  act(() => {
    root.render(<CardFace card={spellShapedCard} layout={layout} />);
  });

  const face = container.querySelector("article");

  if (face === null) {
    throw new Error("The card did not render.");
  }

  return {
    face,
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

  it("stops watching the card when it goes away", () => {
    const observer = stubResizeObserver();
    stubRectangles(1);

    const { unmount } = renderCard(layout);

    expect(observer.disconnected()).toBe(false);
    unmount();
    expect(observer.disconnected()).toBe(true);
  });
});
