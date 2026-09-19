import { describe, expect, it } from "vitest";

import {
  CARD_THEMES,
  DEFAULT_CARD_THEME_ID,
  isCardThemeId,
} from "./theme.constants";

describe("CARD_THEMES", () => {
  it("gives every theme a distinct id and name", () => {
    expect(new Set(CARD_THEMES.map((theme) => theme.id)).size).toBe(
      CARD_THEMES.length,
    );
    expect(new Set(CARD_THEMES.map((theme) => theme.name)).size).toBe(
      CARD_THEMES.length,
    );
  });

  it("names the default among them", () => {
    expect(isCardThemeId(DEFAULT_CARD_THEME_ID)).toBe(true);
  });
});

describe("isCardThemeId", () => {
  it("accepts every theme the app ships", () => {
    for (const theme of CARD_THEMES) {
      expect(isCardThemeId(theme.id)).toBe(true);
    }
  });

  // What a stored preference looks like once a theme has been renamed or
  // dropped, which is the case this guard exists for.
  it("turns down an id it does not ship", () => {
    expect(isCardThemeId("chartreuse")).toBe(false);
  });

  it("turns down anything that is not a string", () => {
    expect(isCardThemeId(undefined)).toBe(false);
    expect(isCardThemeId(null)).toBe(false);
    expect(isCardThemeId(1)).toBe(false);
    expect(isCardThemeId({ id: "ink" })).toBe(false);
  });
});
