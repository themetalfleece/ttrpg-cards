import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CARD_THEMES,
  DEFAULT_CARD_THEME_ID,
} from "@ttrpg-cards/card";

import {
  CARD_COLOUR_ROLES,
  type CardColourRole,
} from "./CardFace.constants";

/**
 * The stylesheets' own text. Vitest does not process CSS, so they are read as
 * files rather than imported: the point is to hold the shipped stylesheets to
 * the rule, not a copy of their values kept in step by hand.
 *
 * Both are read because a card is drawn against the page it sits on. The
 * themes declare the card's own colours; the document theme declares the
 * surface behind it, which the card has to stand out from.
 */
function stylesheetAt(...path: readonly string[]): string {
  // Comments hold colons and semicolons, so they go before anything is read.
  return readFileSync(
    join(process.cwd(), "src", ...path),
    "utf8",
  ).replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

const DOCUMENT_THEME = stylesheetAt("theme.css");
const CARD_PALETTES = stylesheetAt("CardFace", "CardFace.themes.css");

const STYLESHEETS = [DOCUMENT_THEME, CARD_PALETTES];

/**
 * Every colour a card sets text on, held to WCAG AA.
 *
 * The check is the contrast ratio, which is computed from relative luminance
 * and ignores hue entirely. So a pair that passes here reads in grayscale too:
 * that is the same measurement, not a second one.
 *
 * The accent pairs cover the rule down the side of a callout as well as the
 * text, since the callout is drawn in the same colour as its label.
 */
const CARD_TEXT_PAIRS = [
  { text: "--card-color-text", on: "--card-color-surface" },
  { text: "--card-color-text-muted", on: "--card-color-surface" },
  { text: "--card-color-accent", on: "--card-color-surface" },
  {
    text: "--card-color-badge-text",
    on: "--card-color-badge-surface",
  },
];

/**
 * Where one region of the card meets another, and what is drawn along the
 * seam. A boundary reads if the two fills are a step apart or if the rule
 * between them stands out from both, which is the whole point: a theme that
 * separated its regions by hue alone would satisfy neither once the page
 * comes out of a mono laser printer.
 *
 * The card carries one fill and it is the position pill. Everywhere else both
 * sides are the card's own surface, so the rule is the whole of what a reader
 * has to see the boundary by and the fills contribute nothing.
 */
interface RegionBoundary {
  /** What the boundary is, for the failure message. */
  readonly name: string;
  /** The fills on either side of it. */
  readonly sides: readonly [string, string];
  /** The rule drawn along it, where one is. */
  readonly rule?: string;
}

const CARD_REGION_BOUNDARIES: readonly RegionBoundary[] = [
  {
    // The sheet, not the app's surface: a card is always on paper now, on a
    // screen as much as on a printer.
    name: "the card against the page",
    sides: ["--card-color-surface", "--color-paper"],
    rule: "--card-color-border",
  },
  {
    name: "the property strip against the body",
    sides: ["--card-color-surface", "--card-color-surface"],
    rule: "--card-color-border",
  },
  {
    name: "the band against the card",
    sides: ["--card-color-surface", "--card-color-surface"],
    rule: "--card-color-border",
  },
  {
    name: "the position pill against the card",
    sides: ["--card-color-badge-surface", "--card-color-surface"],
  },
];

/** WCAG AA for body text. Larger text is allowed 3, so this is the strict one. */
const MINIMUM_TEXT_CONTRAST = 4.5;

/** WCAG's bar for a boundary that carries meaning without being text. */
const MINIMUM_REGION_SEPARATION = 3;

/**
 * How light a card's fills have to be on paper.
 *
 * Contrast cannot stand in for this. It is symmetric, so dark text on a white
 * card and white text on a black card score exactly the same, and a dark card
 * passes every check above while printing as either an empty outline or a
 * sheet of solid ink. The page is white and the ink is what costs, so on paper
 * the card has to be the light half of the pair.
 */
const MINIMUM_PAPER_LUMINANCE = 0.6;

/**
 * The fills that luminance floor applies to. Typed, so a role misspelled here
 * is a compile error on this line rather than a throw out of `resolve` at the
 * far end of the run.
 */
const CARD_SURFACE_ROLES: readonly CardColourRole[] = [
  "--card-color-surface",
];

/** One rule of the stylesheet: what it matches, and what it declares. */
interface StyleRule {
  readonly selector: string;
  readonly declarations: ReadonlyMap<string, string>;
}

function declarationsIn(body: string): Map<string, string> {
  const declarations = new Map<string, string>();

  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;

    if (name !== undefined && value !== undefined) {
      declarations.set(name, value.trim());
    }
  }

  return declarations;
}

