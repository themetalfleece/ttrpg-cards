/**
 * The bounds a number is allowed to take, and where it starts.
 *
 * `NumericRange` rather than `Range`, because the DOM already has a `Range`
 * and a consumer importing ours would shadow it in that file.
 */
export interface NumericRange {
  /** The smallest it may be. */
  readonly minimum: number;
  /** The largest it may be. */
  readonly maximum: number;
  /** The smallest change it moves in. */
  readonly step: number;
  /** What it is until somebody says otherwise. */
  readonly initial: number;
}
