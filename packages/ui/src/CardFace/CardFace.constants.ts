/**
 * The property the whole type scale is derived from. The fitting hook writes
 * it directly while measuring, so the name is shared rather than spelled out
 * in two places.
 */
export const CARD_FONT_SIZE_PROPERTY = "--card-font-size";

/** The property the title's step down is written to, for the same reason. */
export const CARD_NAME_SCALE_PROPERTY = "--card-name-scale";

/**
 * How the title is found inside a card, for the one question that has to be
 * asked of a card somebody else rendered: which faces it is set in. The card
 * inherits the workhorse and only the title carries the display face.
 */
export const CARD_NAME_SELECTOR = "h2";

/**
 * How far past the card's inner edge content may sit and still count as
 * fitting. Millimetres resolve to fractional pixels, so an exact comparison
 * turns a rounding difference too small to see into a whole step of type size.
 */
export const FIT_TOLERANCE_PIXELS = 0.5;

/**
 * How far past the band's inner edge a title may sit and still count as
 * fitting on one line, for the same reason.
 */
export const NAME_FIT_TOLERANCE_PIXELS = 0.5;

/**
 * The smallest share of its full size a title is set at before it is allowed a
 * second line instead.
 *
 * The stylesheet holds the result to the layout's own floor as well, so this
 * is where the shrinking stops rather than how small the type may get: past
 * about two thirds a title is no longer reading as the card's title, and a
 * second line says "long name" better than a smaller one does.
 */
export const MINIMUM_NAME_SCALE = 0.62;

/** How close the title search gets before it stops halving. */
export const NAME_SCALE_PRECISION = 0.02;

/** The property the strip's labels step down by, for the same reason. */
export const CARD_STAT_LABEL_SCALE_PROPERTY =
  "--card-stat-label-scale";

/**
 * The smallest share of its full size a property label is set at before it is
 * left to wrap instead.
 *
 * The legibility floor in the layout is the real limit, and the stylesheet
 * applies it; this is a bound on the step rather than on the size. A word that
 * needs more than half is longer than `COMPONENTS` at the largest text size,
 * which is the widest thing a quarter of a card has ever had to hold, and
 * wrapping it reads better than setting it at a third of its neighbours.
 */
export const MINIMUM_LABEL_SCALE = 0.5;

/**
 * The colour properties a theme declares and the face's stylesheets read.
 *
 * Listed rather than derived from the stylesheet, because a role that stopped
 * being declared would then quietly stop being checked.
 */
export const CARD_COLOUR_ROLES = [
  "--card-color-surface",
  "--card-color-border",
  "--card-color-text",
  "--card-color-text-muted",
  "--card-color-accent",
  "--card-color-badge-surface",
  "--card-color-badge-text",
] as const;

/** One of the colour properties a theme declares. */
export type CardColourRole = (typeof CARD_COLOUR_ROLES)[number];

/**
 * The most cells the property strip sets across before it takes a second row.
 *
 * Four is what a card this narrow holds while a value still has room to be
 * read; past that the cells are too thin for anything but a single word, and
 * a value that wraps to four lines costs the body more than the row saved.
 */
export const MAXIMUM_STRIP_COLUMNS = 4;
