import type { NumericRange } from "./range.types";

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
