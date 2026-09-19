/**
 * The card sizes the app ships. A preset is a complete layout: the card's own
 * dimensions, the margins that keep content off the trimmed edge, and the band
 * the fitting routine may scale body text within.
 *
 * **This is the one place a card measurement is written down.** Adding a size
 * is a new entry here and nothing else, because the renderer, the fitting
 * routine and the print pipeline all read the live layout rather than a
 * measurement of their own.
 */
export const CARD_LAYOUT_PRESETS = {
  /**
   * The standard card size, what most trading and playing cards are cut to and
   * what sleeves, card stock and deck boxes are sold for.
   */
  standard: {
    size: { widthMillimetres: 63, heightMillimetres: 88 },
    margins: {
      topMillimetres: 4,
      rightMillimetres: 4,
      bottomMillimetres: 4,
      leftMillimetres: 4,
    },
    /**
     * Roughly 5.5 to 10 point. Wide on purpose: scaling is the first answer to
     * content that will not fit, and splitting the card is the second.
     */
    fontSizeRange: {
      minimumMillimetres: 1.9,
      maximumMillimetres: 3.5,
    },
  },
} as const;

/** The preset a layout initialises to when nothing has chosen another. */
export const DEFAULT_CARD_LAYOUT_PRESET = "standard";
