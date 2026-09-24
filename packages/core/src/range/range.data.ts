import type { NumericRange } from "./range.types";

/** As many places as `toFixed` will give, for a number too small to read one off. */
const MAXIMUM_DECIMALS = 100;

/**
 * `value` held to `range`, for input that came from outside: a dragged
 * control, a stored preference read back, a hand-edited setting.
 *
 * Anything that is not a usable number falls back to where the range starts,
 * because a value of `NaN` is worse than a wrong one: it propagates into every
 * arithmetic it touches and collapses whatever reads it.
 *
 * @example
 * ```ts
 * clampToRange({ value: 5, range: SCREEN_SCALE_RANGE }); // 3.2
 * clampToRange({ value: Number.NaN, range: SCREEN_SCALE_RANGE }); // 1
 * ```
 */
export function clampToRange(options: {
  value: number;
  range: NumericRange;
}): number {
  const { value, range } = options;

  if (!Number.isFinite(value)) {
    return range.initial;
  }

  return Math.min(Math.max(value, range.minimum), range.maximum);
}

/**
 * `value` held to `range` and brought onto its step, for input that has to
 * come back as a number the range could have produced itself.
 *
 * The other half of {@link clampToRange}, and separate from it because most
 * callers do not want it: a dragged control already moves in steps, and
 * rounding a value that is only being held in bounds would move it for no
 * reason. Reach for this where a reader types a measurement, which is the one
 * case where the number arrives at whatever precision they felt like.
 *
 * **The range wins over the step.** A range whose span is not a whole number
 * of steps has no step sitting on its own maximum, and rounding to the nearest
 * one would carry a value past it: the answer comes back on the end rather
 * than off the range, because the bounds are the harder promise. What reads
 * this is deciding whether something fits, so a value it was told is in range
 * had better be.
 *
 * @example
 * ```ts
 * snapToRange({ value: 148.06, range: CUSTOM_PAGE_SIDE_RANGE }); // 148.1
 * snapToRange({ value: 9000, range: CUSTOM_PAGE_SIDE_RANGE }); // 1200
 * ```
 */
export function snapToRange(options: {
  value: number;
  range: NumericRange;
}): number {
  const { range } = options;
  const clamped = clampToRange(options);
  const steps = Math.round((clamped - range.minimum) / range.step);
  // Held again on the way out, because the rounding can move a value that was
  // already in bounds past the end it was nearest.
  const snapped = clampToRange({
    value: range.minimum + steps * range.step,
    range,
  });

  // Counting in tenths accumulates binary error, so the answer is brought back
  // to the precision the range is written at. Every part of the arithmetic
  // decides that: steps are counted from the minimum and the ends are what a
  // value is held to, so a range written to more places than its step needs
  // them all.
  const decimals = Math.max(
    decimalsOf(range.step),
    decimalsOf(range.minimum),
    decimalsOf(range.maximum),
  );

  return Number(snapped.toFixed(decimals));
}

/**
 * How many decimal places a number is written at, which is the precision a
 * value built out of it can be stated to.
 *
 * Read off the number's own text rather than computed, because a step of 0.25
 * needs two places and its logarithm says one. A number small enough to be
 * written in exponential notation has no readable place count, and rounding to
 * zero places would be worse than not rounding, so it gets the full precision.
 */
function decimalsOf(value: number): number {
  const written = String(value);

  if (written.includes("e")) {
    return MAXIMUM_DECIMALS;
  }

  return written.split(".")[1]?.length ?? 0;
}
