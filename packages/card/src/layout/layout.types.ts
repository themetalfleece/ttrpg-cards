import type { NamedOption } from "@ttrpg-cards/core";
import type { Static } from "@ttrpg-cards/validator";

import type {
  CARD_LAYOUT_PRESETS,
  CARD_TEXT_SIZE_PRESETS,
} from "./layout.constants";
import type {
  CardFontSizeRangeSchema,
  CardLayoutSettingsSchema,
  CardMarginsSchema,
  CardSizeSchema,
} from "./layout.schemas";

/**
 * The card's own dimensions, the size it is cut to.
 *
 * Derived from the schema rather than aliased to `Dimensions`, because this is
 * what validates a stored layout and the schema has to stay the source of
 * that. It is the same shape, which is what lets a sheet compare a card to a
 * paper without translating either. `CardLayout.test.ts` pins that.
 */
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

/** One selectable card size: the preset it lays out from, and its label. */
export type CardSizeOption = NamedOption<CardLayoutPresetName>;

/** The name of a text size the app ships. */
export type CardTextSizeName = keyof typeof CARD_TEXT_SIZE_PRESETS;

/** One selectable text size: the band it sets type within, and its label. */
export type CardTextSizeOption = NamedOption<CardTextSizeName>;

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
