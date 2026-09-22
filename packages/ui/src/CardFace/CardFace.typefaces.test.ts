import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CARD_TYPEFACES } from "@ttrpg-cards/card";
import { describe, expect, it } from "vitest";

/**
 * The stylesheets' own text. Vitest does not process CSS, so they are read as
 * files: the point is to hold what ships to the rule rather than a copy of it
 * kept in step by hand.
 *
 * Both are read because a pairing and the faces it asks for now live in
 * different files, and nothing in the cascade complains when they disagree.
 */
function stylesheetAt(...path: readonly string[]): string {
  return readFileSync(join(process.cwd(), "src", ...path), "utf8");
}

const TYPEFACES_CSS = stylesheetAt(
  "CardFace",
  "CardFace.typefaces.css",
);

/** Every family `fonts.css` declares a face for. */
const DECLARED_FAMILIES = new Set(
  [
    ...stylesheetAt("fonts", "fonts.css").matchAll(
      /font-family:\s*"([^"]+)"/g,
    ),
  ].map(([, family = ""]) => family),
);

/**
 * The properties a pairing declares, which is the whole of what one is.
 *
 * The two corrections are in here because a face that leaves one out inherits
 * the one above it in the file, and a title centred or a rank sized for
 * somebody else's face is exactly what they exist to stop.
 */
const PAIRING_PROPERTIES = [
  "--card-font-family-display",
  "--card-display-weight",
  "--card-name-centre",
  "--card-figure-scale",
  "--card-font-family-body",
];

/** A pairing is a display face and a body face, and that is all. */
const PAIRING_FACE_COUNT = 2;

/** What `[data-card-typeface="x"]` declares, or nothing where it is absent. */
function declarationsFor(typefaceId: string): string {
  const pattern = new RegExp(
    `\\[data-card-typeface="${typefaceId}"\\][^{]*\\{([^}]*)\\}`,
  );

  return pattern.exec(TYPEFACES_CSS)?.[1] ?? "";
}

/**
 * The face each family property asks for first, which is the one that has to
 * be vendored. Everything after it in the stack is a system fallback, named so
 * the card still reads as itself before its files land.
 */
function chosenFamiliesIn(declarations: string): string[] {
  return [
    ...declarations.matchAll(/--card-font-family-\w+:\s*([^;]+);/g),
  ]
    .map(([, stack = ""]) => /"([^"]+)"/.exec(stack)?.[1])
    .filter((family) => family !== undefined);
}

describe("the registry and the stylesheet", () => {
  it("name exactly the same pairings", () => {
    const drawn = [
      ...TYPEFACES_CSS.matchAll(/\[data-card-typeface="([\w-]+)"\]/g),
    ].map(([, id]) => id);

    expect([...new Set(drawn)].toSorted()).toEqual(
      CARD_TYPEFACES.map((typeface) => typeface.id).toSorted(),
    );
  });

  // A pairing that left one out would fall through to the one above it, which
  // reads as a card set in half of somebody else's choice.
  it.each(CARD_TYPEFACES)(
    "gives the $name pairing both faces and a weight",
    ({ id }) => {
      const declarations = declarationsFor(id);

      for (const property of PAIRING_PROPERTIES) {
        expect(
          declarations,
          `${id} is missing ${property}`,
        ).toContain(property);
      }
    },
  );

  // The faces are declared in another file now, so a pairing can ask for a
  // family nobody vendored and there is nothing in the cascade to say so: the
  // card just draws in the fallback and reads as one of its neighbours.
  it.each(CARD_TYPEFACES)(
    "asks the $name pairing for families this package ships",
    ({ id }) => {
      const asked = chosenFamiliesIn(declarationsFor(id));
      const missing = asked.filter(
        (family) => !DECLARED_FAMILIES.has(family),
      );

      expect(asked).toHaveLength(PAIRING_FACE_COUNT);
      expect(missing, `${id} names a face nobody declares`).toEqual(
        [],
      );
    },
  );
});
