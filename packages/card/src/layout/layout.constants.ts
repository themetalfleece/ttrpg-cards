import { optionsFrom } from "@ttrpg-cards/core";

import type {
  CardFontSizeRange,
  CardLayoutPresetName,
  CardSizeOption,
  CardTextSizeName,
  CardTextSizeOption,
} from "./layout.types";

/**
 * The card sizes the app ships, in the order a picker should offer them. A
 * preset is the card's own dimensions and the margins that keep content off
 * the trimmed edge.
 *
 * **This is the one place a card measurement is written down.** Adding a size
 * is a new entry here and the name it is picked by below, because the renderer,
 * the fitting routine and the print pipeline all read the live layout rather
 * than a measurement of their own.
 *
 * How large the type may be is not here: that is a reader's choice rather than
 * a property of the box, so it lives in {@link CARD_TEXT_SIZE_PRESETS} and the
 * two are combined by {@link CardLayout.fromPreset}.
 */
export const CARD_LAYOUT_PRESETS = {
  /** Small enough to hold a stack of in one hand, and to sleeve two up. */
  mini: {
    size: { widthMillimetres: 44, heightMillimetres: 68 },
    margins: {
      topMillimetres: 3,
      rightMillimetres: 3,
      bottomMillimetres: 3,
      leftMillimetres: 3,
    },
  },

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
  },

  /** A quarter of a sheet, for content that would otherwise run onto a second card. */
  large: {
    size: { widthMillimetres: 89, heightMillimetres: 127 },
    margins: {
      topMillimetres: 6,
      rightMillimetres: 6,
      bottomMillimetres: 6,
      leftMillimetres: 6,
    },
  },
} as const;

/**
 * What a picker calls each size.
 *
 * Kept out of the preset because a preset is geometry and nothing else: the
 * layout schema rejects a field it does not know, so a label sitting inside one
 * would make the preset fail its own validation. `satisfies` ties the two
 * records together, so a size added without a name does not compile.
 */
const PRESET_NAMES = {
  mini: "Mini",
  standard: "Standard",
  large: "Large",
} as const satisfies Record<CardLayoutPresetName, string>;

/**
 * Every size the app ships, in the order a picker should offer them.
 *
 * @example
 * ```ts
 * CARD_SIZES.map((size) => size.id); // ["mini", "standard", "large"]
 * ```
 */
export const CARD_SIZES: readonly CardSizeOption[] =
  optionsFrom(PRESET_NAMES);

/** The preset a layout initialises to when nothing has chosen another. */
export const DEFAULT_CARD_LAYOUT_PRESET = "standard";

/**
 * How large the type on a card may be, as a band the fitting routine scales
 * body text within.
 *
 * A reader's choice rather than a property of the card, which is why it is
 * here and not in a size preset: the same card holds less at a larger setting,
 * and which trade a reader wants is theirs to make.
 *
 * **The minimum governs the whole card, not just its body.** Every region is a
 * ratio of the body size, and a ratio cannot hold a floor because it moves
 * with what it multiplies, so the renderer clamps every region that sets type
 * smaller than the body to this minimum. Raising it raises the smallest text
 * anywhere on the card.
 *
 * The band is about half again as wide as it is tall at every setting, because
 * scaling is the first answer to content that will not fit and splitting the
 * card is the second: a band with no room in it goes straight to a split.
 */
export const CARD_TEXT_SIZE_PRESETS = {
  /**
   * 2.38mm is 9 CSS pixels, or about 6.75 point, which is the smallest this
   * app is willing to set text at. Below that a card stops being something
   * you read at arm's length across a table.
   */
  small: { minimumMillimetres: 2.38, maximumMillimetres: 3.4 },
  medium: { minimumMillimetres: 2.8, maximumMillimetres: 4 },
  large: { minimumMillimetres: 3.3, maximumMillimetres: 4.7 },
} as const satisfies Record<string, CardFontSizeRange>;

/** What a picker calls each text size, kept beside the presets as sizes are. */
const TEXT_SIZE_NAMES = {
  small: "Small",
  medium: "Medium",
  large: "Large",
} as const satisfies Record<CardTextSizeName, string>;

/**
 * Every text size the app ships, in the order a picker should offer them.
 *
 * @example
 * ```ts
 * CARD_TEXT_SIZES.map((size) => size.id); // ["small", "medium", "large"]
 * ```
 */
export const CARD_TEXT_SIZES: readonly CardTextSizeOption[] =
  optionsFrom(TEXT_SIZE_NAMES);

/**
 * The text size a layout initialises to.
 *
 * The smallest one, because it is the setting that fits the most on a card and
 * splits the fewest entries. A reader who wants larger type is trading room
 * for it and should be the one to ask.
 */
export const DEFAULT_CARD_TEXT_SIZE = "small";
