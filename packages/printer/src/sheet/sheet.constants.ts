import { optionsFrom } from "@ttrpg-cards/core";

import type {
  FlipEdgeName,
  FlipEdgeOption,
  PageOrientation,
  PageOrientationOption,
  PagePreset,
  PageSizeName,
  PageSizeOption,
  PrintSidesName,
  PrintSidesOption,
} from "./sheet.types";

/**
 * The papers the app prints on, in portrait, which is how paper sizes are
 * published, each with the margin that suits it.
 *
 * **This is the one place a paper measurement is written down**, the way
 * `CARD_LAYOUT_PRESETS` is for a card. Adding a paper is an entry here and the
 * name it is picked by below.
 *
 * **The margin belongs to the paper rather than to the reader**, because it is
 * not really a preference: it is whatever is left once the grid has had what it
 * needs, and the two papers have different amounts left. Three standard cards
 * down a sheet is 264mm of card and {@link CARD_GAP_MILLIMETRES} twice between
 * them. A4 has 297mm and can spare 8mm a side. Letter has 279.4mm, which leaves
 * about 11mm for both margins together, so 5mm a side is the most it takes
 * while still holding three rows. Raising Letter's margin does not tighten the
 * sheet, it costs a third of it.
 */
export const PAGE_SIZE_PRESETS = {
  a4: {
    widthMillimetres: 210,
    heightMillimetres: 297,
    marginMillimetres: 8,
  },
  letter: {
    widthMillimetres: 215.9,
    heightMillimetres: 279.4,
    marginMillimetres: 5,
  },
} as const satisfies Record<string, PagePreset>;

/**
 * Which way round the paper goes, and what a picker calls each way.
 *
 * The names are the record rather than a companion to one, because an
 * orientation carries no measurement of its own: it only says which of the
 * paper's two dimensions is the width.
 */
export const PAGE_ORIENTATION_NAMES = {
  portrait: "Portrait",
  landscape: "Landscape",
} as const;

/**
 * How many sides of the paper a job prints on, and what a picker calls each.
 *
 * Two sided is what puts an entry's continuation on the back of its own slot,
 * so one cut gives a card carrying the whole entry instead of two to keep
 * together. It costs a page per sheet whether or not the backs are used, which
 * is why it is a choice rather than the way sheets are always made.
 */
export const PRINT_SIDES_NAMES = {
  single: "One sided",
  double: "Two sided",
} as const;

/**
 * The edge a duplex printer turns the sheet about between one side and the
 * other, and what a picker calls each.
 *
 * Both are offered because drivers disagree about what they call them, and a
 * reader who picks the one their driver does not mean gets a stack of cards
 * whose backs belong to their neighbours. Naming the assumption is cheaper
 * than a support answer nobody is there to give.
 */
export const FLIP_EDGE_NAMES = {
  "long-edge": "Long edge",
  "short-edge": "Short edge",
} as const;

/**
 * What a picker calls each paper.
 *
 * Kept beside the presets rather than inside one, so a preset stays the
 * dimensions and nothing else. `satisfies` ties the two together, so a paper
 * added without a name does not compile.
 */
const PAGE_SIZE_NAMES = {
  a4: "A4",
  letter: "US Letter",
} as const satisfies Record<PageSizeName, string>;

/**
 * Every paper the app prints on, in the order a picker should offer them.
 *
 * @example
 * ```ts
 * PAGE_SIZES.map((paper) => paper.id); // ["a4", "letter"]
 * ```
 */
export const PAGE_SIZES: readonly PageSizeOption[] =
  optionsFrom(PAGE_SIZE_NAMES);

/** Both orientations, in the order a picker should offer them. */
export const PAGE_ORIENTATIONS: readonly PageOrientationOption[] =
  optionsFrom(PAGE_ORIENTATION_NAMES);

/** Both ways of printing a job, in the order a picker should offer them. */
export const PRINT_SIDES: readonly PrintSidesOption[] =
  optionsFrom(PRINT_SIDES_NAMES);

/** Both flip edges, in the order a picker should offer them. */
export const FLIP_EDGES: readonly FlipEdgeOption[] =
  optionsFrom(FLIP_EDGE_NAMES);

/** The paper a sheet starts on when nothing has chosen another. */
export const DEFAULT_PAGE_SIZE: PageSizeName = "a4";

/** The way round a sheet starts when nothing has chosen another. */
export const DEFAULT_PAGE_ORIENTATION: PageOrientation = "portrait";

/**
 * How many sides a job prints on when nothing has chosen. One, because two
 * costs a page per sheet and most sets have nothing to put on the backs.
 */
export const DEFAULT_PRINT_SIDES: PrintSidesName = "single";

/**
 * The edge a job turns the sheet about when nothing has chosen. The long one,
 * which is what a driver offering only one of them means.
 */
export const DEFAULT_FLIP_EDGE: FlipEdgeName = "long-edge";

/**
 * The blank between two cards, so a cut along one is not a cut into the other.
 *
 * Wide enough to give a blade somewhere to land, and no wider: every
 * millimetre here comes off the margin, because both are competing for what
 * the grid does not use. See {@link PAGE_SIZE_PRESETS} for that arithmetic.
 *
 * Fixed for now. A reader-set gutter belongs with cut guides, in the work that
 * turns this sheet into something a trimmer can follow.
 */
export const CARD_GAP_MILLIMETRES = 2;
