import type { FlipEdgeRun } from "./print.types.ts";

/**
 * How a drawn page is found.
 *
 * By the name it calls itself, rather than by a class: the stylesheets are CSS
 * modules and their class names are hashed by the build, so what survives into
 * the export is the accessible name. A card is an `article` for the same
 * reason.
 */
export const PAGE_SELECTOR = "section[aria-label^='Card page']";

/** How a card is found inside a page. */
export const CARD_SELECTOR = "article";

/**
 * What each control the harness drives is called on screen.
 *
 * The app's own copy, restated because the harness drives the app the way a
 * reader does: through the labels and roles, not through its internals. A
 * label that changes without this changing fails the run with a timeout
 * naming the control, which is the right way for it to break.
 */
export const TEXT_SIZE_CONTROL = "Text size";
export const CARD_SIZE_CONTROL = "Card size";
export const TYPEFACE_CONTROL = "Type";
export const PAPER_CONTROL = "Paper";
export const ORIENTATION_CONTROL = "Orientation";
export const SIDES_CONTROL = "Sides";
export const FLIP_EDGE_CONTROL = "Flip on";

/** The settings every run is made at, so a measurement means one thing. */
export const A4_OPTION = "A4";
export const PORTRAIT_OPTION = "Portrait";
export const TWO_SIDED_OPTION = "Two sided";

/**
 * The text band the fixture is verified at.
 *
 * Pinned rather than left at the default, because the document is written to
 * overrun a card and how large the type is set is exactly what decides whether
 * it does. The largest band, so the split is comfortably past the edge rather
 * than a line either side of it.
 */
export const TEXT_SIZE_OPTION = "Large";

/**
 * The cut the fixture's slot counts are written for.
 *
 * Pinned for the same reason as the text band, and the one the counts in
 * `print.fixtures.ts` rest on: nine slots to an A4 sheet is the standard cut.
 * At the mini cut all thirteen entries fit on one sheet, so there is no blank
 * back left to check.
 */
export const CARD_SIZE_OPTION = "Standard";

/**
 * The pairing the split is written for: the one that fits the most per card.
 *
 * Which is what makes it the pinned one. Whether the long entry overruns a
 * card is decided by how much a card holds, and a pairing that holds less
 * would split entries the fixture expects to stand alone.
 */
export const TYPEFACE_OPTION = "Rounded";

/** Where the reader's own document goes, and what sends it to the page. */
export const PASTE_FIELD = "Paste Markdown";
export const ADD_BUTTON = "Add cards";

/**
 * The flip settings the harness drives, and the axis each one reverses.
 *
 * The axis is written out here rather than read from `SheetLayout.mirrorAxis`,
 * which is the point of the exercise: an expectation taken from the code under
 * test agrees with it however wrong both are. On portrait paper the long edge
 * runs down the page, so a sheet turned about it swaps left for right and the
 * columns reverse; turned about the short edge it swaps top for bottom and the
 * rows do. Every run is made on portrait paper, which is what makes that
 * sentence the whole rule.
 */
export const FLIP_EDGE_RUNS: readonly FlipEdgeRun[] = [
  { option: "Long edge", directory: "long-edge", axis: "columns" },
  { option: "Short edge", directory: "short-edge", axis: "rows" },
];

/**
 * How far two measurements may differ and still be the same place on paper.
 *
 * A quarter of a millimetre is about a pixel at the ratio a browser draws
 * millimetres at, which is the rounding a laid out edge carries. Anything a
 * mirror got wrong is a column or a row out, which is tens of millimetres.
 */
export const TOLERANCE_MILLIMETRES = 0.25;

/**
 * How far the printed paper may differ from the paper that was picked.
 *
 * Looser than the tolerance above because a PDF is measured in points and A4
 * is 595.28 of them across, so the printer rounds where the screen does not.
 * The failure this guards against is Letter instead of A4, which is 6mm out
 * one way and 18mm the other.
 */
export const PAPER_TOLERANCE_MILLIMETRES = 1;

/** How long the harness waits for a control, a page, or a print. */
export const WAIT_MILLISECONDS = 120_000;

/** How long it leaves between samples while waiting for the layout to stop. */
export const SAMPLE_MILLISECONDS = 250;

/**
 * How many samples in a row have to match before the page counts as finished.
 *
 * Three. Cards measure themselves as they mount, a measurement moves a sheet
 * boundary, and the cards that moved measure again, so the page arrives at its
 * answer over several rounds with pauses inside them. One match is a pause
 * between rounds.
 */
export const STEADY_SAMPLES = 3;

/** Where the renders are written, which is ignored by git. */
export const RENDER_DIRECTORY = ".print-verification";
