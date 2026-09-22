// Working out whether an entry needs a second card means measuring it, so
// this runs in the browser rather than only on the server.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import { CardFace } from "@ttrpg-cards/ui/CardFace";
import clsx from "clsx";

import { useCardSet } from "./CardSetView.hooks";
import styles from "./CardSetView.module.css";
import type { CardSetViewProps } from "./CardSetView.types";

/**
 * One entry on its own, laid out across as many cards as its content needs.
 *
 * For a set read as a set: a preview, a story, one entry shown beside its
 * continuations. A sheet does not use it, because a sheet places cards rather
 * than entries and an entry's cards may land on two different sheets, so
 * nothing there holds a set together. `useCardSet` is the part a sheet takes.
 *
 * Most entries are one card, and this renders exactly what a card face would.
 * An entry that will not fit at the bottom of the layout's range is split
 * instead of cut: the cards come back in reading order, each showing where it
 * sits.
 *
 * Every card of a set then takes the largest size its own content allows. The
 * split is settled first, at the floor, and nothing after it moves content
 * between cards, so each face measuring itself only changes type size. A
 * continuation carrying two sentences is set large rather than left at the
 * floor in a mostly empty card, and the chrome does not move with it, so the
 * cards still read as one entry.
 *
 * Handed a `set`, it draws that one and measures nothing, which is what a
 * caller that has already worked the split out wants.
 */
export function CardSetView({
  card,
  layout,
  theme,
  typeface,
  set,
  className,
}: CardSetViewProps) {
  const { set: cardSet } = useCardSet({
    card,
    layout,
    typeface,
    set,
  });

  return (
    <Box className={clsx(styles.set, className)}>
      {cardSet.faces.map((face) => (
        <CardFace
          key={face.card.id}
          card={face.card}
          layout={layout}
          position={face.position}
          theme={theme}
          typeface={typeface}
        />
      ))}
    </Box>
  );
}
