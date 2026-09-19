import type { TextRuns } from "@ttrpg-cards/text";

/** A span of card text, rendered with the marks its runs carry. */
export interface RichTextViewProps {
  /** The span to render, in reading order. */
  text: TextRuns;
}
