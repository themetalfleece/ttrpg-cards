import type { ReactNode } from "react";

/**
 * An aside about the thing it is attached to.
 *
 * A tooltip is shown on hover and on keyboard focus and nowhere else, so what
 * goes in one has to be help rather than the only place something is said. A
 * reader who never points at the trigger has to be able to use the control
 * anyway.
 */
export interface TooltipProps {
  /** What the tooltip says. */
  content: string;
  /**
   * What the tooltip is attached to. Rendered as the trigger itself rather
   * than wrapped, so it has to be a single element that takes a ref, and it
   * should be something focusable or the tooltip is hover only.
   */
  children: ReactNode;
  /** Passed through for a consumer that positions the bubble. */
  className?: string | undefined;
}
