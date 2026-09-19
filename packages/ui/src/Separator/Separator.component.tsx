import clsx from "clsx";
import { Separator as SeparatorPrimitive } from "radix-ui";

import styles from "./Separator.module.css";
import type { SeparatorProps } from "./Separator.types";

/**
 * A rule between two regions.
 *
 * Drawn as a hairline in the border colour unless `--separator-thickness` or
 * `--separator-color` says otherwise. Either can be set on the passed class or
 * on any ancestor, which is how a surface with its own scale, such as a card
 * face, gets rules that match the rest of it.
 */
export function Separator({
  orientation = "horizontal",
  decorative = true,
  className,
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      className={clsx(styles.separator, className)}
      orientation={orientation}
      decorative={decorative}
    />
  );
}
