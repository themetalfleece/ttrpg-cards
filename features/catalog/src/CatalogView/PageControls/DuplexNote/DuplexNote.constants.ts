import { FLIP_EDGES, type FlipEdgeName } from "@ttrpg-cards/printer";

/** What a slot is, once its front and its back are one entry between them. */
export const DUPLEX_SUMMARY =
  "A slot is one card: its front and its back are the two halves of one entry, so a single cut gives you a double-sided card with the whole thing on it.";

/**
 * How the note asks for the blank backs to be left alone.
 *
 * A driver that skips them moves every back after the one it dropped onto the
 * wrong front, which spoils the run rather than one card, and the setting is
 * on by default in some drivers and off in others.
 */
export const BLANK_PAGES_INSTRUCTION =
  "If your printer offers to skip blank pages, turn that off. A blank back is still a page, and dropping one moves every back after it onto the wrong front.";

/**
 * How the note asks for the flip to be matched, naming the edge the reader
 * picked rather than describing both.
 *
 * Matching this control to the print dialog is the one thing they have to do,
 * and drivers disagree about what they call the two edges, so the way out of a
 * mismatch is named as well. User-facing copy, so American spelling.
 *
 * @example
 * ```ts
 * flipInstruction({ flipEdge: "long-edge" });
 * // "Print double-sided, flipped on the long edge. If the backs ..."
 * ```
 */
export function flipInstruction(options: {
  flipEdge: FlipEdgeName;
}): string {
  const edge = FLIP_EDGES.find(
    (candidate) => candidate.id === options.flipEdge,
  );
  const name = edge?.name.toLowerCase() ?? options.flipEdge;

  return `Print double-sided, flipped on the ${name}. If the backs come out belonging to their neighbors, switch both this control and the printer to the other edge.`;
}
