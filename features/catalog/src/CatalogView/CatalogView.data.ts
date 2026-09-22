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
 * How many bundled cards the page opens on.
 *
 * The bundled catalog is the sample the app shows before the reader brings
 * anything, and a sample is what it stays: all of it is around forty sheets
 * nobody asked to print, and every card on them has to be measured before any
 * of it could be. Enough here to fill more than one sheet, so the reader can
 * see that a set runs onto the next.
 *
 * Nothing the reader brings is ever trimmed. What they hand over is what they
 * are printing, and all of it is laid out however many sheets that takes. That
 * costs what it costs, and the cost is known rather than guessed at: three
 * hundred cards is about two seconds to the first sheet and about eighteen to
 * the last. The sheets arrive a few at a time so there is something to watch
 * and the page answers a scroll throughout, and a print does not wait for the
 * rest of them, so this is a wait to read rather than a wait to print.
 */
const CATALOG_PREVIEW_COUNT = 24;

/** How many cards the bundled catalog holds in total, sample or not. */
export const CATALOG_CARD_COUNT: number =
  SHOWN_CATALOG?.cards.length ?? 0;

/**
 * The bundled cards the page lays out, in catalog order.
 *
 * Sliced once at module scope rather than per render, so a card keeps its
 * identity across a re-render and is not re-measured for having been rebuilt.
 */
export const CATALOG_CARDS: readonly Card[] = (
  SHOWN_CATALOG?.cards ?? []
).slice(0, CATALOG_PREVIEW_COUNT);

const ATTRIBUTION = SHOWN_CATALOG?.attribution;

/** What the page owes a reader for the bundled content. */
export const CATALOG_ATTRIBUTIONS: readonly CatalogAttribution[] =
  ATTRIBUTION === undefined ? [] : [ATTRIBUTION];

/**
 * What a page of the reader's own cards owes: nothing.
 *
 * The obligation attaches to the material being shared, and with the bundled
 * catalog off the page there is none of it to credit. It is a ceiling as well
 * as a floor, and a credit standing under somebody's own homebrew reads as
 * the licensor having had a hand in it, which is exactly what may not be
 * implied.
 */
export const NO_ATTRIBUTIONS: readonly CatalogAttribution[] = [];

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
