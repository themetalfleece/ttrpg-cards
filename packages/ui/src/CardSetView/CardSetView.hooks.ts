import {
  type Card,
  type CardPosition,
  CardSet,
} from "@ttrpg-cards/card";
import {
  CardFace,
  cardFonts,
  contentFitsInside,
  remeasureWhenFacesLoad,
} from "@ttrpg-cards/ui/CardFace";
import { createElement, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import {
  MEASURING_FRAME_STYLE,
  MEASURING_POSITION,
} from "./CardSetView.constants";
import type {
  CardSetSoFar,
  MeasuredCardSet,
  MeasuringSurface,
  SplitOutcome,
  UseCardSetOptions,
} from "./CardSetView.types";

/** The one off-page card, once something has needed it. */
let surface: MeasuringSurface | undefined;

/**
 * The off-page card every measurement on the page is made in.
 *
 * It holds nothing between measurements, and no two searches interleave,
 * because each runs to completion inside its own microtask. So one node and
 * one React root serve every card: a sheet of a hundred would otherwise
 * allocate a fiber root and a DOM node each, most of them only to be told
 * that the card fits.
 *
 * Built on first use rather than at import, because the module loads on the
 * server too, where there is no document. Rebuilt if the node has been taken
 * out of the page: a detached element has no layout, and measuring against
 * one would answer "it fits" to everything.
 */
function measuringSurface(): MeasuringSurface {
  if (surface !== undefined) {
    if (surface.frame.isConnected) {
      return surface;
    }

    surface.root.unmount();
  }

  const frame = document.createElement("div");

  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, MEASURING_FRAME_STYLE);
  document.body.append(frame);

  surface = { frame, root: createRoot(frame) };

  return surface;
}

/**
 * `card` split across continuations, measured rather than estimated.
 *
 * {@link CardSet.split} knows where a card may be cut and nothing about how
 * tall anything is, so this answers its one question the only honest way:
 * render the candidate as a real card off the side of the page and read back
 * where its content lands. The renders are synchronous, so the whole search
 * happens inside one pass and the reader never sees a candidate.
 *
 * Every candidate is set at the bottom of the layout's range, because a set
 * exists only when the floor was not enough. There is no point asking whether
 * content fits at a size the card has already given up on.
 */
function splitByMeasurement({
  card,
  layout,
  typeface,
}: UseCardSetOptions): SplitOutcome {
  const { frame, root } = measuringSurface();
  // The fonts the candidates were measured in, read off the last one
  // rendered: they all carry the same pairing.
  let fonts: readonly string[] = [];

  const fitsWith = (options: {
    candidate: Card;
    position: CardPosition | undefined;
  }): boolean => {
    flushSync(() => {
      root.render(
        createElement(CardFace, {
          card: options.candidate,
          layout,
          typeface,
          position: options.position,
          fontSizeMillimetres:
            layout.fontSizeRange.minimumMillimetres,
        }),
      );
    });

    const face = frame.querySelector("article");

    if (face === null) {
      return false;
    }

    fonts = cardFonts(face);

    return contentFitsInside(face);
  };

  try {
    // A card that fits whole is a set of one and shows no indicator, so it is
    // asked without one. Every candidate after this one belongs to a set.
    if (fitsWith({ candidate: card, position: undefined })) {
      return { set: CardSet.of(card), fonts };
    }

    return {
      set: CardSet.split({
        card,
        fits: (candidate) =>
          fitsWith({ candidate, position: MEASURING_POSITION }),
      }),
      fonts,
    };
  } finally {
    // Emptied rather than torn down, so the next card measures into the same
    // node instead of building another one.
    flushSync(() => {
      root.render(null);
    });
  }
}

/**
 * The set a card makes at a given geometry, worked out in the browser.
 *
 * Renders as a set of one until the measurement has been made, which is what
 * a card that needs no split will stay as and what the server's markup says.
 * A card or a layout that has changed since falls back to the same, rather
 * than showing a split worked out for something else.
 *
 * Given a `set`, it measures nothing and hands that back. That is for a caller
 * that has already worked one out, such as a sheet that asked what each entry
 * would cost it before deciding how many to lay out.
 *
 * Says whether what it is handing back was measured, because until it was it
 * is only the one card the entry is at least. The faces arrive after the first
 * measurement and change how wide the text runs, so a second measurement lands
 * later and can be smaller than the first: a consumer has to be able to tell
 * that finding from the guess a fresh mount starts with.
 */
export function useCardSet({
  card,
  layout,
  typeface,
  set,
}: UseCardSetOptions): CardSetSoFar {
  const [measured, setMeasured] = useState<
    MeasuredCardSet | undefined
  >(undefined);

  useEffect(() => {
    if (set !== undefined) {
      return;
    }

    let current = true;
    let stopRemeasuring = () => {};

    const split = () => {
      if (!current) {
        return;
      }

      const outcome = splitByMeasurement({ card, layout, typeface });

      setMeasured({ card, layout, typeface, set: outcome.set });

      // The faces the split was measured in are only known once it has been
      // made, so the wait for them is set up here rather than below. It is
      // replaced rather than stacked: a split made in the real faces asks for
      // nothing, so this settles after one round.
      stopRemeasuring();
      stopRemeasuring = remeasureWhenFacesLoad(outcome.fonts, split);
    };

    // Measuring renders cards of its own synchronously, which React refuses
    // while it is in the middle of a commit. A microtask puts the work just
    // after this one, still before the browser has painted anything.
    queueMicrotask(split);

    return () => {
      current = false;
      stopRemeasuring();
    };
  }, [card, layout, typeface, set]);

  // A caller that hands one in has already worked it out, so it is not a
  // stand-in for anything.
  if (set !== undefined) {
    return { set, measured: true };
  }

  if (
    measured?.card === card &&
    measured.layout === layout &&
    measured.typeface === typeface
  ) {
    return { set: measured.set, measured: true };
  }

  return { set: CardSet.of(card), measured: false };
}
