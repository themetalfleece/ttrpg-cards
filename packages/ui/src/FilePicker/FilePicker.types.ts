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
  /** Called with the file the reader chose. */
  onFile: (file: File) => void;
  /** Whether the picker can be opened at all. */
  disabled?: boolean | undefined;
  /** Passed through for a consumer that positions the button. */
  className?: string | undefined;
}
