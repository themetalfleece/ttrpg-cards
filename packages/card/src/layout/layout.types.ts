import type { Static } from "@ttrpg-cards/validator";

import type { CARD_LAYOUT_PRESETS } from "./layout.constants";
import type {
  CardFontSizeRangeSchema,
  CardLayoutSettingsSchema,
  CardMarginsSchema,
  CardSizeSchema,
} from "./layout.schemas";

/** The card's own dimensions, the size it is cut to. */
export type CardSize = Static<typeof CardSizeSchema>;

/** The blank kept inside each edge of the card. */
export type CardMargins = Static<typeof CardMarginsSchema>;

/** The band body text may be scaled within. */
export type CardFontSizeRange = Static<
  typeof CardFontSizeRangeSchema
>;

/** A complete card layout, as it is stored and serialised. */
export type CardLayoutSettings = Static<
  typeof CardLayoutSettingsSchema
>;

/** The name of a card size the app ships. */
export type CardLayoutPresetName = keyof typeof CARD_LAYOUT_PRESETS;

/**
 * A change to part of a layout. Every field is optional and anything left out
 * keeps the value it had, so a size can be changed without restating margins
 * that have nothing to do with it.
 */
export interface CardLayoutOverrides {
  size?: Partial<CardSize>;
  margins?: Partial<CardMargins>;
  fontSizeRange?: Partial<CardFontSizeRange>;
}
