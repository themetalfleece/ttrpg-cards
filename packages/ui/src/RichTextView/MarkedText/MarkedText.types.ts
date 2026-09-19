import type { TextRun } from "@ttrpg-cards/text";

/** One run of a span, rendered with its own marks. */
export interface MarkedTextProps {
  /** The run to render. */
  run: TextRun;
}
