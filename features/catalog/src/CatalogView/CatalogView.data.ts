import type { Card } from "@ttrpg-cards/card";
import type { NamedOption } from "@ttrpg-cards/core";
import {
  BUNDLED_CATALOGS,
  type CatalogAttribution,
} from "@ttrpg-cards/srd";
import type { ChoiceGroupOption } from "@ttrpg-cards/ui/ChoiceGroup";

import type { CatalogViewStyle } from "./CatalogView.types";

/** The catalog the page draws from: the newest release the app bundles. */
const SHOWN_CATALOG = BUNDLED_CATALOGS[0];

/**
 * Everything the page can lay out, in catalog order.
 *
 * All of it, not a page worth: how many of these go on a sheet depends on how
 * many cards each turns out to be, which is the sheet's own job to work out.
 * Mapped once by the catalog itself, so a card keeps its identity across a
 * re-render and is not re-measured for having been rebuilt.
 */
export const CATALOG_CARDS: readonly Card[] =
  SHOWN_CATALOG?.cards ?? [];

const ATTRIBUTION = SHOWN_CATALOG?.attribution;

/** What the page owes a reader for the content it is showing. */
export const CATALOG_ATTRIBUTIONS: readonly CatalogAttribution[] =
  ATTRIBUTION === undefined ? [] : [ATTRIBUTION];

/**
 * A registry's entries as the choices a control offers.
 *
 * The themes, the card sizes and the three page records all list
 * `{ id, name }` and every control asks for `{ value, label }`, so the
 * translation happens once here rather than at each of the five controls.
 *
 * @example
 * ```ts
 * choicesFrom(CARD_THEMES)[0]; // { value: "ink", label: "Ink" }
 * ```
 */
export function choicesFrom<Id extends string>(
  named: readonly NamedOption<Id>[],
): readonly ChoiceGroupOption<Id>[] {
  return named.map((entry) => ({
    value: entry.id,
    label: entry.name,
  }));
}

/**
 * The screen scale as the custom property the preview and the calibration
 * outline are both drawn at.
 *
 * Unitless, because it multiplies rather than measures.
 *
 * @example
 * ```ts
 * screenScaleStyle({ scale: 1.4 }); // { "--screen-scale": "1.4" }
 * ```
 */
export function screenScaleStyle(options: {
  scale: number;
}): CatalogViewStyle {
  return { "--screen-scale": String(options.scale) };
}
