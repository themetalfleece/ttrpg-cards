import type { ReactNode } from "react";

/** Something a reader can press to do one thing. */
export interface ButtonProps {
  /** What the button says. */
  children: ReactNode;
  /**
   * What pressing it does.
   *
   * The action, not the pointer event: a consumer never has to know what kind
   * of event reached the button, which is what lets the button change what it
   * listens for without changing anyone.
   */
  onPress: () => void;
  /** Whether it can be pressed at all. */
  disabled?: boolean | undefined;
  /** Passed through for a consumer that positions the button. */
  className?: string | undefined;
}
