import type { SheetSide } from "@ttrpg-cards/printer";

/**
 * What a sheet with room for nothing says.
 *
 * Names the three things that would change the answer, because the reader is
 * the only one who can change any of them and a blank sheet does not tell them
 * which way to go.
 */
export const NOTHING_FITS =
  "Nothing fits on this sheet. Try a smaller card size, a larger paper, or turning the paper the other way round.";

/**
 * How many pages are up before a frame has gone by.
 *
 * One, so the reader has something to look at in the time a single page takes
 * to measure rather than in the time all of them take.
 */
export const FIRST_PAGE = 1;

/**
 * How much larger each frame's helping of pages is than the one before it.
 *
 * Doubling rather than one at a time. A frame costs a page's measurements plus
 * a reconcile of every page already up, so adding them singly makes the second
 * cost grow with the run and turns a nine second set into twenty one,
 * measured. Doubling holds the first page's arrival where it is and gets the
 * rest up in a handful of commits instead of one per page.
 */
export const PAGE_GROWTH = 2;

/**
 * What the browser says before it draws pages, for a print started any way at
 * all: the button on the page, the reader's own keystroke, the menu.
 *
 * Not every browser says it. Safari has never implemented `beforeprint` on
 * either desktop or phone, so the media query is the other half of the
 * same question and the only warning that browser gives. The ones that have
 * both fire both, which costs nothing: asking for every sheet twice is one
 * change.
 *
 * This is the net rather than the plan. The button on the page waits for the
 * page to finish and then prints what it finished as, which is the right way
 * round when there is a choice. A print the reader starts themselves, and a
 * print the button gives up waiting and makes anyway, both land here instead:
 * every sheet exists by the time pages are drawn, even where the newest
 * entries on them have not worked out yet that they need a second card. Some
 * of the set beats some of the sheets.
 */
export const PRINT_EVENT = "beforeprint";

/** The media a page is in while the browser is drawing pages of it. */
export const PRINT_MEDIA = "print";

/** How a media query says its answer changed. */
export const MEDIA_CHANGE_EVENT = "change";

/**
 * How many frames of nothing changing mean the page has stopped moving.
 *
 * A card reports what it costs, that moves a sheet boundary, and the cards
 * that moved report again, so the page arrives at its answer over several
 * rounds rather than in one. There is no event for the end of that: the only
 * evidence is that a few frames have gone by without anything changing.
 *
 * Three, because a split is queued as a microtask and the re-pagination it
 * causes lands on the frame after. Two would call a pause between rounds the
 * end of them.
 */
export const SETTLED_FRAMES = 3;

/**
 * How a page names itself to anything reading it aloud.
 *
 * Counted, because a reader who brought more cards than one page holds needs
 * to know both that there are more and which one they are on. Counted in
 * pieces of paper, so the two sides of one sheet are both page 1. Printed on
 * both sides it says which side too, because half the pages are backs and a
 * reader who cannot see the cards has no other way to tell. User-facing copy,
 * so American spelling.
 *
 * @example
 * ```ts
 * sheetLabel({ number: 2, total: 3, side: "back" }); // "Card page 2 of 3, back"
 * ```
 */
export function sheetLabel(options: {
  number: number;
  total: number;
  side?: SheetSide | undefined;
}): string {
  const page = `Card page ${options.number} of ${options.total}`;

  if (options.side === undefined) {
    return page;
  }

  return `${page}, ${options.side}`;
}
