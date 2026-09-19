import type { CardMetaField } from "@ttrpg-cards/card";

/** The card's stat block: its meta fields, in the order they are laid out. */
export interface StatBlockProps {
  /** The fields to set out, label and value. */
  fields: readonly CardMetaField[];
}
