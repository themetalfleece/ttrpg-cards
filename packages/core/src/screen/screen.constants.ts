import type { NumericRange } from "../range";

/**
 * What the correction between CSS and a real display may be set to.
 *
 * **A CSS millimetre is not a millimetre.** The specification fixes an inch at
 * 96 pixels, so a length in `mm` is only physical on a display that happens to
 * be 96 pixels to the inch, and nothing in the browser reports what a display
 * really is: `devicePixelRatio` is device pixels per CSS pixel, which is a
 * different thing. The only way to find out is to have a reader match
 * something they are holding against what is drawn, and this is the range
 * their answer may take.
 *
 * It is the ratio between a display's effective pixels per inch and 96, so the
 * bounds cover the displays people have: roughly 58 ppi at the bottom, 307 at
 * the top. It starts at 1, which is CSS taken at its word and right for a 96
 * ppi display.
 *
 * The step is fine enough to land on a match with no visible gap, and coarse
 * enough that dragging gets there.
 */
export const SCREEN_SCALE_RANGE: NumericRange = {
  minimum: 0.6,
  maximum: 3.2,
  step: 0.005,
  initial: 1,
};
