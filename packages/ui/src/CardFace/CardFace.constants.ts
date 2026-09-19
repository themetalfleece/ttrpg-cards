/**
 * The property the whole type scale is derived from. The fitting hook writes
 * it directly while measuring, so the name is shared rather than spelled out
 * in two places.
 */
export const CARD_FONT_SIZE_PROPERTY = "--card-font-size";

/**
 * How far past the card's inner edge content may sit and still count as
 * fitting. Millimetres resolve to fractional pixels, so an exact comparison
 * turns a rounding difference too small to see into a whole step of type size.
 */
export const FIT_TOLERANCE_PIXELS = 0.5;

/**
 * The colour properties a theme declares and the face's stylesheets read.
 *
 * Listed rather than derived from the stylesheet, because a role that stopped
 * being declared would then quietly stop being checked.
 */
export const CARD_COLOUR_ROLES = [
  "--card-color-surface",
  "--card-color-surface-tinted",
  "--card-color-border",
  "--card-color-text",
  "--card-color-text-muted",
  "--card-color-accent",
  "--card-color-badge-surface",
  "--card-color-badge-text",
] as const;

/** One of the colour properties a theme declares. */
export type CardColourRole = (typeof CARD_COLOUR_ROLES)[number];
