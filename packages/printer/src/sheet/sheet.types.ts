import type { CardLayout } from "@ttrpg-cards/card";
import type { Dimensions, NamedOption } from "@ttrpg-cards/core";

import type {
  FLIP_EDGE_NAMES,
  PAGE_ORIENTATION_NAMES,
  PAGE_SIZE_PRESETS,
  PRINT_SIDES_NAMES,
} from "./sheet.constants";

/** The name of a paper the app prints on. */
export type PageSizeName = keyof typeof PAGE_SIZE_PRESETS;

/** Which way round the paper goes. */
export type PageOrientation = keyof typeof PAGE_ORIENTATION_NAMES;

/** How many sides of the paper a job prints on. */
export type PrintSidesName = keyof typeof PRINT_SIDES_NAMES;

/** The edge a duplex printer turns the sheet about between one side and the other. */
export type FlipEdgeName = keyof typeof FLIP_EDGE_NAMES;

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

/** One selectable way of printing a job. */
export type PrintSidesOption = NamedOption<PrintSidesName>;

/** One selectable flip edge. */
export type FlipEdgeOption = NamedOption<FlipEdgeName>;

/** A complete sheet setup, every field a name from a closed set. */
export interface SheetLayoutSettings {
  /** The paper it is printed on, which is also where its margin comes from. */
  readonly size: PageSizeName;
  /** Which way round that paper goes. */
  readonly orientation: PageOrientation;
  /** How many sides of it the job prints on. */
  readonly sides: PrintSidesName;
  /**
   * The edge the printer turns it about, which is what decides where a back
   * slot lands. Carried whichever way the job prints, so turning two sided
   * printing off and on again does not lose the answer.
   */
  readonly flipEdge: FlipEdgeName;
}

/**
 * A change to part of a sheet setup. Anything left out keeps the value it had,
 * so the paper changes without restating which way round it goes.
 */
export interface SheetLayoutOverrides {
  size?: PageSizeName;
  orientation?: PageOrientation;
  sides?: PrintSidesName;
  flipEdge?: FlipEdgeName;
}

/** Which face of a piece of paper a page is. */
export type SheetSide = "front" | "back";

/**
 * The grid axis a back page reverses.
 *
 * A sheet turns about one axis and keeps the other, so exactly one of the two
 * runs backwards on the far side.
 */
export type MirrorAxis = "columns" | "rows";

/** Something a sheet can pack, which it counts by id. */
export interface SheetItem {
  /** What the measured count of cards is recorded against. */
  readonly id: string;
}

/**
 * One entry's cards on one sheet.
 *
 * An entry is not always whole on a sheet: when its cards will not all fit in
 * what is left, the ones that do go there and the rest carry to the next. So a
 * sheet holds windows onto entries rather than entries.
 */
export interface SheetPlacement<Item extends SheetItem> {
  /** The entry these cards belong to. */
  readonly item: Item;
  /** Which of its cards this sheet starts at, counted from zero. */
  readonly from: number;
  /** How many of its cards this sheet holds. */
  readonly count: number;
}

/**
 * One entry's cards at one place on a page.
 *
 * `index` is the slot the first of them sits in, counted from zero in reading
 * order across the grid; a run of several fills the slots after it. A page
 * carries slots rather than a plain list because a back page's cards are in
 * the mirror of their fronts' order, with gaps wherever a front had no
 * continuation.
 */
export interface SheetSlot<
  Item extends SheetItem,
> extends SheetPlacement<Item> {
  /** Which slot of the grid its first card sits in, counted from zero. */
  readonly index: number;
}

/**
 * One printed page: a side of one piece of paper, and what sits where on it.
 */
export interface SheetPage<Item extends SheetItem> {
  /** Which piece of paper it is on, counted from one. Both sides share it. */
  readonly number: number;
  /**
   * Which side of that paper, or `undefined` when the job prints one sided
   * and the sheet has only the one.
   */
  readonly side: SheetSide | undefined;
  /** What the page carries, in slot order. Empty for a back nothing uses. */
  readonly slots: readonly SheetSlot<Item>[];
}

/**
 * A front slot and the continuation, if any, that prints on its back.
 *
 * Internal to packing: a slot is a position on the paper, so what it holds on
 * each side is settled before either page exists.
 */
export interface DuplexSlot<Item extends SheetItem> {
  /** The card on the front of the slot. */
  readonly front: SheetPlacement<Item>;
  /** The one on its back, or `undefined` where the slot has a blank back. */
  readonly back: SheetPlacement<Item> | undefined;
}

/** What packing a sheet needs. */
export interface SheetPackingOptions<Item extends SheetItem> {
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
