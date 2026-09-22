import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The stylesheet's own text. Vitest does not process CSS, so it is read as a
 * file: the point is to hold the shipped stylesheet to the rule rather than a
 * copy of it kept in step by hand.
 */
const FONTS_DIRECTORY = join(process.cwd(), "src", "fonts");
const FONTS_CSS = readFileSync(
  join(FONTS_DIRECTORY, "fonts.css"),
  "utf8",
);

/** Every `url()` the stylesheet points at, unquoted. */
const REFERENCED_URLS = [
  ...FONTS_CSS.matchAll(/url\(\s*"?([^")]+)"?\s*\)/g),
].map(([, url = ""]) => url);

describe("the faces this package vendors", () => {
  /*
   * The transmission rule, at the one place in the app most likely to break
   * it: a webfont URL is the reader's browser calling somebody else's server,
   * and it is one paste away at any time.
   */
  it("fetches nothing, because every face is a file beside the stylesheet", () => {
    expect(REFERENCED_URLS.length).toBeGreaterThan(0);

    for (const url of REFERENCED_URLS) {
      expect(url, "a font URL leaving the origin").toMatch(/^\.\//);
    }

    expect(FONTS_CSS).not.toMatch(/@import/);
    expect(FONTS_CSS).not.toMatch(/https?:/);
  });

  it("ships every file it declares a face from", () => {
    for (const url of REFERENCED_URLS) {
      expect(
        existsSync(join(FONTS_DIRECTORY, url)),
        `${url} is declared but not vendored`,
      ).toBe(true);
    }
  });

  // Redistributing a face means carrying its licence with it, so the check is
  // that one sits beside every family rather than somewhere central.
  it("keeps a licence beside every family it vendors", () => {
    const families = new Set(
      REFERENCED_URLS.map((url) =>
        dirname(join(FONTS_DIRECTORY, url)),
      ),
    );

    expect(families.size).toBeGreaterThan(0);
    for (const family of families) {
      expect(
        existsSync(join(family, "OFL.txt")),
        `${family} ships no licence`,
      ).toBe(true);
    }
  });

  // A subset that answered for characters it does not carry would draw them
  // as a missing glyph rather than letting a system face take them.
  it("gives every face the range its subset covers", () => {
    const faces = FONTS_CSS.split("@font-face").slice(1);

    expect(faces.length).toBe(REFERENCED_URLS.length);
    for (const face of faces) {
      expect(face).toContain("unicode-range:");
      expect(face).toContain("font-display: swap");
    }
  });
});
