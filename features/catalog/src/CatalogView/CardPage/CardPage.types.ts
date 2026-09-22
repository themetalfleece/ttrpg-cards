import type {
  Card,
  CardLayout,
  CardThemeId,
  CardTypefaceId,
} from "@ttrpg-cards/card";
import type {
  SheetLayout,
  SheetPlacement,
} from "@ttrpg-cards/printer";

/** Cards laid out on one sheet. */
export interface CardPageProps {
  /**
   * The entries to draw from, in reading order. All of them: how many go on
   * the sheet is settled here, once each has been measured, and the ones past
   * that are never mounted.
   */
  cards: readonly Card[];
  /**
   * The geometry every card is cut to. Referentially stable, because a new
   * identity re-measures every card on the page.
   */
  layout: CardLayout;
  /** The paper they are laid out on, and the margin kept inside its edges. */
  sheet: SheetLayout;
  /** The colour theme every card on the page is drawn in. */
  theme?: CardThemeId | undefined;
  /**
   * The pairing of faces every card on the page is set in. It reaches the
   * measurement as well as the render, because how wide the text runs is what
   * decides whether an entry takes a second card.
   */
  typeface?: CardTypefaceId | undefined;
  /**
   * Told whether the page is finished: every sheet up and every measurement
   * landed. What prints is the DOM as it stands, so anything that starts a
   * print has to know whether the page is ready to be one.
   */
  onPrintableChange?: ((printable: boolean) => void) | undefined;
  /** Passed through for a consumer that positions the page. */
  className?: string | undefined;
}

/**
 * The custom properties the page stylesheet reads its lengths from. Naming
 * them here is what keeps a measurement out of the stylesheet.
 */
export type CardPageCustomProperty =
  | "--page-width"
  | "--page-height"
  | "--page-margin"
  | "--page-card-gap"
  | "--page-grid-inset";

/** Those properties with their values, ready to set as an inline style. */
export type CardPageStyle = Readonly<
  Record<CardPageCustomProperty, string>
>;

/** What an entry turned out to cost the sheet. */
export interface FaceCountReport {
  /** The entry that was counted. */
  readonly cardId: string;
  /** How many cards it turned out to be. */
  readonly faceCount: number;
  /**
   * Whether that came from a measurement.
   *
   * False while the entry is standing in as the one card it is at least,
   * which is what a fresh mount draws before its own measurement lands. The
   * difference decides whether a smaller count is believed.
   */
  readonly measured: boolean;
}

/** What filling a sheet needs. */
export interface UsePageFillOptions {
  /** The entries to draw from, in reading order. */
  cards: readonly Card[];
  /** The geometry they are measured against. */
  layout: CardLayout;
  /** The sheet they go on, which is what decides how many of them each holds. */
  sheet: SheetLayout;
}

/** The sheets the entries fill, and the way entries report their cost. */
export interface PageFill {
  /** One run of cards per sheet, in reading order. */
  readonly sheets: readonly (readonly SheetPlacement<Card>[])[];
  /** Told what an entry turned out to cost. Stable, so an entry reports once. */
  readonly reportFaceCount: (report: FaceCountReport) => void;
  /**
   * Whether the sheets have stopped moving. False again the moment a
   * measurement lands, so it gates rather than only announcing once.
   */
  readonly settled: boolean;
}
