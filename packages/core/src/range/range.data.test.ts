import { describe, expect, it } from "vitest";

import { clampToRange } from "./range.data";
import type { NumericRange } from "./range.types";

/** A range with round numbers, for reading the arithmetic off the test. */
const range: NumericRange = {
  minimum: 1,
  maximum: 10,
  step: 0.5,
  initial: 4,
};

describe("clampToRange", () => {
  it("leaves a value the range already allows", () => {
    expect(clampToRange({ value: 6, range })).toBe(6);
  });

  it("holds a value to each end of the range", () => {
    expect(clampToRange({ value: 99, range })).toBe(range.maximum);
    expect(clampToRange({ value: -99, range })).toBe(range.minimum);
  });

  it("keeps a value already sitting on an end", () => {
    expect(clampToRange({ value: range.minimum, range })).toBe(
      range.minimum,
    );
    expect(clampToRange({ value: range.maximum, range })).toBe(
      range.maximum,
    );
  });

  // Worse than a wrong number: it propagates into every arithmetic it touches
  // and collapses whatever reads it. The input is a dragged control or a
  // stored value somebody could have edited.
  it("falls back to where the range starts for anything that is not a number", () => {
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(clampToRange({ value, range })).toBe(range.initial);
    }
  });

  it("does not round to the step, which is the control's business", () => {
    expect(clampToRange({ value: 6.3, range })).toBe(6.3);
  });
});
