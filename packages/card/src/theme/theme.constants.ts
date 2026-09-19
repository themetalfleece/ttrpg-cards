import type { CardTheme, CardThemeId } from "./theme.types";

/**
 * The colour themes the app ships, in the order a picker should offer them.
 *
 * **This is the one place a theme is named.** A theme is this entry plus the
 * colours the renderer draws it in, and nothing else; what those colours are
 * is the renderer's business, the same way a card's size is declared here and
 * the stylesheet never names a measurement.
 *
 * @example
 * ```ts
 * CARD_THEMES.map((theme) => theme.id); // ["ink", "parchment", …]
 * ```
 */
export const CARD_THEMES = [
  { id: "ink", name: "Ink" },
  { id: "parchment", name: "Parchment" },
  { id: "slate", name: "Slate" },
  { id: "moss", name: "Moss" },
  { id: "ember", name: "Ember" },
  { id: "plum", name: "Plum" },
] as const satisfies readonly CardTheme[];

/** The theme a card is drawn in when nothing has chosen another. */
export const DEFAULT_CARD_THEME_ID: CardThemeId = "ink";

const THEME_IDS: ReadonlySet<string> = new Set(
  CARD_THEMES.map((theme) => theme.id),
);

/**
 * Whether a value names a theme the app ships. The guard a stored preference
 * is read back through, since a theme that was dropped leaves a stale id
 * behind in a browser that saved it.
 *
 * @example
 * ```ts
 * isCardThemeId("moss"); // true
 * isCardThemeId("chartreuse"); // false
 * ```
 */
export function isCardThemeId(value: unknown): value is CardThemeId {
  return typeof value === "string" && THEME_IDS.has(value);
}
