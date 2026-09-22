import { RichText } from "@ttrpg-cards/text";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { MINIMUM_LABEL_SCALE } from "../CardFace.constants";

import { StatBlock } from "./StatBlock.component";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Restores whatever the stubs below replaced. */
const restores: Array<() => void> = [];

/** A strip of one field, which is all the fit has to look at. */
const FIELDS = [
  { label: RichText.of("Components"), value: RichText.of("V, S") },
];

/**
 * jsdom does no layout, so the label's two widths are stubbed: how much room
 * its cell gives it, and how wide its longest word is. The hook asks for the
 * second by setting `min-content`, which is what tells the two apart.
 */
function stubLabelWidths(widths: {
  cell: number;
  word: number;
}): void {
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function stubbed(
    this: Element,
  ): DOMRect {
    if (!(this instanceof HTMLElement) || this.tagName !== "DT") {
      return new DOMRect(0, 0, 0, 0);
    }

    return new DOMRect(
      0,
      0,
      this.style.width === "min-content" ? widths.word : widths.cell,
      0,
    );
  };

  restores.push(() => {
    Element.prototype.getBoundingClientRect = original;
  });
}

/** Enough of a `ResizeObserver` for a hook that watches one box. */
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

/** The step the strip settled on, as the stylesheet reads it. */
function fittedScale(): number {
  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  act(() => {
    root.render(<StatBlock fields={FIELDS} />);
  });

  const strip = container.querySelector("dl");

  if (strip === null) {
    throw new Error("The strip did not render.");
  }

  const scale = Number.parseFloat(
    strip.style.getPropertyValue("--card-stat-label-scale"),
  );

  act(() => {
    root.unmount();
  });
  container.remove();

  return scale;
}

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

describe("useFittedLabelScale", () => {
  it("leaves a label that fits its cell at the size the reader picked", () => {
    stubResizeObserver();
    stubLabelWidths({ cell: 60, word: 40 });

    expect(fittedScale()).toBe(1);
  });

  /*
   * The board's report: `COMPONENTS` is ten letters, a cell is a quarter of a
   * card, and in a workhorse with wide capitals the word does not fit one. It
   * broke in half rather than being set smaller, which reads as a fault rather
   * than as a label.
   */
  it("steps a label down until its longest word sits on one line", () => {
    stubResizeObserver();
    stubLabelWidths({ cell: 50, word: 60 });

    // Rounded down from (50 - 0.5) / 60, because a word drawn to the last
    // fraction of its cell wraps on the next rounding.
    expect(fittedScale()).toBe(0.82);
  });

  // A label no step could fit is left to wrap and hyphenate instead, which is
  // what the stylesheet still does below the floor.
  it("stops stepping down at the floor", () => {
    stubResizeObserver();
    stubLabelWidths({ cell: 50, word: 500 });

    expect(fittedScale()).toBe(MINIMUM_LABEL_SCALE);
  });
});
