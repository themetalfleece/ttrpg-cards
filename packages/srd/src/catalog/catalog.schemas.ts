import { PlainTextSchema } from "@ttrpg-cards/text";
import { type TSchema, Type } from "@ttrpg-cards/validator";

import { ENTRY_BLOCK_TYPES } from "./catalog.constants";

/**
 * Inline text as the extraction writes it: `**strong**` and `_emphasis_` over
 * plain characters.
 *
 * This is the one place in the workspace where markup lives in a string, and
 * it is deliberate. The extracted files are an import format, not the model:
 * `markup.ts` turns them into runs at the boundary and nothing downstream ever
 * sees a marker. The extraction's own validator rejects an unbalanced or stray
 * marker before a file is written, so the parser is handed well-formed input.
 */
export const EntryMarkupSchema = PlainTextSchema;

/** A run of prose. */
export const EntryParagraphSchema = Type.Object(
  {
    type: Type.Literal(ENTRY_BLOCK_TYPES.paragraph),
    text: EntryMarkupSchema,
  },
  { additionalProperties: false },
);

/** A bulleted list. */
export const EntryListSchema = Type.Object(
  {
    type: Type.Literal(ENTRY_BLOCK_TYPES.list),
    items: Type.Array(EntryMarkupSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);

/**
 * A table as the source document prints it. A cell may be empty, because a
 * printed table leaves cells blank; a column heading may not, because an
 * unlabelled column is a parse failure rather than a layout choice.
 */
export const EntryTableSchema = Type.Object(
  {
    type: Type.Literal(ENTRY_BLOCK_TYPES.table),
    caption: Type.Optional(EntryMarkupSchema),
    header: Type.Array(PlainTextSchema, { minItems: 1 }),
    rows: Type.Array(Type.Array(Type.String()), { minItems: 1 }),
  },
  { additionalProperties: false },
);

/** The schema each block type is held to, keyed by the `type` it declares. */
export const ENTRY_BLOCK_SCHEMA_BY_TYPE = {
  [ENTRY_BLOCK_TYPES.paragraph]: EntryParagraphSchema,
  [ENTRY_BLOCK_TYPES.list]: EntryListSchema,
  [ENTRY_BLOCK_TYPES.table]: EntryTableSchema,
} satisfies Record<keyof typeof ENTRY_BLOCK_TYPES, TSchema>;

/** Any block an entry's description may contain. */
export const EntryBlockSchema = Type.Union([
  ENTRY_BLOCK_SCHEMA_BY_TYPE.paragraph,
  ENTRY_BLOCK_SCHEMA_BY_TYPE.list,
  ENTRY_BLOCK_SCHEMA_BY_TYPE.table,
]);

/** Which components an entry needs, and what the material one is. */
export const EntryComponentsSchema = Type.Object(
  {
    verbal: Type.Boolean(),
    somatic: Type.Boolean(),
    material: Type.Boolean(),
    /** The text inside the parentheses after the material letter. */
    materialText: Type.Optional(PlainTextSchema),
  },
  { additionalProperties: false },
);

/** The run-in section that describes casting an entry at a higher level. */
export const EntryUpgradeSchema = Type.Object(
  {
    /** The heading the section runs in under, without its trailing period. */
    label: PlainTextSchema,
    text: EntryMarkupSchema,
  },
  { additionalProperties: false },
);

/**
 * One entry exactly as it was extracted from the source document.
 *
 * These field names are the document's own vocabulary and they stop here. The
 * mapping in {@link Catalog} is the only code that reads them; everything past
 * it sees a card whose stat block is an ordered list of labels and values.
 */
export const CatalogEntrySchema = Type.Object(
  {
    /** `<catalogId>:<slug>`, unique across the workspace. */
    id: PlainTextSchema,
    name: PlainTextSchema,
    /** 0 for the lowest tier, otherwise 1 to 9. */
    level: Type.Integer({ minimum: 0, maximum: 9 }),
    school: PlainTextSchema,
    ritual: Type.Boolean(),
    castingTime: PlainTextSchema,
    range: PlainTextSchema,
    components: EntryComponentsSchema,
    /** The duration with any concentration prefix removed. */
    duration: PlainTextSchema,
    concentration: Type.Boolean(),
    classes: Type.Array(PlainTextSchema, { minItems: 1 }),
    description: Type.Array(EntryBlockSchema, { minItems: 1 }),
    upgrade: Type.Optional(EntryUpgradeSchema),
    /** The short label the card footer carries, such as the release it came from. */
    source: PlainTextSchema,
  },
  { additionalProperties: false },
);

/** One extracted file: a release of the source document and its entries. */
export const CatalogSourceSchema = Type.Object(
  {
    /** Stable catalog id, used as the entry id prefix. */
    id: PlainTextSchema,
    title: PlainTextSchema,
    entries: Type.Array(CatalogEntrySchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);
