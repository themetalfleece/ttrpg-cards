/**
 * Several lines of text a reader types or pastes.
 *
 * Controlled: it draws whatever `value` says and reports what was typed
 * rather than remembering it, so the text lives with whatever reads it.
 */
export interface TextAreaProps {
  /** What the field is asking for, shown above it. */
  label: string;
  /** What is in it. */
  value: string;
  /** Called with the text after every change. */
  onValueChange: (value: string) => void;
  /** Shown while it is empty, as a hint at the shape of the answer. */
  placeholder?: string | undefined;
  /** How many lines tall it starts. It grows no further on its own. */
  rows?: number | undefined;
  /** Passed through for a consumer that positions the field. */
  className?: string | undefined;
}
