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
 * One entry, laid out across as many cards as its content needs.
 *
 * Most entries are one card, and this renders exactly what a card face would.
 * An entry that will not fit at the bottom of the layout's range is split
 * instead of cut: the cards come back in reading order, each showing where it
 * sits, and the set stays together.
 *
 * A split set is set at the bottom of the range throughout. The split happened
 * because the floor was not enough, so the first card is at the floor by
 * definition, and letting a shorter continuation grow would set one entry in
 * two sizes.
 */
export function CardSetView({
  card,
  layout,
  theme,
  className,
}: CardSetViewProps) {
  const set = useCardSet({ card, layout });
  const fontSizeMillimetres = set.isSplit
    ? layout.fontSizeRange.minimumMillimetres
    : undefined;

  return (
    <Box className={clsx(styles.set, className)}>
      {set.faces.map((face) => (
        <CardFace
          key={face.card.id}
          card={face.card}
          layout={layout}
          position={face.position}
          theme={theme}
          fontSizeMillimetres={fontSizeMillimetres}
        />
      ))}
    </Box>
  );
}
