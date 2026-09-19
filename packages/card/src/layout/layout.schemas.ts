import { Type } from "@ttrpg-cards/validator";

/**
 * A length on a card, in millimetres. Physical units throughout are what make
 * screen and print agree, so no part of a layout is ever a pixel.
 *
 * `Type.Number` accepts finite numbers only, so `NaN` and `Infinity` are
 * rejected here rather than becoming a card of no size further down.
 */
const PositiveMillimetresSchema = Type.Number({
  exclusiveMinimum: 0,
});

/** A length that may be nothing at all, such as a margin a card does without. */
const MillimetresSchema = Type.Number({ minimum: 0 });

/** The card's own dimensions, the size it is cut to. */
export const CardSizeSchema = Type.Object(
  {
    /** How wide the card is. */
    widthMillimetres: PositiveMillimetresSchema,
    /** How tall the card is. */
    heightMillimetres: PositiveMillimetresSchema,
  },
  { additionalProperties: false },
);

/**
 * The blank kept inside each edge. Sides are named rather than collapsed into
 * one value because a card that hangs its title off the top edge needs them to
 * differ, and a symmetric layout is just four equal numbers.
 */
export const CardMarginsSchema = Type.Object(
  {
    topMillimetres: MillimetresSchema,
    rightMillimetres: MillimetresSchema,
    bottomMillimetres: MillimetresSchema,
    leftMillimetres: MillimetresSchema,
  },
  { additionalProperties: false },
);

/**
 * The band body text may be scaled within. Above the maximum the fitting
 * routine does not grow the text; below the minimum it does not shrink it and
 * the content continues on another card instead.
 */
export const CardFontSizeRangeSchema = Type.Object(
  {
    /** The smallest the text may be set, before content overflows instead. */
    minimumMillimetres: PositiveMillimetresSchema,
    /** The largest the text may be set, however much room is left over. */
    maximumMillimetres: PositiveMillimetresSchema,
  },
  { additionalProperties: false },
);

/**
 * A complete card layout: what a preset declares and what a `CardLayout`
 * holds. Whether the margins actually fit inside the card, and whether the
 * font size range runs the right way, are relations between fields that a
 * structural schema cannot state; `CardLayout.validate` checks those.
 */
export const CardLayoutSettingsSchema = Type.Object(
  {
    /** The card's own dimensions. */
    size: CardSizeSchema,
    /** The blank kept inside each edge. */
    margins: CardMarginsSchema,
    /** The band body text may be scaled within. */
    fontSizeRange: CardFontSizeRangeSchema,
  },
  { additionalProperties: false },
);
