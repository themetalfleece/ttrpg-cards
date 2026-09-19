import type { Static } from "@ttrpg-cards/validator";

import type {
  CardBlockSchema,
  CardCalloutBlockSchema,
  CardListBlockSchema,
  CardMetaFieldSchema,
  CardParagraphBlockSchema,
  CardSchema,
  CardSourceSchema,
} from "./card.schemas";

/** One labelled entry in a card's stat block. */
export type CardMetaField = Static<typeof CardMetaFieldSchema>;

/** A run of prose in a card body. */
export type CardParagraphBlock = Static<
  typeof CardParagraphBlockSchema
>;

/** A bulleted list in a card body. */
export type CardListBlock = Static<typeof CardListBlockSchema>;

/** A highlighted aside in a card body. */
export type CardCalloutBlock = Static<typeof CardCalloutBlockSchema>;

/** Any block a card body may contain. */
export type CardBlock = Static<typeof CardBlockSchema>;

/** The discriminator that tells one block kind from another. */
export type CardBlockKind = CardBlock["kind"];

/** Where a card's content came from, and the terms it carries. */
export type CardSource = Static<typeof CardSourceSchema>;

/** A tabletop reference card of any kind. */
export type Card = Static<typeof CardSchema>;

/** One structural failure, ready to show beside the input that caused it. */
export interface CardValidationIssue {
  /** JSON pointer into the checked value, such as `/meta/0/label`. */
  path: string;
  message: string;
}
