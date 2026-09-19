import { useEffect, useState } from "react";

import {
  CARD_FONT_SIZE_PROPERTY,
  FIT_TOLERANCE_PIXELS,
} from "./CardFace.constants";
import type { UseFittedFontSizeOptions } from "./CardFace.types";

/** A computed length in pixels, or nothing when the browser reports none. */
function pixels(value: string): number {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Whether everything the card holds sits inside it.
 *
 * Measured as rectangles rather than by reading `scrollHeight`. The card is
 * `overflow: visible` and therefore has no scrolling box, and for such a box
 * the CSSOM View spec allows `scrollHeight` to report the padding box height,
 * which would make the comparison always true and the fitting silently do
 * nothing. Chromium and Gecko both compute the overflow area anyway, but that
 * is their choice rather than a promise, and `getBoundingClientRect` is
 * specified the same way everywhere.
 *
 * Every child is measured rather than the last one. Their order is the flex
 * container's business, and taking the lowest costs nothing at six children.
 *
 * Exported because splitting a card asks the same question of a candidate
 * card as fitting asks of this one, and one answer to it is enough.
 */
export function contentFitsInside(frame: HTMLElement): boolean {
  const style = getComputedStyle(frame);
  const innerBottom =
    frame.getBoundingClientRect().bottom -
    pixels(style.borderBottomWidth) -
    pixels(style.paddingBottom);

  const bottoms = Array.from(
    frame.children,
    (child) => child.getBoundingClientRect().bottom,
  );

  return Math.max(...bottoms) <= innerBottom + FIT_TOLERANCE_PIXELS;
}

/**
 * The size the card's text is set at, measured rather than guessed.
 *
 * The fitting decision is {@link CardLayout.fittedFontSize}, which is pure and
 * tested on its own. All this does is answer the one question that routine
 * asks, "does it fit at this size", the only way it can be answered honestly:
 * set the size on the real element and read back where the content lands.
 *
 * Starts at the top of the range so the first paint and the server's markup
 * agree, then refines once the element exists. A card that cannot fit even at
 * the floor stays overflowing, because splitting it across a second card is a
 * different routine's decision.
 *
 * Given a `fontSizeMillimetres`, it measures nothing and hands that back. A
 * card of a split set is set at the floor along with the rest of the set, and
 * a candidate being measured for a split is already at the size the question
 * is being asked at.
 *
 * **`card` and `layout` want to be referentially stable.** A new identity is a
 * fresh measurement, and a measurement is around nine style writes each
 * followed by a read, so each one forces that many layouts. Building a layout
 * inside a render, or mapping cards through a transform on every render,
 * re-measures every card on screen each time the parent renders. Hoist them or
 * memoise them; the observer below already covers the card's box changing
 * under a layout that stayed the same.
 */
export function useFittedFontSize({
  layout,
  card,
  frameRef,
  fontSizeMillimetres,
}: UseFittedFontSizeOptions): number {
  const [measuredMillimetres, setMeasuredMillimetres] = useState(
    layout.fontSizeRange.maximumMillimetres,
  );

  useEffect(() => {
    const frame = frameRef.current;

    if (frame === null || fontSizeMillimetres !== undefined) {
      return;
    }

    const measure = () => {
      const fitted = layout.fittedFontSize({
        fits: (candidateMillimetres) => {
          frame.style.setProperty(
            CARD_FONT_SIZE_PROPERTY,
            `${candidateMillimetres}mm`,
          );

          return contentFitsInside(frame);
        },
      });

      // Left set rather than cleaned up, so the card never paints a frame at
      // the size the last measurement happened to try.
      frame.style.setProperty(CARD_FONT_SIZE_PROPERTY, `${fitted}mm`);
      setMeasuredMillimetres(fitted);
    };

    measure();

    // The card's box is fixed by its geometry, so this fires when the layout
    // changes rather than on every measurement. Observing the content instead
    // would feed each candidate size back in as a fresh resize.
    const observer = new ResizeObserver(measure);
    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, [layout, card, frameRef, fontSizeMillimetres]);

  if (fontSizeMillimetres !== undefined) {
    return fontSizeMillimetres;
  }

  return measuredMillimetres;
}
