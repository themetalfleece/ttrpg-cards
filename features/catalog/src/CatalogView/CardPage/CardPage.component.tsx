import { Box } from "@ttrpg-cards/ui/Box";
import clsx from "clsx";
import { memo, useEffect, type CSSProperties } from "react";

import { CardPageEntry } from "./CardPageEntry/CardPageEntry.component";
import { NOTHING_FITS, sheetLabel } from "./CardPage.constants";
import { cardPageStyle, pageCells, pageRule } from "./CardPage.data";
import { usePageFill, usePagesShown } from "./CardPage.hooks";
import styles from "./CardPage.module.css";
import type { CardPageProps } from "./CardPage.types";

/**
 * Cards laid out on sheets of paper, at the size they will be cut to.
 *
 * Sheets rather than a list: the surface is paper and the cards fill it in
 * reading order, so what is on screen is what comes out of the printer. The
 * `@page` rule is what holds those two together, because it is the only way to
 * tell the browser which paper to print on. It is written once and governs
 * every sheet, which is right: they are all the same paper.
 *
 * A sheet holds what it holds, and what it cannot hold starts the next one, so
 * a reader who brings more cards than one sheet takes gets more sheets rather
 * than a set quietly cut short. An entry that will not fit on one card runs
 * onto a continuation and takes a second slot with it, so how many cards go on
 * a sheet is settled as they are measured rather than counted in advance.
 *
 * A sheet is only left before it is full when the cards run out. An entry
 * whose cards will not all fit in what is left puts as many as do there and
 * carries the rest, so nothing is ever held open for a card that could not
 * use it. The cards are cut apart before anybody reads them, so keeping an
 * entry's cards adjacent on the uncut sheet buys nothing and costs paper.
 *
 * Printed on both sides that trade goes the other way, because the two halves
 * of an entry stop being two cards: a continuation goes on the back of its own
 * slot, so one cut gives a card carrying the whole entry. Pages then come in
 * front and back pairs, and a blank back is drawn and printed like any other
 * page, because one the driver skips moves every back after it onto the wrong
 * front. A back page's slots are the mirror of its front's, so the blanks
 * between them are drawn too: the cards wrap in reading order, and a card
 * lands at the slot it was given only if the slots before it are occupied.
 *
 * Sheets arrive a frame apart rather than all at once, because every card on
 * one measures itself as it mounts and a whole set of them in a single commit
 * is a locked tab and a blank page until the last one is done. How many are up
 * yet is the only thing that is staged: the count in the label is the whole
 * run from the first frame, so a reader is told how much is coming rather than
 * watching the total climb.
 *
 * A card larger than the paper says so instead. It is a dead end otherwise:
 * nothing renders, so nothing measures, so the answer never changes until the
 * reader picks differently, and a blank sheet does not tell them that is what
 * to do.
 *
 * Held across renders of whatever is above it, because most of what a reader
 * changes is not about the cards: the screen size control is a scale on the
 * preview, and redrawing every card on the page for it costs a frame's work to
 * arrive at the markup that was already there. What the page is drawn from is
 * memoised by the view above, so this compares by identity and renders again
 * exactly when one of them really changed.
 */
export const CardPage = memo(function CardPage({
  cards,
  layout,
  sheet,
  theme,
  typeface,
  onPrintableChange,
  className,
}: CardPageProps) {
  const { pages, reportFaceCount, settled } = usePageFill({
    cards,
    layout,
    sheet,
  });
  const shown = usePagesShown(pages.length);

  // Ready to be printed means every page is up and every measurement has
  // landed. Staging makes those two different questions: the pages can all
  // exist while the entries on the newest of them are still one card each.
  const printable = settled && shown >= pages.length;

  useEffect(() => {
    onPrintableChange?.(printable);
  }, [printable, onPrintableChange]);

  // React types `style` as the properties it knows about, so the custom
  // properties the stylesheet reads need the assertion.
  const style = cardPageStyle({ sheet, layout }) as CSSProperties;

  // Entries to lay out and no sheet to put any of them on, which is the card
  // being larger than the paper. Both halves of that are the reader's to
  // change, so both are named.
  if (cards.length > 0 && pages.length === 0) {
    return (
      <section
        className={clsx(styles.page, className)}
        style={style}
        aria-busy={!printable}
        aria-label={sheetLabel({ number: 1, total: 1 })}
      >
        <Box as="p" className={styles.empty}>
          {NOTHING_FITS}
        </Box>
      </section>
    );
  }

  return (
    <>
      <style>{pageRule({ sheet })}</style>
      {pages.slice(0, shown).map((page, index) => (
        <section
          // Pages are positional. Which entries land on one is the answer to
          // what the entries before them cost, so a page has no identity
          // beyond where it sits in the run, and keying it on an entry would
          // throw the page away every time a measurement moved a boundary.
          // The cards keep their own identity and carry their measurements
          // with them, so they survive being handed to the page after this.
          key={index}
          className={clsx(styles.page, className)}
          style={style}
          // Says out loud what the print control already acts on. A sheet
          // whose cards are still measuring themselves is a region that has
          // not finished arriving, and a reader on a screen reader is owed
          // that as much as the button is.
          aria-busy={!printable}
          // Counted in pieces of paper rather than in printed pages, because
          // that is what a reader holds: the two sides of one sheet are both
          // page 1, and a back that had no front of its own to be numbered
          // after would be the confusing half of the pair.
          aria-label={sheetLabel({
            number: page.number,
            total: sheet.duplex ? pages.length / 2 : pages.length,
            side: page.side,
          })}
        >
          {pageCells(page).map((cell) =>
            cell.kind === "blank" ? (
              <Box
                // Holds a slot open so the cards after it land where the
                // mirror put them. Nothing to read, so nothing is read out.
                key={`blank:${cell.index}`}
                className={styles.blank}
                aria-hidden="true"
              />
            ) : (
              <CardPageEntry
                // An entry can appear on two pages, so which of its cards
                // these are is part of what names them.
                key={`${cell.slot.item.id}:${cell.slot.from}`}
                card={cell.slot.item}
                layout={layout}
                theme={theme}
                typeface={typeface}
                from={cell.slot.from}
                count={cell.slot.count}
                onFaceCount={reportFaceCount}
              />
            ),
          )}
        </section>
      ))}
    </>
  );
});
