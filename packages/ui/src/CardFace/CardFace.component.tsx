// The card measures itself to decide what size its text is set at, so it runs
// in the browser rather than only on the server.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import { RichTextView } from "@ttrpg-cards/ui/RichTextView";
import { Separator } from "@ttrpg-cards/ui/Separator";
import clsx from "clsx";
import { type CSSProperties, useRef } from "react";

import { BodyBlock } from "./BodyBlock/BodyBlock.component";
import { cardFaceStyle } from "./CardFace.data";
import { useFittedFontSize } from "./CardFace.hooks";
import styles from "./CardFace.module.css";
// The palettes the `data-card-theme` attribute below selects between. Global
// rather than a module, so they ship wherever a card does.
import "./CardFace.themes.css";
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
 * Every length is a custom property set from the layout, so a card at another
 * size is this markup with different numbers.
 *
 * Text is set at whatever size the content fits at, measured in place. The
 * card's box never changes: a card is cut to a size and the type gives way.
 *
 * A card carrying a `position` is one of a set, and says so beside its name.
 *
 * Colour is a theme, named on the card and read from the stylesheet, so the
 * face knows which theme it is wearing and nothing about what is in it.
 */
export function CardFace({
  card,
  layout,
  position,
  theme,
  fontSizeMillimetres,
  className,
}: CardFaceProps) {
  const frameRef = useRef<HTMLElement>(null);
  const fittedMillimetres = useFittedFontSize({
    layout,
    card,
    frameRef,
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
      style={style}
    >
      <header className={styles.header}>
        <Box className={styles.heading}>
          <h2 className={styles.name}>
            <RichTextView text={card.name} />
          </h2>
          {card.badge !== undefined && (
            <Box as="span" className={styles.badge}>
              <RichTextView text={card.badge} />
            </Box>
          )}
          {position !== undefined && (
            <Box as="span" className={styles.position}>
              {position.label}
            </Box>
          )}
        </Box>
        {card.subtitle !== undefined && (
          <Box as="p" className={styles.subtitle}>
            <RichTextView text={card.subtitle} />
          </Box>
        )}
      </header>

      {card.meta.length > 0 && <StatBlock fields={card.meta} />}

      <Separator />

      <Box className={styles.body}>
        {card.body.map((block, index) => (
          <BodyBlock key={index} block={block} />
        ))}
      </Box>

      {card.footer !== undefined && (
        <>
          <Separator />
          <ul className={styles.footer}>
            {card.footer.map((entry, index) => (
              <li key={index} className={styles.footerItem}>
                <RichTextView text={entry} />
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
