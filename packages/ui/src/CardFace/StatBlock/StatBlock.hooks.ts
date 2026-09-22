import { useEffect } from "react";

import {
  CARD_STAT_LABEL_SCALE_PROPERTY,
  MINIMUM_LABEL_SCALE,
} from "../CardFace.constants";
import {
  fontOf,
  remeasureWhenAnythingMoves,
} from "../CardFace.hooks";

import type { UseFittedLabelScaleOptions } from "./StatBlock.types";

/** The labels, which are the `dt` of the strip's list by definition. */
const LABEL_SELECTOR = "dt";

/** How finely the step is rounded, and always downwards. */
const LABEL_SCALE_PRECISION = 100;

/**
 * How much of its cell a label leaves rather than filling it exactly.
 *
 * A word drawn to the last fraction of the width available to it wraps on the
 * next rounding, and a card redrawn at another scale rounds differently.
 */
const LABEL_FIT_MARGIN_PIXELS = 0.5;

/**
 * Steps the strip's labels down until the longest word in each sits on one
 * line in its cell.
 *
 * A label is chrome and takes the size the reader picked. This moves it, for
 * the same reason the title moves: how wide a word is, is a property of the
 * word and of the face it is set in rather than of how much text the card is
 * carrying. A cell is a quarter of a card, and `COMPONENTS` in a workhorse
 * with wide capitals does not fit one at the size the rest of the chrome is
 * set at. What gives otherwise is the word breaking in half.
 *
 * Every label on the strip takes the same step, because a row of labels set at
 * four different sizes reads as a mistake rather than as a fit.
 *
 * One pass rather than a search: text is as wide as the size it is set at, so
 * the step is the narrowest cell over the widest word it has to hold. The
 * width of that word is what `min-content` means, which is why it is asked for
 * directly rather than searched for, and hyphenation is turned off while it is
 * asked so a face that can break the word does not answer with half of one.
 *
 * The stylesheet holds the answer to the layout's legibility floor, where a
 * label that still does not fit wraps and hyphenates as it used to.
 */
export function useFittedLabelScale({
  fields,
  typeface,
  stripRef,
}: UseFittedLabelScaleOptions): void {
  useEffect(() => {
    const strip = stripRef.current;

    if (strip === null) {
      return;
    }

    const measure = () => {
      const labels = [
        ...strip.querySelectorAll<HTMLElement>(LABEL_SELECTOR),
      ];

      // Read and written in two passes rather than label by label, so the
      // whole strip costs two layouts instead of two each.
      strip.style.setProperty(CARD_STAT_LABEL_SCALE_PROPERTY, "1");

      const cells = labels.map(
        (label) => label.getBoundingClientRect().width,
      );

      for (const label of labels) {
        label.style.hyphens = "none";
        label.style.width = "min-content";
      }

      const words = labels.map(
        (label) => label.getBoundingClientRect().width,
      );

      for (const label of labels) {
        label.style.hyphens = "";
        label.style.width = "";
      }

      // Measured as rectangles rather than as whole pixels, because a word
      // one part of a pixel wider than its cell wraps for that part, and
      // rounded widths cannot see it. Both are drawn at the same scale, so
      // whatever a surface above is drawing the card at cancels out.
      const fits = labels.reduce((narrowest, _, index) => {
        const cell = (cells[index] ?? 0) - LABEL_FIT_MARGIN_PIXELS;
        const word = words[index] ?? 0;

        if (cell <= 0 || word <= cell) {
          return narrowest;
        }

        return Math.min(narrowest, cell / word);
      }, 1);

      // Rounded down, because a step that leaves the word a fraction of a
      // pixel wider than its cell breaks it for that fraction.
      const stepped =
        Math.floor(fits * LABEL_SCALE_PRECISION) /
        LABEL_SCALE_PRECISION;

      strip.style.setProperty(
        CARD_STAT_LABEL_SCALE_PROPERTY,
        String(Math.max(MINIMUM_LABEL_SCALE, stepped)),
      );
    };

    measure();

    // The cells are as wide as the card, so watching the strip catches the
    // geometry changing. A step down cannot feed back into it: the cells are
    // equal fractions of the card and hold their width whatever is in them.
    return remeasureWhenAnythingMoves({
      measure,
      fonts: [fontOf(strip)],
      boxes: [strip],
    });
    // `typeface` is a dependency because a face decides how wide a word runs,
    // and the strip's own box never moves to say so.
  }, [fields, typeface, stripRef]);
}
