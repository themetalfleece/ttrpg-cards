import { describe, expect, it } from "vitest";

import { clampToRange, snapToRange } from "./range.data";
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

describe("snapToRange", () => {
  it("brings a value between two steps onto the nearer one", () => {
    expect(snapToRange({ value: 6.3, range })).toBe(6.5);
    expect(snapToRange({ value: 6.2, range })).toBe(6);
  });

  it("leaves a value already sitting on a step", () => {
    expect(snapToRange({ value: 6.5, range })).toBe(6.5);
  });

  it("holds a value to each end before rounding it", () => {
    expect(snapToRange({ value: 99, range })).toBe(range.maximum);
    expect(snapToRange({ value: -99, range })).toBe(range.minimum);
  });

  it("falls back to where the range starts for anything that is not a number", () => {
    expect(snapToRange({ value: Number.NaN, range })).toBe(
      range.initial,
    );
  });

  // Counting in tenths is where binary error shows up, and a paper measured
  // at 148.10000000000002mm would reach the `@page` rule as that text.
  it("answers at the precision the step is written at", () => {
    const tenths: NumericRange = {
      minimum: 50,
      maximum: 1200,
      step: 0.1,
      initial: 100,
    };

    expect(snapToRange({ value: 148.06, range: tenths })).toBe(148.1);
    expect(snapToRange({ value: 120.3, range: tenths })).toBe(120.3);
  });

  // A step of 0.25 needs two places and its logarithm says one, which is why
  // the precision is read off how the step is written rather than computed.
  it("keeps the places a step needs that its logarithm does not show", () => {
    const quarters: NumericRange = {
      minimum: 0,
      maximum: 10,
      step: 0.25,
      initial: 0,
    };

    expect(snapToRange({ value: 1.3, range: quarters })).toBe(1.25);
  });

  // The range starts where it starts, so a minimum that is not a whole number
  // of steps from zero still has to come back on its own grid.
  it("counts steps from the minimum rather than from zero", () => {
    const offset: NumericRange = {
      minimum: 0.3,
      maximum: 10,
      step: 1,
      initial: 0.3,
    };

    expect(snapToRange({ value: 2, range: offset })).toBe(2.3);
  });

  // A span that is not a whole number of steps has no step on its own ends,
  // so rounding to the nearest one carries a value straight past them. The
  // bounds are the harder promise: what reads this is deciding whether
  // something fits, and a value it was told is in range had better be.
  it("holds a value to the range even where no step lands on it", () => {
    const offset: NumericRange = {
      minimum: 0.3,
      maximum: 10,
      step: 1,
      initial: 0.3,
    };

    expect(snapToRange({ value: 99, range: offset })).toBe(
      offset.maximum,
    );
    expect(snapToRange({ value: 9.9, range: offset })).toBe(
      offset.maximum,
    );
    expect(snapToRange({ value: -99, range: offset })).toBe(
      offset.minimum,
    );
  });

  // The answer can now land on an end rather than on a step, so the end is
  // part of what says how many places it is stated to.
  it("answers at the precision an end is written at", () => {
    const fractional: NumericRange = {
      minimum: 0,
      maximum: 9.75,
      step: 1,
      initial: 0,
    };

    expect(snapToRange({ value: 99, range: fractional })).toBe(9.75);
  });
});
