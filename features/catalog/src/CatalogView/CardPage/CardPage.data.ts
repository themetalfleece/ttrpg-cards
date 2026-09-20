import type { CardLayout } from "@ttrpg-cards/card";
import { millimetres } from "@ttrpg-cards/core";
import type { SheetLayout } from "@ttrpg-cards/printer";

import type { CardPageStyle } from "./CardPage.types";

/**
 * The sheet's geometry as the custom properties its stylesheet reads.
 *
 * Takes the card layout as well as the sheet, because where the grid starts
 * depends on how wide a column is.
 *
 * @example
 * ```ts
 * cardPageStyle({
 *   sheet: SheetLayout.default(),
 *   layout: CardLayout.default(),
 * })["--page-width"]; // "210mm"
 * ```
 */
export function cardPageStyle(options: {
  sheet: SheetLayout;
  layout: CardLayout;
}): CardPageStyle {
  const { sheet, layout } = options;

  return {
    "--page-width": millimetres(sheet.widthMillimetres),
    "--page-height": millimetres(sheet.heightMillimetres),
    "--page-margin": millimetres(sheet.marginMillimetres),
    "--page-card-gap": millimetres(sheet.cardGapMillimetres),
    "--page-grid-inset": millimetres(
      sheet.gridInsetMillimetres({ layout }),
    ),
  };
}

/**
 * The printed page box, as the `@page` rule that sets it.
 *
 * This exists because `@page` descriptors do not resolve `var()`, so the paper
 * and the margin cannot be read from the custom properties beside them and
 * have to be written into the rule as text. Without it the browser picks the
 * paper and the margins itself, the sheet re-wraps against whatever run of
 * paper that leaves, and what prints is not what the reader was shown.
 *
 * Both numbers come from the same sheet the preview is drawn from, so the two
 * cannot disagree, and both come from closed preset records rather than from
 * anything a reader typed.
 *
 * @example
 * ```ts
 * pageRule({ sheet: SheetLayout.default() });
 * // "@page { size: 210mm 297mm; margin: 8mm; }"
 * ```
 */
export function pageRule(options: { sheet: SheetLayout }): string {
  const { sheet } = options;
  const size = `${millimetres(sheet.widthMillimetres)} ${millimetres(sheet.heightMillimetres)}`;

  return `@page { size: ${size}; margin: ${millimetres(sheet.marginMillimetres)}; }`;
}
