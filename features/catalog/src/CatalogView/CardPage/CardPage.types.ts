import type {
  Card,
  CardLayout,
  CardThemeId,
} from "@ttrpg-cards/card";
import type { SheetLayout } from "@ttrpg-cards/printer";

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
  /** The entry that was measured. */
  readonly cardId: string;
  /** How many cards it turned out to be. */
  readonly faceCount: number;
}

/** What filling a sheet needs. */
export interface UsePageFillOptions {
  /** The entries to draw from, in reading order. */
  cards: readonly Card[];
  /** The geometry they are measured against. A new one starts the count over. */
  layout: CardLayout;
  /** The sheet they go on, which is what decides how many of them do. */
  sheet: SheetLayout;
}

/** A sheet filled as far as it goes, and the way entries report their cost. */
export interface PageFill {
  /** The entries that fit, in reading order. */
  readonly shown: readonly Card[];
  /** Told what an entry turned out to cost. Stable, so an entry reports once. */
  readonly reportFaceCount: (report: FaceCountReport) => void;
}
