import { Type } from "@ttrpg-cards/validator";

import { TEXT_MARKS } from "./text.constants";

/**
 * A string written by a person, so an empty one is a mistake rather than a
 * value. Optional fields are absent instead.
 */
export const PlainTextSchema = Type.String({ minLength: 1 });

/** A mark carries meaning. What it looks like is the theme's decision. */
export const TextMarkSchema = Type.Union([
  Type.Literal(TEXT_MARKS.strong),
  Type.Literal(TEXT_MARKS.emphasis),
]);

/** A stretch of text that reads the same way throughout. */
export const TextRunSchema = Type.Object(
  {
    /** The characters themselves, with no markup in them. */
    text: PlainTextSchema,
    /** What the run carries, such as strong, emphasis, or both together. */
    marks: Type.Optional(
      Type.Array(TextMarkSchema, { minItems: 1, uniqueItems: true }),
    ),
  },
  { additionalProperties: false },
);

/**
 * Text the reader sees, as an ordered list of runs.
 *
 * Emphasis is structured rather than written into the string as markup. A
 * string holding `**bold**` would make every reader of the model a parser:
 * the renderer, the fitting routine and anything that measures or searches
 * the text would each have to strip the syntax, and whichever one forgot
 * would be quietly wrong. Import formats are where markdown belongs, and the
 * importer turns it into runs on the way in.
 *
 * Unmarked text is one run, which {@link RichText.of} builds.
 *
 * Text has one canonical spelling: neighbours carrying the same marks are
 * merged, and marks are listed in a fixed order. A shape cannot say "adjacent
 * runs differ", so the schema accepts a split or reordered list rather than
 * rejecting it, and {@link RichText.canonical} is the one implementation that
 * produces the canonical form. Without it the same text has unboundedly many
 * valid spellings and nothing can tell two identical cards apart.
 */
export const TextRunsSchema = Type.Array(TextRunSchema, {
  minItems: 1,
});
