import type { FlipEdgeRun, PaperRun } from "./print.types.ts";

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
export const CUT_GUIDE_CONTROL = "Cut guides";

/** What the two fields for a paper the reader measures are called. */
export const CUSTOM_WIDTH_FIELD = "Paper width";
export const CUSTOM_HEIGHT_FIELD = "Paper height";

/** The settings every run is made at, so a measurement means one thing. */
export const A4_OPTION = "A4";
export const PORTRAIT_OPTION = "Portrait";
export const ONE_SIDED_OPTION = "One sided";
export const TWO_SIDED_OPTION = "Two sided";
export const GUIDES_ON_OPTION = "On";
export const GUIDES_OFF_OPTION = "Off";

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
 * The papers the harness drives, and what the fixture comes to on each.
 *
 * A published pair and one the reader measures, which is the point of the
 * set: no part of the layout may assume a sheet, so the check is that a paper
 * nobody published lays out by the same arithmetic as the two that were.
 *
 * Every number is written out rather than read from the print package, the
 * same rule the mirror axis is held to. The sizes are the papers as published
 * and the third as it is typed in; the counts follow from them at the
 * settings every run pins, with a card cut to
 * {@link CARD_WIDTH_MILLIMETRES} by {@link CARD_HEIGHT_MILLIMETRES} and the
 * blank between two of them at two millimetres:
 *
 * - A4 leaves 194 by 281 inside its 8mm margins, which is three columns of
 *   65 and three rows of 90, so nine cards.
 * - Letter leaves 205.9 by 269.4 inside its 5mm margins, which is also three
 *   by three. The same nine on a sheet 17.6mm shorter is what the margin
 *   belonging to the paper buys.
 * - The measured sheet is A5, 148 by 210, and gets the printer-safe 5mm,
 *   leaving 138 by 200: two columns and two rows, so four.
 *
 * The fixture is thirteen entries, one of which runs onto a continuation, so
 * fourteen cards printed on one side. Nine to a sheet is two pages; four to a
 * sheet is four.
 */
export const PAPER_RUNS: readonly PaperRun[] = [
  {
    option: A4_OPTION,
    directory: "a4",
    widthMillimetres: 210,
    heightMillimetres: 297,
    pageCount: 2,
    cardsPerPage: 9,
  },
  {
    option: "US Letter",
    directory: "letter",
    widthMillimetres: 215.9,
    heightMillimetres: 279.4,
    pageCount: 2,
    cardsPerPage: 9,
  },
  {
    option: "Custom",
    directory: "custom",
    widthMillimetres: 148,
    heightMillimetres: 210,
    typed: true,
    pageCount: 4,
    cardsPerPage: 4,
  },
];

/**
 * The card the sheet is cut to, written out for the same reason the papers
 * above are: this is where what a browser drew is checked against what the
 * app was asked for, and reading the answer off the app would check nothing.
 *
 * The standard cut, which is what {@link CARD_SIZE_OPTION} picks.
 */
export const CARD_WIDTH_MILLIMETRES = 63;
export const CARD_HEIGHT_MILLIMETRES = 88;

/**
 * How far a printed card may be off the size it is cut to.
 *
 * Half a millimetre is about what a hand and a steel rule can hold, so a card
 * inside it is a card a reader cannot tell from the right one. Anything that
 * went wrong in the conversion from millimetres to the page is far larger.
 */
export const CARD_TOLERANCE_MILLIMETRES = 0.5;

/** How far a cut guide should reach out from a card, which is the card gap. */
export const GUIDE_REACH_MILLIMETRES = 2;

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

/**
 * Drains the colour out of the preview, so every run also produces the sheet
 * as a mono laser prints it.
 *
 * Most of these come off a printer with one toner cartridge, and a theme that
 * separates two regions by hue alone reads on screen and disappears on paper.
 * The contrast tests in the card package prove that from the numbers; this is
 * the same claim as a picture somebody can look at.
 *
 * Applied for the capture and taken straight off again: a filter makes the
 * element it is on a containing block, which is not something to leave over a
 * page that is about to be measured.
 */
export const GRAYSCALE_STYLE = "html { filter: grayscale(1); }";

/**
 * The files each run writes, beside one picture per page.
 *
 * Page one rather than all of them for the grayscale render: it is there to
 * be looked at, and every sheet is drawn by the same rules.
 */
export const GRAYSCALE_RENDER = "sheet-1-grayscale.png";
export const PRINTED_FILE = "sheets.pdf";

/**
 * Where the check on paper measurements looks, and what it skips.
 *
 * Everything the repository writes by hand, and none of what a build or a run
 * leaves behind: a measurement inside a bundled chunk is the one in the
 * source, compiled, and reporting it twice would bury the real answer.
 */
export const SOURCE_DIRECTORIES: readonly string[] = [
  "packages",
  "features",
  "apps",
];
export const SOURCE_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".css",
];
export const SKIPPED_DIRECTORIES: readonly string[] = [
  "node_modules",
  "out",
  ".next",
  ".turbo",
  "storybook-static",
  "dist",
  RENDER_DIRECTORY,
];

/**
 * The only files allowed to write a paper measurement down.
 *
 * The same rule a card measurement keeps: the record that declares it, the
 * test that pins the record, and the harness that restates it to check a
 * browser really printed on it. Anywhere else is a second copy of a number
 * that has to move as one, and the one that gets missed is the one nobody
 * was looking at.
 *
 * Written with forward slashes and compared against a path normalised the
 * same way, so the check reads the same on every machine.
 */
export const PAPER_MEASUREMENT_HOMES: readonly string[] = [
  "packages/printer/src/sheet/sheet.constants.ts",
  "packages/printer/src/sheet/SheetLayout.test.ts",
  "packages/printer/scripts/print.constants.ts",
];
