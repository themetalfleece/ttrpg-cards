/** A rule drawn between two regions of a surface. */
export interface SeparatorProps {
  /** Which way the rule runs. Horizontal unless told otherwise. */
  orientation?: "horizontal" | "vertical" | undefined;
  /**
   * Whether the rule is there to be looked at rather than read. Decorative by
   * default, because a rule between regions carries no meaning of its own.
   */
  decorative?: boolean | undefined;
  /** Passed through for a consumer that sets the rule's weight or spacing. */
  className?: string | undefined;
}
