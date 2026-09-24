import { describe, expect, it } from "vitest";

import { millimetres } from "./millimetres.data";

describe("millimetres", () => {
  it("writes a measurement as a length a stylesheet can read", () => {
    expect(millimetres(63)).toBe("63mm");
  });

  // Paper sizes have them, which is why this is worth pinning. A published
  // paper's own measurement is not the example, because those are written
  // down in one place and this package is not it.
  it("keeps a fraction", () => {
    expect(millimetres(101.6)).toBe("101.6mm");
  });

  it("writes no length at all as zero rather than as nothing", () => {
    expect(millimetres(0)).toBe("0mm");
  });
});
