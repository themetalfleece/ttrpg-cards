import {
  type Card,
  type CardPosition,
  CardSet,
} from "@ttrpg-cards/card";
import {
  CardFace,
  contentFitsInside,
} from "@ttrpg-cards/ui/CardFace";
import { createElement, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import {
  MEASURING_FRAME_STYLE,
  MEASURING_POSITION,
} from "./CardSetView.constants";
import type {
  MeasuredCardSet,
  MeasuringSurface,
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
}: UseCardSetOptions): CardSet {
  const { frame, root } = measuringSurface();

  const fitsWith = (options: {
    candidate: Card;
    position: CardPosition | undefined;
  }): boolean => {
    flushSync(() => {
      root.render(
        createElement(CardFace, {
          card: options.candidate,
          layout,
          position: options.position,
          fontSizeMillimetres:
            layout.fontSizeRange.minimumMillimetres,
        }),
      );
    });

    const face = frame.querySelector("article");

    return face !== null && contentFitsInside(face);
  };

  try {
    // A card that fits whole is a set of one and shows no indicator, so it is
    // asked without one. Every candidate after this one belongs to a set.
    if (fitsWith({ candidate: card, position: undefined })) {
      return CardSet.of(card);
    }

    return CardSet.split({
      card,
      fits: (candidate) =>
        fitsWith({ candidate, position: MEASURING_POSITION }),
    });
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
 */
export function useCardSet({
  card,
  layout,
  set,
}: UseCardSetOptions): CardSet {
  const [measured, setMeasured] = useState<
    MeasuredCardSet | undefined
  >(undefined);

  useEffect(() => {
    if (set !== undefined) {
      return;
    }

    let current = true;

    // Measuring renders cards of its own synchronously, which React refuses
    // while it is in the middle of a commit. A microtask puts the work just
    // after this one, still before the browser has painted anything.
    queueMicrotask(() => {
      if (!current) {
        return;
      }

      setMeasured({
        card,
        layout,
        set: splitByMeasurement({ card, layout }),
      });
    });

    return () => {
      current = false;
    };
  }, [card, layout, set]);

  if (set !== undefined) {
    return set;
  }

  if (measured?.card === card && measured.layout === layout) {
    return measured.set;
  }

  return CardSet.of(card);
}
