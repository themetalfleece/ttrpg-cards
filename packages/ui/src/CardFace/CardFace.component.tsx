// The card measures itself to decide what size its text is set at, so it runs
// in the browser rather than only on the server.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import { RichTextView } from "@ttrpg-cards/ui/RichTextView";
import clsx from "clsx";
import { type CSSProperties, useRef } from "react";

import { BodyBlock } from "./BodyBlock/BodyBlock.component";
import { cardFaceStyle } from "./CardFace.data";
import {
  useFittedFontSize,
  useFittedNameScale,
} from "./CardFace.hooks";
import styles from "./CardFace.module.css";
// The faces, and the palettes and pairings the `data-card-*` attributes below
// select between. Global rather than modules, so they ship wherever a card
// does. The faces come from the package's own font directory, because a
// vendored family is not the card face's to own.
import "@ttrpg-cards/ui/fonts.css";
import "./CardFace.themes.css";
import "./CardFace.typefaces.css";
import type { CardFaceProps } from "./CardFace.types";
import { StatBlock } from "./StatBlock/StatBlock.component";

/**
 * One card, laid out at the geometry it is handed.
 *
 * It takes the card and the layout and nothing else, and it never asks what
 * kind of card it is holding: everything that varies between one kind and
 * another is a meta field, so a spell and a piece of gear go through the same
 * regions in the same order.
 *
 * Top to bottom: a band holding the title, the stat block as a strip of cells
 * under it, the body, and a footer rule. The band reserves the same width at
 * each end whether or not anything sits there, so the title is centred on the
 * band rather than on whatever the markers left over, and a card of a set
 * measures the same as one that stands alone.
 *
 * Every length is a custom property set from the layout, so a card at another
 * size is this markup with different numbers.
 *
 * What the reader reads is fitted and the chrome is not. The body and the
 * values in the strip are set at whatever size the content fits at, measured
 * in place; the band, the labels and the footer are set from the text size the
 * reader picked and stay there, so two cards of one entry still read as a
 * pair. The card's box never changes either: a card is cut to a size and the
 * type gives way.
 *
 * The title is the one piece of chrome that moves, and only for its own
 * reason: a long name steps down until it fits the band, and wraps to a second
 * line only once it has run out of room to shrink into.
 *
 * A card carrying a `position` is one of a set, and shows it at the left end
 * of the band.
 *
 * Colour and faces are a theme and a pairing, named on the card and read from
 * the stylesheets, so the face knows what it is wearing and nothing about what
 * is in it.
 */
export function CardFace({
  card,
  layout,
  position,
  theme,
  typeface,
  fontSizeMillimetres,
  className,
}: CardFaceProps) {
  const frameRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const nameFit = useFittedNameScale({
    layout,
    card,
    typeface,
    nameRef,
  });
  const fittedMillimetres = useFittedFontSize({
    layout,
    card,
    typeface,
    frameRef,
    bandRef,
    fontSizeMillimetres,
  });

  // React types `style` as the properties it knows about, so the custom
  // properties the stylesheet reads need the assertion.
  const style = cardFaceStyle({
    layout,
    fontSizeMillimetres: fittedMillimetres,
  }) as CSSProperties;

  return (
    <article
      ref={frameRef}
      className={clsx(styles.card, className)}
      data-card-theme={theme}
      data-card-typeface={typeface}
      style={style}
    >
      <header ref={bandRef} className={styles.band}>
        <Box as="span" className={styles.bandEnd}>
          {position !== undefined && (
            <Box as="span" className={styles.position}>
              {position.label}
            </Box>
          )}
        </Box>
        <h2
          ref={nameRef}
          className={clsx(
            styles.name,
            nameFit.wraps && styles.nameWraps,
          )}
        >
          <RichTextView text={card.name} />
        </h2>
        <Box
          as="span"
          className={clsx(styles.bandEnd, styles.bandEndTrailing)}
        >
          {card.badge !== undefined && (
            <Box as="span" className={styles.badge}>
              <RichTextView text={card.badge} />
            </Box>
          )}
        </Box>
      </header>

      {card.subtitle !== undefined && (
        <Box as="p" className={styles.subtitle}>
          <RichTextView text={card.subtitle} />
        </Box>
      )}

      {card.meta.length > 0 && (
        <StatBlock fields={card.meta} typeface={typeface} />
      )}

      <Box className={styles.body}>
        {card.body.map((block, index) => (
          <BodyBlock key={index} block={block} />
        ))}
      </Box>

      {card.footer !== undefined && (
        <ul className={styles.footer}>
          {card.footer.map((entry, index) => (
            <li key={index} className={styles.footerItem}>
              <RichTextView text={entry} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
