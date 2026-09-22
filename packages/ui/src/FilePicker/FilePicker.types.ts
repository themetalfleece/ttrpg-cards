import type { ReactNode } from "react";

/** A button that opens the reader's own file picker. */
export interface FilePickerProps {
  /** What the button says. */
  children: ReactNode;
  /**
   * Which files the picker offers first, as the `accept` attribute spells it
   * (`".md,.markdown"`). A reader can always override it, so nothing may
   * depend on what comes back matching.
   */
  accept?: string | undefined;
  /**
   * Called with the files the reader chose, in the order the picker gave
   * them. Always at least one: nothing is reported when they choose none.
   */
  onFiles: (files: readonly File[]) => void;
  /** Whether the reader may choose more than one at a time. */
  multiple?: boolean | undefined;
  /** Whether the picker can be opened at all. */
  disabled?: boolean | undefined;
  /** Passed through for a consumer that positions the button. */
  className?: string | undefined;
}
