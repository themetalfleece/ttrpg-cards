import type { CARD_THEMES } from "./theme.constants";

/** One selectable colour theme a card can be drawn in. */
export interface CardTheme {
  /** Identifies the theme in a stored preference and to the renderer. */
  readonly id: string;
  /** What a picker shows. */
  readonly name: string;
}

/** The id of a theme the app ships. */
export type CardThemeId = (typeof CARD_THEMES)[number]["id"];
