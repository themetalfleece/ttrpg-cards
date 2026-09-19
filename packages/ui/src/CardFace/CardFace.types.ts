import type {
  Card,
  CardLayout,
  CardPosition,
} from "@ttrpg-cards/card";
import type { RefObject } from "react";

/**
 * A card, laid out at a given geometry.
 *
 * `card` and `layout` want to be referentially stable. The card measures
 * itself to decide what size to set its text at, and a new identity for either
 * is a fresh measurement, so building a layout inside a render or mapping
 * cards through a transform re-measures every card on screen whenever the
 * parent renders. Hoist them or memoise them.
 */
export interface CardFaceProps {
  /** What the card says. */
  card: Card;
  /** The geometry to lay it out at. Every measurement is read from here. */
  layout: CardLayout;
  /**
   * Where this card sits in the set it belongs to, shown beside the name.
   * Left off for a card that stands alone, which is most of them.
   */
  position?: CardPosition | undefined;
  /**
   * The size to set body text at, for a caller that has already decided one,
   * such as the routine measuring candidates for a split. Left off, the card
   * measures itself.
   */
  fontSizeMillimetres?: number | undefined;
  /** Passed through for a consumer that positions the face. */
  className?: string | undefined;
}

/**
 * The custom properties the card stylesheet reads every length from. Naming
 * them here is what keeps a measurement out of the stylesheet: a rule that
 * wants one has to ask for a property that exists.
 */
export type CardFaceCustomProperty =
  | "--card-width"
  | "--card-height"
  | "--card-margin-top"
  | "--card-margin-right"
  | "--card-margin-bottom"
  | "--card-margin-left"
  | "--card-font-size"
  | "--card-font-size-minimum";

/** Those properties with their values, ready to set as an inline style. */
export type CardFaceStyle = Readonly<
  Record<CardFaceCustomProperty, string>
>;

/** What the card face is drawn from, and the size to set its text at. */
export interface CardFaceStyleOptions {
  /** The geometry every length is read from. */
  layout: CardLayout;
  /**
   * The size body text is set at. Defaults to the top of the layout's range,
   * which is what a caller that does not measure should be showing.
   */
  fontSizeMillimetres?: number | undefined;
}

/** What the fitting hook needs to measure a card in place. */
export interface UseFittedFontSizeOptions {
  /** The geometry, which owns the range the answer comes from. */
  layout: CardLayout;
  /** The card being measured. A different one is a fresh measurement. */
  card: Card;
  /** The card's own element, whose box is what the content has to fit in. */
  frameRef: RefObject<HTMLElement | null>;
  /** A size decided elsewhere. Given one, the hook measures nothing. */
  fontSizeMillimetres?: number | undefined;
}
