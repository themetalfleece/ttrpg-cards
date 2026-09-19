import { PlainTextSchema, TextRunsSchema } from "@ttrpg-cards/text";
import { type TSchema, Type } from "@ttrpg-cards/validator";

import { CARD_BLOCK_KINDS } from "./card.constants";

/**
 * A source link is rendered as an anchor the reader clicks, so only the two
 * schemes a browser should follow are accepted. This keeps `javascript:` and
 * `data:` out of the markup at the boundary rather than at render time.
 */
const HTTP_URL_PATTERN = "^https?://[^\\s]+$";

/**
 * One labelled entry in a card's stat block. The label is free text: a card
 * carries whatever fields its content needs and the renderer lays out the
 * list it is handed.
 */
export const CardMetaFieldSchema = Type.Object(
  {
    /** What the entry is called, such as a casting time or a weight. */
    label: TextRunsSchema,
    /** What that entry says on this card. */
    value: TextRunsSchema,
  },
  { additionalProperties: false },
);

/** A run of prose. */
export const CardParagraphBlockSchema = Type.Object(
  {
    /** Always `paragraph`. The model reads this before anything else. */
    kind: Type.Literal(CARD_BLOCK_KINDS.paragraph),
    /** The prose itself. */
    text: TextRunsSchema,
  },
  { additionalProperties: false },
);

/** A bulleted list. A list with no items is an empty block, so it is rejected. */
export const CardListBlockSchema = Type.Object(
  {
    /** Always `list`. */
    kind: Type.Literal(CARD_BLOCK_KINDS.list),
    /** One entry per bullet, in the order they are read. */
    items: Type.Array(TextRunsSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);

/**
 * An aside the card sets apart from its main body, for variant or add-on text.
 * The label names it. How the renderer sets it apart is its own decision: a
 * tinted block, a rule, or the label run in bold ahead of the text.
 */
export const CardCalloutBlockSchema = Type.Object(
  {
    /** Always `callout`. */
    kind: Type.Literal(CARD_BLOCK_KINDS.callout),
    /** The heading the aside goes by, such as an upgrade or a variant. */
    label: Type.Optional(TextRunsSchema),
    /** The aside's prose. */
    text: TextRunsSchema,
  },
  { additionalProperties: false },
);

/**
 * The schema each block kind is held to, for checking a block against the one
 * shape its `kind` names instead of against the whole union. `satisfies` fails
 * the build if a kind gains a constant without a schema.
 */
export const CARD_BLOCK_SCHEMA_BY_KIND = {
  [CARD_BLOCK_KINDS.paragraph]: CardParagraphBlockSchema,
  [CARD_BLOCK_KINDS.list]: CardListBlockSchema,
  [CARD_BLOCK_KINDS.callout]: CardCalloutBlockSchema,
} satisfies Record<keyof typeof CARD_BLOCK_KINDS, TSchema>;

/**
 * Any block a card body may contain: the same set as the record above, which
 * a test holds it to. Building the union from `Object.values` of that record
 * instead gives an array rather than a tuple, and the static type collapses to
 * `never`, so the members are named here.
 */
export const CardBlockSchema = Type.Union([
  CARD_BLOCK_SCHEMA_BY_KIND.paragraph,
  CARD_BLOCK_SCHEMA_BY_KIND.list,
  CARD_BLOCK_SCHEMA_BY_KIND.callout,
]);

/**
 * Where a card's content came from, and the terms it carries.
 *
 * Plain strings throughout, and deliberately so: an attribution has to be
 * reproduced exactly as the licensor wrote it, and text that must not be
 * altered does not belong in a structure built to merge and normalise runs.
 *
 * `license` keeps the spelling manifests and licence identifiers use, even
 * though our prose writes "licence". The key is written by hand in imported
 * files, and an unknown field is rejected rather than ignored.
 */
export const CardSourceSchema = Type.Object(
  {
    /** Who the content came from, as they are to be credited. */
    name: PlainTextSchema,
    /** Where it was published. `http` and `https` only. */
    url: Type.Optional(Type.String({ pattern: HTTP_URL_PATTERN })),
    /** The terms it is offered under, such as a licence identifier. */
    license: Type.Optional(PlainTextSchema),
  },
  { additionalProperties: false },
);

/**
 * A tabletop reference card of any kind.
 *
 * There is deliberately no field named for a game concept. Everything that
 * varies between one kind of card and another lives in `meta` as an ordered
 * list of labels and values, so a spell and a piece of gear are the same
 * shape and the renderer never branches on what the card describes.
 *
 * Nothing here names a position on the card. `meta` and `footer` are ordered
 * lists and the theme decides how to set them out, the same way one card
 * stacks its stat block in cells and another runs it inline.
 *
 * Text the reader sees is runs, so any of it can carry emphasis and every
 * consumer handles one shape. Identifiers, search keys and attribution stay
 * plain strings: nothing renders them as prose, and the attribution must not
 * be normalised at all.
 *
 * A card is classified twice, for two different readers: `footer` prints on
 * the card, `tags` are for finding it in the library and never render.
 *
 * `meta` and `body` are always present and may be empty. An optional list
 * says "none" by being absent, so an empty one is rejected rather than
 * giving the same state two spellings.
 */
export const CardSchema = Type.Object(
  {
    /** Stable identity, unique within a collection. Never shown on the card. */
    id: PlainTextSchema,
    /** The card's title. */
    name: TextRunsSchema,
    /**
     * A glyph or two in the corner of the title bar, such as a rank or a cost.
     * No length of its own: what fits is the fitting routine's call, against
     * live dimensions.
     */
    badge: Type.Optional(TextRunsSchema),
    /** The short line under the title. */
    subtitle: Type.Optional(TextRunsSchema),
    /** The stat block, in the order it is laid out. May be empty. */
    meta: Type.Array(CardMetaFieldSchema),
    /** What the card says, in reading order. May be empty. */
    body: Type.Array(CardBlockSchema),
    /** Short entries along the bottom rule, in reading order. */
    footer: Type.Optional(
      Type.Array(TextRunsSchema, { minItems: 1 }),
    ),
    /** For finding the card in the library. Never rendered. */
    tags: Type.Optional(Type.Array(PlainTextSchema, { minItems: 1 })),
    /** Where the content came from, and the terms it carries. */
    source: Type.Optional(CardSourceSchema),
  },
  { additionalProperties: false },
);
