import clsx from "clsx";

import styles from "./Button.module.css";
import type { ButtonProps } from "./Button.types";

/**
 * Something a reader presses to do one thing.
 *
 * Always `type="button"`, because nothing here submits a form and a bare
 * button inside one would.
 */
export function Button({
  children,
  onPress,
  disabled,
  className,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(styles.button, className)}
      onClick={onPress}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
