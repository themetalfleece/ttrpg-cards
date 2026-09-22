import type {
  Card,
  CardLayout,
  CardPosition,
  CardThemeId,
  CardTypefaceId,
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
   * Where this card sits in the set it belongs to, shown at the left end of
   * the band. Left off for a card that stands alone, which is most of them.
   */
  position?: CardPosition | undefined;
  /**
   * The colour theme to draw the card in.
   *
   * Left off, the card takes the theme of the surface it stands on, which is
   * the neutral one unless an ancestor sets `data-card-theme`. The attribute
   * is omitted rather than defaulted for that reason: a sheet themed in one
   * place keeps its colour, and a card naming a theme still wins.
   */
  theme?: CardThemeId | undefined;
  /**
   * The pairing of faces to set the card in, on the same terms as the theme
   * and for the same reason.
   */
  typeface?: CardTypefaceId | undefined;
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
  | "--card-font-size-minimum"
  | "--card-font-size-chrome";

/** Those properties with their values, ready to set as an inline style. */
export type CardFaceStyle = Readonly<
  Record<CardFaceCustomProperty, string>
>;

/** What the card face is drawn from, and the sizes to set its text at. */
export interface CardFaceStyleOptions {
  /** The geometry every length is read from. */
  layout: CardLayout;
  /**
   * The size body text is set at. Defaults to the top of the layout's range,
   * which is what a caller that does not measure should be showing.
   */
  fontSizeMillimetres?: number | undefined;
}

/**
 * What a card's fitted size was measured for.
 *
 * A size is only an answer about the content and the geometry it was measured
 * against, so a card holding on to one while a face loads has to be able to
 * say that it is still holding its own.
 */
export interface FittedFor {
  /** The card that was on it. */
  readonly card: Card;
  /** The geometry it was cut to. */
  readonly layout: CardLayout;
}

/** How far the title stepped down, and whether it had to wrap in the end. */
export interface NameFit {
  /** The share of its full size the title is set at, at most 1. */
  readonly scale: number;
  /** True when even the smallest step would not fit on one line. */
  readonly wraps: boolean;
}

/** What the title fitting hook needs to measure a name in place. */
export interface UseFittedNameScaleOptions {
  /** The geometry, which owns the floor the title may not shrink past. */
  layout: CardLayout;
  /** The card being measured. A different one is a fresh measurement. */
  card: Card;
  /** The faces it is set in, which decide how wide the name runs. */
  typeface?: CardTypefaceId | undefined;
  /** The title's own element, whose box is what the name has to fit in. */
  nameRef: RefObject<HTMLElement | null>;
}

/** What the fitting hook needs to measure a card in place. */
export interface UseFittedFontSizeOptions {
  /** The geometry, which owns the range the answer comes from. */
  layout: CardLayout;
  /** The card being measured. A different one is a fresh measurement. */
  card: Card;
  /** The faces it is set in, which decide how much room its words take. */
  typeface?: CardTypefaceId | undefined;
  /** The card's own element, whose box is what the content has to fit in. */
  frameRef: RefObject<HTMLElement | null>;
  /**
   * The band's element. Watched rather than read: the band is as tall as the
   * title makes it, so a name that took a second line leaves the body less
   * room than it was last measured against.
   */
  bandRef: RefObject<HTMLElement | null>;
  /** A size decided elsewhere. Given one, the hook measures nothing. */
  fontSizeMillimetres?: number | undefined;
}