/**
 * The rules in a stretch of the stylesheet. An `@media` wrapper holds rules
 * rather than declarations, so the pattern never matches it and the rules
 * inside are found on their own.
 */
function rulesIn(source: string): StyleRule[] {
  const rules: StyleRule[] = [];

  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selector, body] = match;

    if (selector !== undefined && body !== undefined) {
      rules.push({
        selector: selector.trim(),
        declarations: declarationsIn(body),
      });
    }
  }

  return rules;
}

function selectorForTheme(themeId: string): string {
  return `[data-card-theme="${themeId}"]`;
}

const EMPTY: ReadonlyMap<string, string> = new Map();

const COLOUR_ROLES: ReadonlySet<string> = new Set(CARD_COLOUR_ROLES);

/** What `:root` alone declares: the tokens a card's colours sit against. */
function tokensIn(
  rules: readonly StyleRule[],
): ReadonlyMap<string, string> {
  return (
    rules.find((rule) => rule.selector === ":root")?.declarations ??
    EMPTY
  );
}

function themeRulesIn(
  rules: readonly StyleRule[],
  themeId: string,
): ReadonlyMap<string, string> {
  const selector = selectorForTheme(themeId);

  return (
    rules.find((rule) => rule.selector.includes(selector))
      ?.declarations ?? EMPTY
  );
}

/** A stretch of the stylesheet, and the media condition it applies under. */
interface StyleSection {
  /** The condition, empty for the rules outside any `@media`. */
  readonly media: string;
  readonly rules: readonly StyleRule[];
}

