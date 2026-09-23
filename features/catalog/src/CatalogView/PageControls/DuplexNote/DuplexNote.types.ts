import type { FlipEdgeName } from "@ttrpg-cards/printer";

/** What the printer has to be set to for the sheets to come out right. */
export interface DuplexNoteProps {
  /** The edge the reader picked, which the note names back to them. */
  flipEdge: FlipEdgeName;
}
