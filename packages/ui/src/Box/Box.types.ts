import type { CSSProperties, ReactNode } from "react";

/**
 * What a Box may be set as.
 *
 * A closed set, and a short one on purpose: these are the elements that carry
 * no meaning of their own. Anything that does, a heading, a list, a list item,
 * an article, stays itself rather than hiding behind a generic name.
 */
export type BoxElement = "div" | "p" | "span";

/** A container with no meaning of its own. */
export interface BoxProps {
  /** What to render. A `div` unless the content asks for another. */
  as?: BoxElement | undefined;
  className?: string | undefined;
  /** For a container something else has to point at, such as a group's label. */
  id?: string | undefined;
  /** For the custom properties a surface sets on its own root. */
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}