/** The index of the `}` closing the block that opens at `opensAt`. */
function closingBrace(source: string, opensAt: number): number {
  let depth = 0;

  for (let index = opensAt; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error("The theme has an unclosed block.");
}

/**
 * The stylesheet split by media condition, so each one is read as its own
 * layer. Slicing at a single known `@media` instead would quietly fold a
 * second one into the first and go on reporting the first one's values.
 */
function sectionsIn(source: string): StyleSection[] {
  const sections: StyleSection[] = [];
  let unconditional = "";
  let index = 0;

  while (index < source.length) {
    const opener = source.indexOf("@media", index);

    if (opener === -1) {
      unconditional += source.slice(index);
      break;
    }

    const opens = source.indexOf("{", opener);
    const closes = closingBrace(source, opens);

    unconditional += source.slice(index, opener);
    sections.push({
      media: source.slice(opener + "@media".length, opens).trim(),
      rules: rulesIn(source.slice(opens + 1, closes)),
    });
    index = closes + 1;
  }

  return [{ media: "", rules: rulesIn(unconditional) }, ...sections];
}

/*
 * Every section of both stylesheets, flattened.
 *
 * Two sections can carry the same media condition, one from each file, so
 * nothing below may assume a condition appears once. What makes folding them
 * safe is that the two files declare disjoint properties, not the order they
 * are folded in: the document theme arrives through the root layout and the
 * palettes through a component import, so the bundler decides which lands
 * first and neither this nor the cascade can rely on it. `declares colours and
 * nothing else` polices one side of that disjointness. Declare a property in
 * both files and this stops being sound.
 */
const SECTIONS = STYLESHEETS.flatMap(sectionsIn);

/** The media types this reads. A query naming none means `all`. */
const MEDIA_TYPES = new Set(["all", "screen", "print"]);

/**
 * Shapes this does not model, whatever type they lead with. A comma list is
 * two queries, so the type at the front speaks for neither half, and a
 * negation anywhere inverts what the rest of the query says.
 */
const UNREADABLE_MEDIA = /\bnot\b|,/;

/**
 * The media type a condition names, or `all` where it names none.
 *
 * `all` is the one that matters: it is what a bare feature query means, and it
 * includes print. A form this cannot read throws rather than returning
 * something the targets would route somewhere wrong or nowhere at all, because
 * either way nothing below measures what it declares. That covers the legacy
 * `only` prefix, a negation, and a comma list, none of which this needs to
 * understand as long as it says so instead of going quiet.
 */
function mediaType(media: string): string {
  const [named = ""] = media.trim().split(/[\s(]/);
  const type = named === "" ? "all" : named;

  if (!MEDIA_TYPES.has(type) || UNREADABLE_MEDIA.test(media)) {
    throw new Error(
      `The theme uses a media query this cannot read: ${media}`,
    );
  }

  return type;
}

/** Whether a block under this condition is drawn on a screen. */
function reachesAScreen(media: string): boolean {
  const type = mediaType(media);

  return type === "screen" || type === "all";
}

/** Whether a block under this condition reaches paper. */
function reachesPaper(media: string): boolean {
  const type = mediaType(media);

  return type === "print" || type === "all";
}

/** Somewhere a card is looked at, and which of the stylesheet applies there. */
interface Target {
  readonly name: string;
  readonly applies: (media: string) => boolean;
  /**
   * The floor the card's fills are held to, where there is one. Only paper
   * has one: a screen is free to be dark, and a page is not.
   */
  readonly minimumSurfaceLuminance?: number;
}

/*
 * Every target is the same sentence: the media type reaches me, and no
 * colour-scheme feature rules me out.
 */
const LIGHT_SCREEN: Target = {
  name: "on a light screen",
  applies: (media) =>
    reachesAScreen(media) &&
    !media.includes("prefers-color-scheme: dark"),
};

const DARK_SCREEN: Target = {
  name: "on a dark screen",
  applies: (media) =>
    reachesAScreen(media) &&
    !media.includes("prefers-color-scheme: light"),
};

const PAPER: Target = {
  name: "on paper",
  applies: reachesPaper,
  minimumSurfaceLuminance: MINIMUM_PAPER_LUMINANCE,
};

const TARGETS: readonly Target[] = [LIGHT_SCREEN, DARK_SCREEN, PAPER];

/** Every colour a card of this theme is drawn in, at one of those targets. */
function coloursOf(
  themeId: string,
  target: Target,
): ReadonlyMap<string, string> {
  const colours = new Map<string, string>();

  for (const section of SECTIONS) {
    if (!target.applies(section.media)) {
      continue;
    }

    // Document order within the section, which is how the cascade resolves
    // two selectors of equal specificity.
    for (const layer of [
      tokensIn(section.rules),
      themeRulesIn(section.rules, themeId),
    ]) {
      for (const [name, value] of layer) {
        colours.set(name, value);
      }
    }
  }

  return colours;
}

/**
 * What a theme declares outside any media condition: its base palette. Folded
 * across every unconditional section rather than the first, since each
 * stylesheet contributes one.
 */
function basePaletteOf(themeId: string): ReadonlyMap<string, string> {
  const palette = new Map<string, string>();

  for (const section of SECTIONS) {
    if (section.media !== "") {
      continue;
    }

    for (const [name, value] of themeRulesIn(
      section.rules,
      themeId,
    )) {
      palette.set(name, value);
    }
  }

  return palette;
}

/** Every property a theme declares, wherever in the stylesheets it is scoped. */
function everyPropertyDeclaredBy(themeId: string): string[] {
  return SECTIONS.flatMap((section) => [
    ...themeRulesIn(section.rules, themeId).keys(),
  ]);
}

/** A property followed through `var()` hops until it reaches a literal colour. */
function resolve(
  name: string,
  declarations: ReadonlyMap<string, string>,
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

/**
 * How well a boundary reads: the better of the step between its two fills and
 * the rule drawn along it, since either one on its own is enough to see it by.
 */
function separation(
  boundary: RegionBoundary,
  colours: ReadonlyMap<string, string>,
): number {
  const [first, second] = boundary.sides;
  const firstFill = resolve(first, colours);
  const secondFill = resolve(second, colours);
  const acrossFills = contrast(firstFill, secondFill);

  if (boundary.rule === undefined) {
    return acrossFills;
  }

  const rule = resolve(boundary.rule, colours);
  const alongRule = Math.min(
    contrast(rule, firstFill),
    contrast(rule, secondFill),
  );

  return Math.max(acrossFills, alongRule);
}

describe.each(CARD_THEMES)("the $name theme", ({ id }) => {
  describe.each(TARGETS)("$name", (target) => {
    const colours = coloursOf(id, target);

    it.each(CARD_TEXT_PAIRS)("sets $text on $on legibly", (pair) => {
      const ratio = contrast(
        resolve(pair.text, colours),
        resolve(pair.on, colours),
      );

      expect(ratio).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
    });

    it.each(CARD_REGION_BOUNDARIES)(
      "separates $name by luminance",
      (boundary) => {
        expect(separation(boundary, colours)).toBeGreaterThanOrEqual(
          MINIMUM_REGION_SEPARATION,
        );
      },
    );

    // Registered only where there is a floor, because a screen has none and a
    // test asserting a luminance above zero would be a test shaped like a lie.
    const floor = target.minimumSurfaceLuminance;

    if (floor !== undefined) {
      it.each(CARD_SURFACE_ROLES)(
        "leaves %s light enough for the page",
        (role) => {
          expect(
            luminance(resolve(role, colours)),
          ).toBeGreaterThanOrEqual(floor);
        },
      );
    }
  });

  // A role the theme leaves out falls through to the one underneath, so the
  // checks above would pass without ever measuring this theme's colour.
  it("declares every colour role itself", () => {
    const declared = basePaletteOf(id);
    const missing = CARD_COLOUR_ROLES.filter(
      (role) => !declared.has(role),
    );

    expect(missing).toEqual([]);
  });

  // Fitting measures a card rendered without a theme, which is only sound
  // because choosing one cannot move anything. A length here would put the
  // measurement and the card it was made for in different geometries.
  it("declares colours and nothing else", () => {
    const unexpected = everyPropertyDeclaredBy(id).filter(
      (property) => !COLOUR_ROLES.has(property),
    );

    expect(unexpected).toEqual([]);
  });
});

/*
 * The registry names the themes and this file draws them, so the two live in
 * different packages and only agree by being checked. A theme in one and not
 * the other is either a palette nothing can select or a name that renders as
 * whatever it inherits.
 */
describe("the registry and the stylesheet", () => {
  it("name exactly the same themes", () => {
    const drawn = new Set(
      STYLESHEETS.flatMap((source) =>
        [...source.matchAll(/\[data-card-theme="([\w-]+)"\]/g)].map(
          ([, id]) => id,
        ),
      ),
    );

    expect([...drawn].toSorted()).toEqual(
      CARD_THEMES.map((entry) => entry.id).toSorted(),
    );
  });
});

/*
 * Reading the two stylesheets as one layer is only sound while they declare
 * different properties. Order cannot save it: the document theme arrives
 * through the root layout and the palettes through a component import, so the
 * bundler decides which lands first and the cascade between them is not ours
 * to predict. Keeping them disjoint means there is nothing to resolve.
 */
describe("the two stylesheets", () => {
  it("declare no property in common", () => {
    const [documentTheme, palettes] = STYLESHEETS.map(
      (source) =>
        new Set(
          sectionsIn(source).flatMap((section) =>
            section.rules.flatMap((rule) => [
              ...rule.declarations.keys(),
            ]),
          ),
        ),
    );

    expect(documentTheme?.size).toBeGreaterThan(0);
    expect(palettes?.size).toBeGreaterThan(0);
    expect(
      [...(palettes ?? [])].filter((property) =>
        documentTheme?.has(property),
      ),
    ).toEqual([]);
  });
});

/** Every colour role of a theme, resolved, at one of the targets. */
function cardColoursOn(
  themeId: string,
  target: Target,
): Record<string, string> {
  const colours = coloursOf(themeId, target);

  return Object.fromEntries(
    CARD_COLOUR_ROLES.map((role) => [role, resolve(role, colours)]),
  );
}

describe("the targets a card is read at", () => {
  // Without this the suite can pass by reading one target three times over,
  // which is how the first version of it was wrong. The document theme is what
  // it is read off, because that one really does darken at night: the card's
  // palettes no longer do, which is the next check.
  it("reads a dark screen apart from a light one", () => {
    expect(SECTIONS.length).toBeGreaterThan(1);
    expect(
      resolve(
        "--color-surface",
        coloursOf(DEFAULT_CARD_THEME_ID, DARK_SCREEN),
      ),
    ).not.toBe(
      resolve(
        "--color-surface",
        coloursOf(DEFAULT_CARD_THEME_ID, LIGHT_SCREEN),
      ),
    );
  });

  // A card is paper wherever it is looked at. It sits on a white sheet at
  // midnight and it is printed on white, so a palette that followed the
  // desktop would be a dark rectangle on a white sheet and a page of ink out
  // of the printer.
  it.each(CARD_THEMES)(
    "draws the $name theme the same at every one of them",
    ({ id }) => {
      expect(cardColoursOn(id, DARK_SCREEN)).toEqual(
        cardColoursOn(id, LIGHT_SCREEN),
      );
      expect(cardColoursOn(id, PAPER)).toEqual(
        cardColoursOn(id, LIGHT_SCREEN),
      );
    },
  );

  /**
   * Where each media condition is drawn, pinned. The routing decides what
   * every check above is allowed to see, so it is worth stating outright
   * rather than leaving to be re-derived from three predicates.
   */
  it.each([
    { media: "", light: true, dark: true, paper: true },
    {
      media: "screen and (prefers-color-scheme: dark)",
      light: false,
      dark: true,
      paper: false,
    },
    {
      media: "screen and (prefers-color-scheme: light)",
      light: true,
      dark: false,
      paper: false,
    },
    { media: "screen", light: true, dark: true, paper: false },
    {
      media: "screen and (min-width: 40em)",
      light: true,
      dark: true,
      paper: false,
    },
    { media: "print", light: false, dark: false, paper: true },
    {
      media: "(prefers-color-scheme: dark)",
      light: false,
      dark: true,
      paper: true,
    },
    // Conservative on purpose: a dark palette scoped to print is measured
    // against the page, so it is flagged rather than missed.
    {
      media: "print and (prefers-color-scheme: dark)",
      light: false,
      dark: false,
      paper: true,
    },
  ])("draws `$media` where it belongs", (routing) => {
    expect({
      light: LIGHT_SCREEN.applies(routing.media),
      dark: DARK_SCREEN.applies(routing.media),
      paper: PAPER.applies(routing.media),
    }).toEqual({
      light: routing.light,
      dark: routing.dark,
      paper: routing.paper,
    });
  });

  // The failure the routing exists to prevent: a block drawn at no target is
  // measured by nothing above, and says nothing about it either.
  it("draws every block in the stylesheet somewhere", () => {
    const unreachable = SECTIONS.filter(
      (section) =>
        !TARGETS.some((target) => target.applies(section.media)),
    ).map((section) => section.media);

    expect(unreachable).toEqual([]);
  });

  it("refuses a media query it cannot read rather than ignoring it", () => {
    expect(() => PAPER.applies("not print")).toThrow(/cannot read/);
    expect(() => PAPER.applies("only screen")).toThrow(/cannot read/);

    // A comma list: the type at the front speaks for the first half only, so
    // reading it as the whole query drops the second half off every target.
    expect(() =>
      PAPER.applies("screen and (prefers-color-scheme: dark), print"),
    ).toThrow(/cannot read/);
    expect(() => PAPER.applies("print, screen")).toThrow(
      /cannot read/,
    );

    // An inner negation, which means the opposite of what the feature name in
    // it would otherwise route by.
    expect(() =>
      PAPER.applies("screen and (not (prefers-color-scheme: dark))"),
    ).toThrow(/cannot read/);
  });
});
