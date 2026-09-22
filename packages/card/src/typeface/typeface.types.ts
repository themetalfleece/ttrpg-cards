import type { CARD_TYPEFACES } from "./typeface.constants";

/** One selectable pairing of faces a card can be set in. */
export interface CardTypeface {
  /** Identifies the pairing in a stored preference and to the renderer. */
  readonly id: string;
  /** What a picker shows. */
  readonly name: string;
}

/** The id of a pairing the app ships. */
export type CardTypefaceId = (typeof CARD_TYPEFACES)[number]["id"];
