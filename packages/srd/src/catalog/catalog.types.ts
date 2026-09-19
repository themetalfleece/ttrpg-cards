import type { Static } from "@ttrpg-cards/validator";

import type {
  CatalogEntrySchema,
  CatalogSourceSchema,
  EntryBlockSchema,
  EntryComponentsSchema,
  EntryListSchema,
  EntryParagraphSchema,
  EntryTableSchema,
  EntryUpgradeSchema,
} from "./catalog.schemas";

/** A run of prose in an extracted entry. */
export type EntryParagraph = Static<typeof EntryParagraphSchema>;

/** A bulleted list in an extracted entry. */
export type EntryList = Static<typeof EntryListSchema>;

/** A table as the source document prints it. */
export type EntryTable = Static<typeof EntryTableSchema>;

/** Any block an entry's description may contain. */
export type EntryBlock = Static<typeof EntryBlockSchema>;

/** The discriminator that tells one block type from another. */
export type EntryBlockType = EntryBlock["type"];

/** Which components an entry needs, and what the material one is. */
export type EntryComponents = Static<typeof EntryComponentsSchema>;

/** The run-in section describing an entry cast at a higher level. */
export type EntryUpgrade = Static<typeof EntryUpgradeSchema>;

/** One entry exactly as it was extracted from the source document. */
export type CatalogEntry = Static<typeof CatalogEntrySchema>;

/** One extracted file: a release of the source document and its entries. */
export type CatalogSource = Static<typeof CatalogSourceSchema>;
