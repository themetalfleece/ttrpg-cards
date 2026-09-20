import type { CardLayout } from "@ttrpg-cards/card";
import type { Dimensions, NamedOption } from "@ttrpg-cards/core";

import type {
  PAGE_ORIENTATION_NAMES,
  PAGE_SIZE_PRESETS,
} from "./sheet.constants";

/** The name of a paper the app prints on. */
export type PageSizeName = keyof typeof PAGE_SIZE_PRESETS;

/** Which way round the paper goes. */
export type PageOrientation = keyof typeof PAGE_ORIENTATION_NAMES;

/**
 * A paper: its dimensions in portrait, the way paper sizes are published, and
 * the margin that suits it.
 */
export interface PagePreset extends Dimensions {
  /** The blank kept inside each edge of this paper. */
  readonly marginMillimetres: number;
}

/** One selectable paper. */
export type PageSizeOption = NamedOption<PageSizeName>;

/** One selectable orientation. */
export type PageOrientationOption = NamedOption<PageOrientation>;

/** A complete sheet setup, every field a name from a closed set. */
export interface SheetLayoutSettings {
  /** The paper it is printed on, which is also where its margin comes from. */
  readonly size: PageSizeName;
  /** Which way round that paper goes. */
  readonly orientation: PageOrientation;
}

/**
 * A change to part of a sheet setup. Anything left out keeps the value it had,
 * so the paper changes without restating which way round it goes.
 */
export interface SheetLayoutOverrides {
  size?: PageSizeName;
  orientation?: PageOrientation;
}

/** Something a sheet can pack, which it counts by id. */
export interface SheetItem {
  /** What the measured count of cards is recorded against. */
  readonly id: string;
}

/** What packing a sheet needs. */
export interface SheetFillOptions<Item extends SheetItem> {
  /** The entries to draw from, in reading order. */
  readonly items: readonly Item[];
  /** The geometry each is cut to, which is what decides how many fit. */
  readonly layout: CardLayout;
  /**
   * How many cards each entry turned out to be, by id. An entry missing from
   * this is counted as the one card it is at least.
   */
  readonly faceCounts: ReadonlyMap<string, number>;
}
