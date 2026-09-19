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
