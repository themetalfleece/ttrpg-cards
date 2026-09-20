import { describe, expect, it } from "vitest";

import { clampToRange } from "../range";

import { SCREEN_SCALE_RANGE } from "./screen.constants";

describe("SCREEN_SCALE_RANGE", () => {
  it("starts at the scale CSS assumes", () => {
    expect(SCREEN_SCALE_RANGE.initial).toBe(1);
  });

  // The scale is effective ppi over 96, so the bounds have to span the
  // displays people actually have rather than sit either side of 1.
  it("covers the densities a display is likely to be", () => {
    const CSS_PIXELS_PER_INCH = 96;

    expect(
      SCREEN_SCALE_RANGE.minimum * CSS_PIXELS_PER_INCH,
    ).toBeLessThan(72);
    expect(
      SCREEN_SCALE_RANGE.maximum * CSS_PIXELS_PER_INCH,
    ).toBeGreaterThan(300);
  });

  it("moves in steps fine enough to match a card against", () => {
    expect(SCREEN_SCALE_RANGE.step).toBeGreaterThan(0);
    expect(SCREEN_SCALE_RANGE.step).toBeLessThan(0.01);
  });

  it("is a range the clamp accepts, which is what holds a dragged value", () => {
    expect(
      clampToRange({ value: 99, range: SCREEN_SCALE_RANGE }),
    ).toBe(SCREEN_SCALE_RANGE.maximum);
  });
});
