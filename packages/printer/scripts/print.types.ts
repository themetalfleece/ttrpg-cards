/** Which face of a piece of paper a drawn page is. */
export type RenderedSide = "front" | "back";

/**
 * The grid axis a back page reverses.
 *
 * Restated here rather than imported from the print package on purpose: this
 * harness exists to check that package against a browser, and an expectation
 * taken from the thing under test cannot fail.
 */
export type MirrorAxis = "columns" | "rows";

/**
 * The cut guides around one card, as the browser drew them.
 *
 * Marks in the blank around a card rather than a line on it, so what says
 * they are there is that something is painted outside the card's own box.
 */
export interface RenderedGuides {
  /**
   * Whether marks covering real pixels were drawn in both directions,
   * across and down.
   *
   * Pixels rather than layers: the guides come off by their background
   * shrinking to nothing, and a gradient measuring zero on a side is still a
   * gradient. Reading the layers alone would call an unmarked card marked.
   */
  readonly painted: boolean;
  /**
   * How far they reach out from the card's cut line, or zero for none.
   *
   * Outward is the whole claim: a mark drawn inside the card is on the card
   * once it is cut out, and no blade can take it off again.
   */
  readonly reachMillimetres: number;
}

/**
 * One card as the browser drew it, measured in from each edge of the paper.
 *
 * Millimetres rather than pixels, because the claim being checked is about
 * paper. The conversion comes from the sheet's own `--page-width`, so the
 * harness needs no paper measurement of its own.
 */
export interface RenderedCard {
  /** The name in its title band, which is how a card is recognised. */
  readonly name: string;
  /** Its position in a set, `1/2`, or empty for a card that stands alone. */
  readonly position: string;
  readonly leftMillimetres: number;
  readonly rightMillimetres: number;
  readonly topMillimetres: number;
  readonly bottomMillimetres: number;
  /** How large it came out, which is what a reader cuts to. */
  readonly widthMillimetres: number;
  readonly heightMillimetres: number;
  /** The marks in the blank around it, for the blade to follow. */
  readonly guides: RenderedGuides;
}

/** One page of the preview, and what sits where on it. */
export interface RenderedPage {
  /** What the page calls itself, which is also where the rest of this is read from. */
  readonly label: string;
  /** Which piece of paper it is on, counted from one. Both sides share it. */
  readonly number: number;
  /** How many pieces of paper the run came to. */
  readonly total: number;
  /** Which side of that paper, or `undefined` when the job prints one sided. */
  readonly side: RenderedSide | undefined;
  readonly widthMillimetres: number;
  readonly heightMillimetres: number;
  /** The cards drawn on it, in the order they appear in the markup. */
  readonly cards: readonly RenderedCard[];
}

/**
 * A printed file as it came out of the browser.
 *
 * The only artifact in the run made under print media, so it is the only one
 * that can say what paper the job actually went onto. Everything else is
 * measured on screen.
 */
export interface PrintedPdf {
  readonly pageCount: number;
  readonly widthMillimetres: number;
  readonly heightMillimetres: number;
}

/** What one check concluded, and the evidence it concluded it from. */
export interface CheckResult {
  /** What was checked, short enough to read down a column. */
  readonly name: string;
  readonly passed: boolean;
  /** The measurement or count behind the verdict, pass or fail. */
  readonly detail: string;
}

/**
 * One paper the harness drives, and everything it expects to see on it.
 *
 * Every number here is written out rather than read from the print package,
 * for the same reason the mirror axis is: an expectation taken from the code
 * under test agrees with it however wrong both are. These are the measured
 * sizes of the papers, and the counts a sheet of each holds, worked out by
 * hand from the fixture at the settings the run pins.
 */
export interface PaperRun {
  /** What the paper control calls it, which is how the harness picks it. */
  readonly option: string;
  /** Where this run's renders are written, under the render directory. */
  readonly directory: string;
  /** How large the paper is in portrait, which is how it is driven. */
  readonly widthMillimetres: number;
  readonly heightMillimetres: number;
  /**
   * The measurements to type in, for the paper that is measured rather than
   * published. Left off for one that carries its own.
   */
  readonly typed?: boolean;
  /** How many pages the fixture comes to on this paper, printed one sided. */
  readonly pageCount: number;
  /** How many cards its full sheets hold. */
  readonly cardsPerPage: number;
}

/** One flip setting the harness drives, and what it expects to see because of it. */
export interface FlipEdgeRun {
  /** What the control calls it, which is how the harness picks it. */
  readonly option: string;
  /** Where this run's renders are written, under the render directory. */
  readonly directory: string;
  /** The axis a back page reverses at this setting, on portrait paper. */
  readonly axis: MirrorAxis;
}
