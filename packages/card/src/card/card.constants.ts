/**
 * The block kinds a card body is built from. A plain object rather than an
 * enum, so it survives type stripping and new kinds stay additive.
 */
export const CARD_BLOCK_KINDS = {
  paragraph: "paragraph",
  list: "list",
  callout: "callout",
} as const;

/**
 * The marks a run of body text can carry. Meaning, not presentation: the theme
 * decides what strong and emphasis look like on a card.
 */
export const CARD_TEXT_MARKS = {
  strong: "strong",
  emphasis: "emphasis",
} as const;
