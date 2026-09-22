import {
  CARD_SIZES,
  CARD_TEXT_SIZES,
  CARD_THEMES,
  CARD_TYPEFACES,
  type CardLayoutPresetName,
  type CardTextSizeName,
  type CardThemeId,
  type CardTypefaceId,
} from "@ttrpg-cards/card";
import type { ChoiceGroupOption } from "@ttrpg-cards/ui/ChoiceGroup";

import { choicesFrom } from "../CatalogView.data";

/**
 * The themes on offer, in the order the registry lists them. Built from it
 * rather than restated, so a theme added there shows up here with nothing to
 * change.
 */
export const THEME_OPTIONS: readonly ChoiceGroupOption<CardThemeId>[] =
  choicesFrom(CARD_THEMES);

/** The typeface pairings on offer, built from the registry for the same reason. */
export const TYPEFACE_OPTIONS: readonly ChoiceGroupOption<CardTypefaceId>[] =
  choicesFrom(CARD_TYPEFACES);

/** The card sizes on offer, built from the presets for the same reason. */
export const SIZE_OPTIONS: readonly ChoiceGroupOption<CardLayoutPresetName>[] =
  choicesFrom(CARD_SIZES);

/**
 * The text sizes on offer. A separate list from the card sizes because they
 * are separate choices: how large a card is cut and how large its type is set
 * are picked one at a time, and either can be changed without the other.
 */
export const TEXT_SIZE_OPTIONS: readonly ChoiceGroupOption<CardTextSizeName>[] =
  choicesFrom(CARD_TEXT_SIZES);

/** What each control is asking. User-facing copy is American spelling. */
export const THEME_LABEL = "Color";
export const TYPEFACE_LABEL = "Type";
export const SIZE_LABEL = "Card size";
export const TEXT_SIZE_LABEL = "Text size";
