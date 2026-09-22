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
 * How many sheets are on the page before a frame has gone by.
 *
 * One, so the reader has something to look at in the time a single sheet takes
 * to measure rather than in the time all of them take.
 */
export const FIRST_SHEET = 1;

/**
 * How much larger each frame's helping of sheets is than the one before it.
 *
 * Doubling rather than one at a time. A frame costs a sheet's measurements
 * plus a reconcile of every sheet already up, so adding them singly makes the
 * second cost grow with the page and turns a nine second set into twenty one,
 * measured. Doubling holds the first sheet's arrival where it is and gets the
 * rest up in a handful of commits instead of one per sheet.
 */
export const SHEET_GROWTH = 2;

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
 * How a sheet names itself to anything reading the page aloud.
 *
 * Counted, because a reader who brought more cards than one sheet holds needs
 * to know both that there are more and which one they are on. User-facing
 * copy, so American spelling.
 */
export function sheetLabel(options: {
  number: number;
  total: number;
}): string {
  return `Card page ${options.number} of ${options.total}`;
}
