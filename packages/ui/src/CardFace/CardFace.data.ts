import { millimetres } from "@ttrpg-cards/core";

import type {
  CardFaceStyle,
  CardFaceStyleOptions,
} from "./CardFace.types";

/**
 * The custom properties a card face is drawn from.
 *
 * Every length the stylesheet uses comes from here, so a card at a different
 * size is the same markup with different numbers and neither the component nor
 * the stylesheet knows a measurement.
 *
 * Body text is set at `fontSizeMillimetres`, which the fitting hook measures.
 * Left out, it starts at the top of the layout's range, which is what a caller
 * that does not measure should be showing.
 *
 * The bottom of the range comes too, as the floor the type scale clamps to.
 * A region set smaller than the body is a ratio of it, and a ratio cannot
 * hold a floor, because it moves with what it multiplies. Legibility does not
 * move: the smallest readable type is the same measurement whatever size the
 * card is cut to.
 *
 * @example
 * ```ts
 * const layout = CardLayout.fromPreset({
 *   overrides: { size: { widthMillimetres: 70 } },
 * });
 *
 * cardFaceStyle({ layout })["--card-width"]; // "70mm"
 * ```
 */
export function cardFaceStyle({
  layout,
  fontSizeMillimetres,
}: CardFaceStyleOptions): CardFaceStyle {
  const { margins, fontSizeRange } = layout;
  const fontSize =
    fontSizeMillimetres ?? fontSizeRange.maximumMillimetres;

  return {
    "--card-width": millimetres(layout.widthMillimetres),
    "--card-height": millimetres(layout.heightMillimetres),
    "--card-margin-top": millimetres(margins.topMillimetres),
    "--card-margin-right": millimetres(margins.rightMillimetres),
    "--card-margin-bottom": millimetres(margins.bottomMillimetres),
    "--card-margin-left": millimetres(margins.leftMillimetres),
    "--card-font-size": millimetres(fontSize),
    "--card-font-size-minimum": millimetres(
      fontSizeRange.minimumMillimetres,
    ),
  };
}
