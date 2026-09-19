/**
 * Sample colour sets for the theme's tests and the stories that show a card
 * recoloured. Test input rather than public API, so it stays out of the barrel.
 */

/**
 * A second palette, set as the colour roles the face reads. Held to the same
 * contrast bar as the theme, because a reader building a palette starts here.
 */
export const parchmentPalette = {
  "--card-color-surface": "#fdf6e8",
  "--card-color-surface-tinted": "#f2e6ca",
  "--card-color-border": "#b9a06a",
  "--card-color-text": "#221c10",
  "--card-color-text-muted": "#5b4a24",
  "--card-color-accent": "#6b2f12",
  "--card-color-badge-surface": "#6b2f12",
  "--card-color-badge-text": "#fdf6e8",
} satisfies Record<string, string>;
