import type { ElementType } from "react";

import type { BoxProps } from "./Box.types";

/** What a Box is when nothing says otherwise. */
const DEFAULT_BOX_ELEMENT = "div";

/**
 * A container with no meaning of its own, styled by the class it is given.
 *
 * Components reach for this instead of writing a bare `div`, `p` or `span`, so
 * the generic elements come from one place and a change to what a container is
 * happens once rather than in every file that renders one.
 */
export function Box({
  as = DEFAULT_BOX_ELEMENT,
  className,
  style,
  children,
}: BoxProps) {
  // The element varies, so its type is widened past the three it can be.
  const Element: ElementType = as;

  return (
    <Element className={className} style={style}>
      {children}
    </Element>
  );
}
