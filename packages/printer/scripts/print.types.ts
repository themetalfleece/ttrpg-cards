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

/** One flip setting the harness drives, and what it expects to see because of it. */
export interface FlipEdgeRun {
  /** What the control calls it, which is how the harness picks it. */
  readonly option: string;
  /** Where this run's renders are written, under the render directory. */
  readonly directory: string;
  /** The axis a back page reverses at this setting, on portrait paper. */
  readonly axis: MirrorAxis;
}
