import type {
  CardMetaField,
  CardTypefaceId,
} from "@ttrpg-cards/card";
import type { RefObject } from "react";

/** The card's stat block: its meta fields, in the order they are laid out. */
export interface StatBlockProps {
  /** The fields to set out, label over value. */
  fields: readonly CardMetaField[];
  /**
   * The faces the card is set in. The labels are set in the workhorse, and a
   * face decides how wide a word runs, so it decides whether a label fits its
   * cell.
   */
  typeface?: CardTypefaceId | undefined;
}

/** What the label fitting hook needs to measure the strip in place. */
export interface UseFittedLabelScaleOptions {
  /** The fields on the strip. Different labels are a fresh measurement. */
  fields: readonly CardMetaField[];
  /** The faces they are set in, which decide how wide their words run. */
  typeface?: CardTypefaceId | undefined;
  /** The strip itself, whose cells are what the labels have to fit. */
  stripRef: RefObject<HTMLDListElement | null>;
}

/** The custom property the strip's stylesheet reads its width from. */
export type StatBlockStyle = Readonly<
  Record<"--card-stat-columns", string>
>;
