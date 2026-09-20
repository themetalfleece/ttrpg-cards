import { describe, expect, it } from "vitest";

import { millimetres } from "./millimetres.data";

describe("millimetres", () => {
  it("writes a measurement as a length a stylesheet can read", () => {
    expect(millimetres(63)).toBe("63mm");
  });

  it("keeps a fraction, because paper sizes have them", () => {
    expect(millimetres(215.9)).toBe("215.9mm");
  });

  it("writes no length at all as zero rather than as nothing", () => {
    expect(millimetres(0)).toBe("0mm");
  });
});
