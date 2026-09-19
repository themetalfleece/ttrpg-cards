import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parchmentPalette } from "./theme.fixtures";

/**
 * The stylesheet's own text. Vitest does not process CSS, so the theme is read
 * as a file rather than imported: the point is to hold the shipped stylesheet
 * to the rule, not a copy of its values kept in step by hand.
 */
const theme = readFileSync(
  join(process.cwd(), "src", "theme.css"),
  "utf8",
);

/**
 * Every colour a card sets text on, held to WCAG AA.
 *
 * The check is the contrast ratio, which is computed from relative luminance
 * and ignores hue entirely. So a pair that passes here reads in grayscale too:
 * that is the same measurement, not a second one.
 */
const CARD_TEXT_PAIRS = [
  { text: "--card-color-text", on: "--card-color-surface" },
  { text: "--card-color-text-muted", on: "--card-color-surface" },
  { text: "--card-color-accent", on: "--card-color-surface" },
  { text: "--card-color-text", on: "--card-color-surface-tinted" },
  {
    text: "--card-color-accent",
    on: "--card-color-surface-tinted",
  },
  {
    text: "--card-color-badge-text",
    on: "--card-color-badge-surface",
  },
];

/** WCAG AA for body text. Larger text is allowed 3, so this is the strict one. */
const MINIMUM_CONTRAST = 4.5;

/**
 * The custom properties declared in one block of the stylesheet, so the light
 * and dark schemes are read apart rather than flattened into each other.
 */
function declarationsIn(source: string): Map<string, string> {
  const declarations = new Map<string, string>();

  for (const match of source.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;

    if (name !== undefined && value !== undefined) {
      declarations.set(name, value.trim());
    }
  }

  return declarations;
}

/** A property followed through `var()` hops until it reaches a literal colour. */
function resolve(
  name: string,
  declarations: Map<string, string>,
): string {
  let value = declarations.get(name);

  while (value !== undefined && value.startsWith("var(")) {
    const referenced = value.slice(4, -1).trim();
    value = declarations.get(referenced);
  }

  if (value === undefined) {
    throw new Error(`${name} resolves to nothing in the theme.`);
  }

  return value;
}

/** One channel of an `#rrggbb` colour, linearised for the luminance formula. */
function channel(hex: string, offset: number): number {
  const sRGB =
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

  if (sRGB <= 0.03928) {
    return sRGB / 12.92;
  }

  return ((sRGB + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance, which is also what a colour looks like in grayscale. */
function luminance(colour: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(colour)) {
    throw new Error(`${colour} is not a six digit hex colour.`);
  }

  return (
    0.2126 * channel(colour, 1) +
    0.7152 * channel(colour, 3) +
    0.0722 * channel(colour, 5)
  );
}

function contrast(first: string, second: string): number {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));

  return (lighter + 0.05) / (darker + 0.05);
}

const DARK_SCHEME_AT = theme.indexOf(
  "@media (prefers-color-scheme: dark)",
);

/**
 * The two colour schemes the theme ships.
 *
 * Light is what is declared before the dark block, not the whole file: reading
 * it all would let the dark overrides win and check one scheme twice. Dark is
 * read over the top of light, because it redeclares only the colours it
 * changes and inherits the rest, which is how the cascade resolves it.
 */
const lightDeclarations = declarationsIn(
  theme.slice(0, DARK_SCHEME_AT),
);

const schemes = {
  light: lightDeclarations,
  dark: new Map([
    ...lightDeclarations,
    ...declarationsIn(theme.slice(DARK_SCHEME_AT)),
  ]),
};

/**
 * Every set of colours a card is drawn in. The sample palette is read over the
 * light scheme, the way dark is, because it overrides only the card's roles.
 */
const colourSets = {
  ...schemes,
  parchment: new Map([
    ...lightDeclarations,
    ...Object.entries(parchmentPalette),
  ]),
};

describe("the card's colours", () => {
  for (const [colourSet, declarations] of Object.entries(
    colourSets,
  )) {
    describe(colourSet, () => {
      for (const pair of CARD_TEXT_PAIRS) {
        it(`sets ${pair.text} on ${pair.on} legibly`, () => {
          const ratio = contrast(
            resolve(pair.text, declarations),
            resolve(pair.on, declarations),
          );

          expect(ratio).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
        });
      }
    });
  }

  // Without this the suite passes by checking one scheme twice, which is how
  // the first version of it was wrong.
  it("reads the two schemes apart rather than one of them twice", () => {
    expect(schemes.light.size).toBeGreaterThan(0);
    expect(resolve("--card-color-text", schemes.light)).not.toBe(
      resolve("--card-color-text", schemes.dark),
    );
  });

  // A property the palette does not set falls through to the scheme underneath,
  // so the pair passes without measuring the palette at all.
  it("sets every colour the pairs read", () => {
    const read = new Set(
      CARD_TEXT_PAIRS.flatMap((pair) => [pair.text, pair.on]),
    );
    const missing = [...read].filter(
      (property) => !(property in parchmentPalette),
    );

    expect(missing).toEqual([]);
  });
});
