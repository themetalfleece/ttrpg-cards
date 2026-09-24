import {
  optionsFrom,
  type Dimensions,
  type NumericRange,
} from "@ttrpg-cards/core";

import type {
  CutGuidesName,
  CutGuidesOption,
  FlipEdgeName,
  FlipEdgeOption,
  PageOrientation,
  PageOrientationOption,
  PagePreset,
  PageSizeOption,
  PaperName,
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
 * Whether the sheet carries the marks a blade is lined up against, and what a
 * picker calls each.
 *
 * Off by default. Guides are ink, and ink is the reader's to ask for: a sheet
 * going to a trimmer wants them, and one going anywhere else comes out marked
 * by something nobody asked for. Turned on they cost no paper, since they sit
 * in the blank that is thrown away with the offcut.
 */
export const CUT_GUIDE_NAMES = {
  on: "On",
  off: "Off",
} as const;

/**
 * The paper a reader gives the measurements for themselves, picked by name
 * like any published one.
 *
 * Not a preset, and it cannot be: a preset is dimensions, and these arrive
 * from the reader. Everything downstream still works in millimetres off
 * {@link SheetLayout}, so no layout code learns that a sheet can be custom.
 */
export const CUSTOM_PAGE_SIZE = "custom" as const;

/**
 * What a picker calls each paper.
 *
 * Kept beside the presets rather than inside one, so a preset stays the
 * dimensions and nothing else. `satisfies` ties the two together, so a paper
 * added without a name does not compile.
 */
export const PAGE_SIZE_NAMES = {
  a4: "A4",
  letter: "US Letter",
  [CUSTOM_PAGE_SIZE]: "Custom",
} as const satisfies Record<
  PaperName | typeof CUSTOM_PAGE_SIZE,
  string
>;

/**
 * The blank a custom paper keeps inside each edge.
 *
 * A published paper carries its own margin, worked out from what its grid does
 * not need. A paper the reader measured has no such arithmetic behind it, so
 * the only thing that can be known about it is the printer: no consumer desk
 * printer puts ink right to the paper's edge, and a laser's unprintable band
 * is typically 4.2mm, a sixth of an inch. Five clears that on every machine
 * this app is aimed at, and it is the tightest margin already shipping, on
 * Letter. Any grid leftover beyond it is centred by the insets, so a custom
 * paper is not held to five: five is the floor.
 */
export const PRINTER_SAFE_MARGIN_MILLIMETRES = 5;

/**
 * How large a side of a custom paper may be, and how finely it is set.
 *
 * Both ends are about staying honest rather than about paper that exists. The
 * floor is under every card the app cuts, so a reader who asks for something
 * nothing fits on is told exactly that instead of being stopped from asking.
 * The ceiling is past the longest side of the largest ISO sheet, so no paper a
 * printer takes is out of reach. Tenths, because a published paper is measured
 * in them: Letter is 215.9mm across.
 *
 * `initial` is only what a value that is not a number at all falls back to.
 * Where a custom paper starts is {@link DEFAULT_CUSTOM_PAGE_SIZE}.
 */
export const CUSTOM_PAGE_SIDE_RANGE: NumericRange = {
  minimum: 50,
  maximum: 1200,
  step: 0.1,
  initial: 100,
};

/**
 * Every paper the app prints on, in the order a picker should offer them.
 *
 * @example
 * ```ts
 * PAGE_SIZES.map((paper) => paper.id); // ["a4", "letter", "custom"]
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

/** Both cut guide settings, in the order a picker should offer them. */
export const CUT_GUIDES: readonly CutGuidesOption[] =
  optionsFrom(CUT_GUIDE_NAMES);

/**
 * The paper a sheet starts on when nothing has chosen another.
 *
 * A published one, so it carries its own measurements: a sheet that opened on
 * the custom paper would open on whatever was last typed into it.
 */
export const DEFAULT_PAGE_SIZE: PaperName = "a4";

/**
 * The paper a custom sheet starts at: whatever the default paper measures.
 *
 * Taken from the preset rather than written out, so it is not a third copy of
 * a sheet dimension, and so a reader who picks Custom begins from the sheet
 * they were already looking at and adjusts it.
 */
export const DEFAULT_CUSTOM_PAGE_SIZE: Dimensions = {
  widthMillimetres:
    PAGE_SIZE_PRESETS[DEFAULT_PAGE_SIZE].widthMillimetres,
  heightMillimetres:
    PAGE_SIZE_PRESETS[DEFAULT_PAGE_SIZE].heightMillimetres,
};

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
 * Whether a sheet carries cut guides when nothing has chosen. It does not:
 * marks are ink a reader asks for rather than ink they have to notice and
 * turn off.
 */
export const DEFAULT_CUT_GUIDES: CutGuidesName = "off";

/**
 * The blank between two cards, so a cut along one is not a cut into the other.
 *
 * Wide enough to give a blade somewhere to land, and no wider: every
 * millimetre here comes off the margin, because both are competing for what
 * the grid does not use. See {@link PAGE_SIZE_PRESETS} for that arithmetic.
 *
 * It is also how far a cut guide reaches out from a card, so two neighbours'
 * guides meet and the cut line runs unbroken across the blank between them.
 * Widening this widens them with it, which is the behaviour to want. See
 * {@link SheetLayout.cutGuideReachMillimetres}.
 */
export const CARD_GAP_MILLIMETRES = 2;
