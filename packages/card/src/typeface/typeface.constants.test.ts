import { describe, expect, it } from "vitest";

import {
  CARD_TYPEFACES,
  DEFAULT_CARD_TYPEFACE_ID,
  isCardTypefaceId,
} from "./typeface.constants";

describe("CARD_TYPEFACES", () => {
  it("gives every pairing a distinct id and name", () => {
    expect(
      new Set(CARD_TYPEFACES.map((typeface) => typeface.id)).size,
    ).toBe(CARD_TYPEFACES.length);
    expect(
      new Set(CARD_TYPEFACES.map((typeface) => typeface.name)).size,
    ).toBe(CARD_TYPEFACES.length);
  });

  it("names the default among them", () => {
    expect(isCardTypefaceId(DEFAULT_CARD_TYPEFACE_ID)).toBe(true);
  });
});

describe("isCardTypefaceId", () => {
  it("accepts every pairing the app ships", () => {
    for (const typeface of CARD_TYPEFACES) {
      expect(isCardTypefaceId(typeface.id)).toBe(true);
    }
  });

  // What a stored preference looks like once a pairing has been renamed or
  // dropped, which is the case this guard exists for.
  it("turns down an id it does not ship", () => {
    expect(isCardTypefaceId("copperplate")).toBe(false);
  });

  it("turns down anything that is not a string", () => {
    expect(isCardTypefaceId(undefined)).toBe(false);
    expect(isCardTypefaceId(null)).toBe(false);
    expect(isCardTypefaceId(1)).toBe(false);
    expect(isCardTypefaceId({ id: "rounded" })).toBe(false);
  });
});
