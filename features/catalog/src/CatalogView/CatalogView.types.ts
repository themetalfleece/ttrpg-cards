import type {
  Card,
  CardLayout,
  CardLayoutPresetName,
  CardTextSizeName,
  CardThemeId,
  CardTypefaceId,
} from "@ttrpg-cards/card";
import type { ImportIssue } from "@ttrpg-cards/importer";
import type {
  SheetLayout,
  SheetLayoutOverrides,
} from "@ttrpg-cards/printer";
import type { CatalogAttribution } from "@ttrpg-cards/srd";

/** Cards on a page, with the controls that change it. */
export interface CatalogViewProps {
  /** Passed through for a consumer that positions the view. */
  className?: string | undefined;
}

/** The cards a reader has brought so far, and how the last document went. */
export interface BroughtCards {
  /** Every card they have added, in the order they added them. */
  readonly cards: readonly Card[];
  /** How many of those the document they added last brought. */
  readonly addedCount: number;
  /** The parts of that document that did not read as a card. */
  readonly issues: readonly ImportIssue[];
}

/**
 * What the reader has brought, as the panel needs to say it.
 *
 * Two counts rather than one, because they answer different questions: the
 * total is what is on the page, and what the last document added is the only
 * thing that says whether pressing the button did anything.
 */
export interface ImportSummary {
  /** How many cards the reader has brought in total. */
  readonly totalCount: number;
  /** How many of those the document they added last brought, if any. */
  readonly addedCount: number;
  /** The parts of that document that did not read as a card. */
  readonly issues: readonly ImportIssue[];
}

/**
 * How much of the bundled catalog the page is laying out.
 *
 * The bundled cards are a sample the app opens on rather than a set anybody
 * chose, so the page shows some of them and says so. Nothing a reader brings
 * is ever counted here: what they hand over is laid out in full.
 */
export interface BundledSample {
  /** How many of them the page is laying out. */
  readonly shown: number;
  /** How many the app bundles in total. */
  readonly total: number;
}

/** What the page is drawn from, and what changes it. */
export interface CatalogSelection {
  /** The colour theme every card on the page is drawn in. */
  readonly theme: CardThemeId;
  /** The pairing of faces every card on the page is set in. */
  readonly typeface: CardTypefaceId;
  /** The size every card on the page is cut to. */
  readonly size: CardLayoutPresetName;
  /** How large the type on every card is set, everywhere on the card. */
  readonly textSize: CardTextSizeName;
  /**
   * The geometry those two lay out at. One identity per pair, because a new
   * one re-measures every card on the page.
   */
  readonly layout: CardLayout;
  /**
   * The sheet the cards are laid out on: the paper, the way round it goes,
   * how many sides it prints on, the edge it flips about, and whether it
   * carries cut guides.
   *
   * The sheet itself rather than those settings one by one, because it is a
   * value object that already answers every question about them and already
   * knows how to produce the next one. A control reads what it shows off the
   * sheet and hands a change back through `changeSheet`.
   */
  readonly sheet: SheetLayout;
  /**
   * The entries the sheet draws from, in the order they were written: the
   * cards the reader brought when they brought any, the bundled ones
   * otherwise.
   */
  readonly cards: readonly Card[];
  /** What the licence obliges the page to show for what is on it. */
  readonly attributions: readonly CatalogAttribution[];
  /** What the reader has brought, or undefined until they bring something. */
  readonly importSummary: ImportSummary | undefined;
  /** How much of the bundled catalog is on the page until they do. */
  readonly bundled: BundledSample;
  /**
   * How much the preview is drawn larger or smaller than CSS would have it,
   * so a card on screen is the size it will be cut to. 1 until calibrated.
   */
  readonly screenScale: number;
  /** Picks a colour theme. */
  readonly chooseTheme: (theme: CardThemeId) => void;
  /** Picks a pairing of faces. */
  readonly chooseTypeface: (typeface: CardTypefaceId) => void;
  /** Picks a card size. */
  readonly chooseSize: (size: CardLayoutPresetName) => void;
  /** Picks how large the type is set. */
  readonly chooseTextSize: (textSize: CardTextSizeName) => void;
  /**
   * Changes part of the sheet, leaving the rest as it was.
   *
   * One way in for every sheet setting rather than one per setting, because
   * `SheetLayout.with` is already exactly that and a second copy of it here
   * would be a list to keep in step. It is also what holds a paper the reader
   * typed to what a sheet can be, since that happens in the constructor `with`
   * calls.
   */
  readonly changeSheet: (overrides: SheetLayoutOverrides) => void;
  /** Sets how much the preview is scaled by. */
  readonly chooseScreenScale: (scale: number) => void;
  /** Reads the documents the reader brought, adding their cards to the page. */
  readonly importMarkdown: (sources: readonly string[]) => void;
  /** Takes every card they brought off, and puts the bundled ones back. */
  readonly clearImport: () => void;
}

/**
 * The custom property the preview is drawn at, so a card on screen can be the
 * size it will be cut to.
 */
export type CatalogViewCustomProperty = "--screen-scale";

/** That property with its value, ready to set as an inline style. */
export type CatalogViewStyle = Readonly<
  Record<CatalogViewCustomProperty, string>
>;
