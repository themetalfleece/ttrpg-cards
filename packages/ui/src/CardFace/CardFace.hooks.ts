import { millimetres } from "@ttrpg-cards/core";
import { useEffect, useRef, useState } from "react";

import {
  CARD_FONT_SIZE_PROPERTY,
  CARD_NAME_SCALE_PROPERTY,
  CARD_NAME_SELECTOR,
  FIT_TOLERANCE_PIXELS,
  MINIMUM_NAME_SCALE,
  NAME_FIT_TOLERANCE_PIXELS,
  NAME_SCALE_PRECISION,
} from "./CardFace.constants";
import type {
  FittedFor,
  NameFit,
  UseFittedFontSizeOptions,
  UseFittedNameScaleOptions,
} from "./CardFace.types";

/** What a title is set at before anything has measured it. */
const UNFITTED_NAME: NameFit = { scale: 1, wraps: false };

/** A computed length in pixels, or nothing when the browser reports none. */
function pixels(value: string): number {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The document's font set, where the environment has one.
 *
 * Typed as always present, and absent in a test runner's DOM, which is where a
 * bare read would throw. Nothing to wait for is a perfectly good answer: a DOM
 * with no font set never swaps a face in either.
 */
function fontSet(): FontFaceSet | undefined {
  return (document as Partial<Document>).fonts;
}

/**
 * The font `element`'s text is set in, written the way a font set matches one.
 *
 * Built from the computed style rather than from what the card was handed,
 * because what a pairing resolves to is the stylesheet's answer.
 */
export function fontOf(element: HTMLElement): string {
  const style = getComputedStyle(element);

  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

/**
 * The fonts a card is drawn in: the workhorse it sets its text in, and the
 * display face its title carries. Either one arriving late changes how much of
 * the card the same words take.
 */
export function cardFonts(frame: HTMLElement): readonly string[] {
  const name = frame.querySelector(CARD_NAME_SELECTOR);

  return name instanceof HTMLElement
    ? [fontOf(frame), fontOf(name)]
    : [fontOf(frame)];
}

/**
 * Whether the browser already has every font in `fonts`, meaning nothing is
 * going to arrive and change the shape of the text they are set in.
 *
 * True where there is no font set to ask, which is a test runner's DOM: an
 * environment that loads no faces never swaps one in either, so what the text
 * is drawn in now is what it stays in. A font the set cannot parse counts as
 * still coming, which costs a measurement rather than an exception.
 */
export function fontsAreLoaded(fonts: readonly string[]): boolean {
  const faces = fontSet();

  if (faces === undefined) {
    return true;
  }

  return fonts.every((font) => {
    try {
      return faces.check(font);
    } catch {
      return false;
    }
  });
}

/** Whether every face a card is drawn in is already on the page. */
export function cardFacesAreLoaded(frame: HTMLElement): boolean {
  return fontsAreLoaded(cardFonts(frame));
}

/**
 * Runs `measure` again once the browser really has `fonts`, and hands back
 * what stops that landing after the caller has gone away. Nothing is scheduled
 * when they are all there already, because a face cannot arrive twice.
 *
 * Every face is declared `font-display: swap`, so a first measurement happens
 * in the fallback and the real face arrives afterwards. Nothing else would
 * notice: a card's box is fixed by its layout, so an observer on it never
 * fires when the text inside changes shape. Left at one measurement the card
 * would be fitted for a face it is not wearing, and an entry would split in
 * one place or another depending on whether the reader had the font cached.
 *
 * **The fonts are asked for by name rather than waited on through
 * `document.fonts.ready`.** That promise is for the loading already under way,
 * and a pairing the reader has just picked has not been asked for at the
 * moment the measurement runs: the promise is long resolved, so it fires
 * immediately, the card is measured in the fallback a second time, and nothing
 * ever corrects it. Asking the font set to load these fonts is the question
 * that has the pairing in it, and it answers at once when the face is there.
 *
 * `font-display: optional` is the other way out, which never swaps and so
 * never lies, but it also means a first visit is set in the fallback and
 * printed in it, which is worse for a tool whose output is paper.
 */
export function remeasureWhenFacesLoad(
  fonts: readonly string[],
  measure: () => void,
): () => void {
  const faces = fontSet();
  let live = true;

  if (faces !== undefined && !fontsAreLoaded(fonts)) {
    void Promise.all(fonts.map((font) => faces.load(font)))
      .then(() => {
        if (live) {
          measure();
        }
      })
      // A face that never arrives leaves the measurement where it is, which
      // is the fallback it was made in. There is nothing better to do with it.
      .catch(() => undefined);
  }

  return () => {
    live = false;
  };
}

/** A box as it was laid out, which is what does not move under a scale. */
interface LaidOutSize {
  readonly width: number;
  readonly height: number;
}

/**
 * `element`'s box in whole pixels.
 *
 * `offsetWidth` and `offsetHeight` rather than a rectangle, because a `zoom`
 * or a transform above the card scales what `getBoundingClientRect` reports
 * and leaves these alone. A real change smaller than a pixel goes unnoticed,
 * and a card cut in millimetres has nothing that moves by less than one.
 */
function laidOutSize(element: HTMLElement): LaidOutSize {
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
}

/**
 * Runs `measure` when any of `elements` is really laid out differently, and
 * never for the same boxes drawn at another scale.
 *
 * The screen size control draws the sheet at the reader's scale, and a
 * `ResizeObserver` reports that as a resize anyway: the box it hands back
 * moves by a hundredth of a pixel, which is the rounding of a scaled edge.
 * Believing it re-measures every card on the page each time the reader nudges
 * that control, at around nine forced layouts a card, for an answer that
 * cannot have changed, because the card and everything inside it are drawn at
 * one scale together.
 *
 * One observer over the whole set rather than one each, because a browser
 * hands every box that changed to a single callback: a card that was made
 * wider moved its band with it, and that is one thing to measure again rather
 * than two.
 *
 * Read back after measuring rather than before, because measuring is what
 * changes the boxes: a title that wrapped is taller than the one that was
 * measured.
 */
function observeLaidOutSize(
  elements: readonly HTMLElement[],
  measure: () => void,
): ResizeObserver {
  const sizes = new Map(
    elements.map((element) => [element, laidOutSize(element)]),
  );
  const moved = () =>
    elements.some((element) => {
      const size = laidOutSize(element);
      const seen = sizes.get(element);

      return (
        size.width !== seen?.width || size.height !== seen.height
      );
    });

  const observer = new ResizeObserver(() => {
    if (!moved()) {
      return;
    }

    measure();

    for (const element of elements) {
      sizes.set(element, laidOutSize(element));
    }
  });

  for (const element of elements) {
    observer.observe(element);
  }

  return observer;
}

/**
 * Keeps a measurement in step with everything that can change its answer, and
 * hands back the one call that stops all of it.
 *
 * Two things can, and a card's fit and a title's fit answer to both: the faces
 * the text is really set in arriving after the first paint, and a box the
 * measurement was made against being laid out differently. Wiring them
 * together here is what keeps the two hooks below about what they measure
 * rather than about when.
 */
export function remeasureWhenAnythingMoves(options: {
  /** What to run again, which is the caller's whole measurement. */
  measure: () => void;
  /** The fonts the measurement was made in, as {@link fontOf} writes them. */
  fonts: readonly string[];
  /** The boxes the measurement was made against. */
  boxes: readonly HTMLElement[];
}): () => void {
  const { measure } = options;
  const stopRemeasuring = remeasureWhenFacesLoad(
    options.fonts,
    measure,
  );
  const observer = observeLaidOutSize(options.boxes, measure);

  return () => {
    stopRemeasuring();
    observer.disconnect();
  };
}

/**
 * How much an ancestor is drawing this card larger or smaller than it is laid
 * out, which is 1 when nothing is.
 *
 * A `zoom` or a `transform` above the card scales what
 * `getBoundingClientRect` reports but leaves the computed lengths alone, so
 * mixing the two below would subtract an unscaled padding from a scaled edge
 * and hand the card room it does not have. `offsetHeight` stays in laid out
 * pixels under both, which is what makes it the honest denominator.
 *
 * Falls back to 1 where there is nothing to divide, which is what a layout
 * engine that reports no offset height gives.
 */
function renderedScale(frame: HTMLElement): number {
  const { height } = frame.getBoundingClientRect();
  const laidOut = frame.offsetHeight;

  if (laidOut <= 0 || height <= 0) {
    return 1;
  }

  return height / laidOut;
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
 * The whole comparison happens in drawn pixels, so the computed lengths and
 * the tolerance are scaled to meet the rectangles rather than the other way
 * round. That is what lets a consumer draw the card at another size without
 * quietly changing what fits on it.
 *
 * Exported because splitting a card asks the same question of a candidate
 * card as fitting asks of this one, and one answer to it is enough.
 */
export function contentFitsInside(frame: HTMLElement): boolean {
  const style = getComputedStyle(frame);
  const scale = renderedScale(frame);
  const innerBottom =
    frame.getBoundingClientRect().bottom -
    scale *
      (pixels(style.borderBottomWidth) + pixels(style.paddingBottom));

  const bottoms = Array.from(
    frame.children,
    (child) => child.getBoundingClientRect().bottom,
  );

  return (
    Math.max(...bottoms) <= innerBottom + scale * FIT_TOLERANCE_PIXELS
  );
}

/** Whether the title sits on one line inside the band. */
function nameFitsOnOneLine(name: HTMLElement): boolean {
  return (
    name.scrollWidth <= name.clientWidth + NAME_FIT_TOLERANCE_PIXELS
  );
}

/**
 * How far the title has to step down to sit on one line in the band.
 *
 * This is the card's one piece of fitted chrome, and it is fitted for its own
 * reason: a long name is a property of the name, not of how much body text the
 * card is carrying. Nothing here touches the body size, and the body fit does
 * not touch this.
 *
 * The search halves the range rather than stepping down it, the same way the
 * body fit does, because every answer costs a layout. A title that will not
 * fit even at the smallest step gets a second line instead, which reads better
 * than type small enough to fit anything.
 *
 * The stylesheet holds the result to the layout's floor as well, so a card cut
 * small cannot end up with a title below the size the reader picked as legible.
 */
export function useFittedNameScale({
  layout,
  card,
  typeface,
  nameRef,
}: UseFittedNameScaleOptions): NameFit {
  const [fit, setFit] = useState<NameFit>(UNFITTED_NAME);

  useEffect(() => {
    const name = nameRef.current;

    if (name === null) {
      return;
    }

    // Kept identical when nothing moved. A fresh object would be a new
    // dependency for the body fit below, which would resize the card, which
    // would bring the observer here straight back round.
    const settle = (next: NameFit) => {
      setFit((current) =>
        current.scale === next.scale && current.wraps === next.wraps
          ? current
          : next,
      );
    };

    const measure = () => {
      const applied = (scale: number) => {
        name.style.setProperty(
          CARD_NAME_SCALE_PROPERTY,
          String(scale),
        );

        return nameFitsOnOneLine(name);
      };

      if (applied(1)) {
        name.style.removeProperty(CARD_NAME_SCALE_PROPERTY);
        settle(UNFITTED_NAME);

        return;
      }

      let smallest = MINIMUM_NAME_SCALE;
      let largest = 1;
      let best: number | undefined = applied(MINIMUM_NAME_SCALE)
        ? MINIMUM_NAME_SCALE
        : undefined;

      while (
        best !== undefined &&
        largest - smallest > NAME_SCALE_PRECISION
      ) {
        const candidate = (smallest + largest) / 2;

        if (applied(candidate)) {
          best = candidate;
          smallest = candidate;
          continue;
        }

        largest = candidate;
      }

      // Left set rather than cleaned up, so the title never paints a frame at
      // the size the last candidate happened to try.
      const scale = best ?? MINIMUM_NAME_SCALE;

      name.style.setProperty(CARD_NAME_SCALE_PROPERTY, String(scale));
      settle({ scale, wraps: best === undefined });
    };

    measure();

    // The title's box is as wide as the card, so watching it catches the
    // geometry changing rather than firing on every candidate.
    return remeasureWhenAnythingMoves({
      measure,
      fonts: [fontOf(name)],
      boxes: [name],
    });
    // `typeface` is a dependency because a face decides how wide the name
    // runs, and neither the name's box nor the card's moves when one swaps.
  }, [layout, card, typeface, nameRef]);

  return fit;
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
 * Given a `fontSizeMillimetres`, it measures nothing and hands that back. That
 * is for a candidate being measured for a split, which is already at the size
 * the question is being asked at.
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
  typeface,
  frameRef,
  bandRef,
  fontSizeMillimetres,
}: UseFittedFontSizeOptions): number {
  const [measuredMillimetres, setMeasuredMillimetres] = useState(
    layout.fontSizeRange.maximumMillimetres,
  );
  // What the size the card is already carrying was measured for, which is what
  // decides whether holding on to it while a face lands is honest.
  const fittedFor = useRef<FittedFor | undefined>(undefined);

  useEffect(() => {
    const frame = frameRef.current;

    if (frame === null || fontSizeMillimetres !== undefined) {
      return;
    }

    const measure = () => {
      fittedFor.current = { card, layout };

      const fitted = layout.fittedFontSize({
        fits: (candidateMillimetres) => {
          frame.style.setProperty(
            CARD_FONT_SIZE_PROPERTY,
            millimetres(candidateMillimetres),
          );

          return contentFitsInside(frame);
        },
      });

      // Left set rather than cleaned up, so the card never paints a frame at
      // the size the last measurement happened to try.
      frame.style.setProperty(
        CARD_FONT_SIZE_PROPERTY,
        millimetres(fitted),
      );
      setMeasuredMillimetres(fitted);
    };

    /*
     * A fit measured in a face the card is not set in is worth making only
     * when there is nothing better to show. On a first draw that is the case
     * and the card is fitted twice, once in the fallback and once in the face
     * that lands after it. When the reader has only changed the pairing it is
     * not: the card already carries a size measured for this content at this
     * geometry, the swap is a moment away, and fitting it to a face it is
     * about to stop being drawn in is a full search thrown away.
     *
     * Held to this card and this layout, because a size measured for other
     * content or another card size says nothing about what is on the card now,
     * and waiting on it would leave the card overflowing while it waits.
     */
    const carriesItsOwnSize =
      fittedFor.current?.card === card &&
      fittedFor.current.layout === layout;

    if (!carriesItsOwnSize || cardFacesAreLoaded(frame)) {
      measure();
    }

    /*
     * The card's box is fixed by its geometry, so watching it catches the
     * layout changing rather than firing on every measurement. Watching the
     * content instead would feed each candidate size back in as a fresh
     * resize.
     *
     * The band is the exception, and it is watched for what it leaves: a
     * title that took a second line pushes the body down, and the room it
     * left is what was measured against. It cannot feed back, because every
     * length in the band comes off the size the reader picked rather than the
     * size the body settled at.
     */
    const band = bandRef.current;

    return remeasureWhenAnythingMoves({
      measure,
      fonts: cardFonts(frame),
      boxes: band === null ? [frame] : [frame, band],
    });
    // `typeface` is a dependency because a face decides how much of the card
    // the same words take, and the card's box never moves to say so.
  }, [
    layout,
    card,
    typeface,
    frameRef,
    bandRef,
    fontSizeMillimetres,
  ]);

  if (fontSizeMillimetres !== undefined) {
    return fontSizeMillimetres;
  }

  return measuredMillimetres;
}
