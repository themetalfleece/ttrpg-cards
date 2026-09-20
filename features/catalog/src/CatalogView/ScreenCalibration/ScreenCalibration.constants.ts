/** What the control is asking. */
export const CALIBRATION_LABEL = "Screen size";

/**
 * The aside the control carries, shown when a reader asks for it.
 *
 * Two things, in the order they matter. First that this changes nothing about
 * the print, because a reader who thinks it might will leave it alone. Then
 * what to do with it, which names the object rather than the measurement: a
 * card held against the glass is something anyone can do without being told a
 * number.
 */
export const CALIBRATION_HINT =
  "Only changes how large the cards look on screen, never what prints. Hold a card against the screen and drag until the two match.";
