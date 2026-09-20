import { Box } from "@ttrpg-cards/ui/Box";
import clsx from "clsx";
import type { CSSProperties } from "react";

import { CardPageEntry } from "./CardPageEntry/CardPageEntry.component";
import { NOTHING_FITS } from "./CardPage.constants";
import { cardPageStyle, pageRule } from "./CardPage.data";
import { usePageFill } from "./CardPage.hooks";
import styles from "./CardPage.module.css";
import type { CardPageProps } from "./CardPage.types";

/**
 * Cards laid out on a sheet, at the size they will be cut to.
 *
 * A page rather than a list: the surface is a sheet of paper and the cards
 * fill it in reading order, so what is on screen is what comes out of the
 * printer. The `@page` rule is what holds those two together, because it is
 * the only way to tell the browser which paper to print on.
 *
 * The sheet holds what it holds. An entry that will not fit runs onto a
 * continuation card and takes a second slot with it, so how many entries go on
 * is settled as they are measured rather than counted in advance.
 *
 * A sheet with room for nothing says so. It is a dead end otherwise: nothing
 * renders, so nothing measures, so the answer never changes until the reader
 * picks differently, and a blank sheet does not tell them that is what to do.
 */
export function CardPage({
  cards,
  layout,
  sheet,
  theme,
  className,
}: CardPageProps) {
  const { shown, reportFaceCount } = usePageFill({
    cards,
    layout,
    sheet,
  });

  // Entries to lay out and nowhere to put any of them: either the card is
  // larger than the paper, or the first entry needs more cards than the sheet
  // holds. Both are the reader's to resolve, so both are worth saying.
  const nothingFits = cards.length > 0 && shown.length === 0;

  // React types `style` as the properties it knows about, so the custom
  // properties the stylesheet reads need the assertion.
  const style = cardPageStyle({ sheet, layout }) as CSSProperties;

  return (
    <>
      <style>{pageRule({ sheet })}</style>
      <section
        className={clsx(styles.page, className)}
        style={style}
        aria-label="Card page"
      >
        {nothingFits && (
          <Box as="p" className={styles.empty}>
            {NOTHING_FITS}
          </Box>
        )}
        {shown.map((card) => (
          <CardPageEntry
            key={card.id}
            card={card}
            layout={layout}
            theme={theme}
            onFaceCount={reportFaceCount}
            className={styles.cardSet}
          />
        ))}
      </section>
    </>
  );
}
