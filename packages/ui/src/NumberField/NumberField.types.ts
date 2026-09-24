/**
 * A measurement a reader types, held to a range.
 *
 * Controlled, like the other pickers here: it shows whatever `value` says and
 * reports what was typed rather than remembering it. A quantity with no
 * meaningful number to state wants a `Slider`, and a short set of named
 * choices wants a `ChoiceGroup`. This is for the case where the number itself
 * is the point and the reader knows which one they want.
 */
export interface NumberFieldProps {
  /** What the field is asking, shown above it. */
  label: string;
  /** The number it is showing now. */
  value: number;
  /** The smallest it may be. */
  minimum: number;
  /** The largest it may be. */
  maximum: number;
  /** The smallest change its own steppers move in. */
  step: number;
  /**
   * Called with what the reader typed, once they have finished typing it.
   *
   * Not on every keystroke. A field held to a range would otherwise correct a
   * half-typed number as it is being typed, so a reader working towards 148
   * has the 1 taken off them before they reach the 4. What arrives here is
   * still unchecked: the caller holds it to the range, because the caller is
   * what owns the range.
   */
  onValueChange: (value: number) => void;
  /**
   * The unit the number is in, shown inside the field after it.
   *
   * Shown rather than typed: it is part of the question, not part of the
   * answer, and a reader who types it would be typing something the field has
   * to throw away.
   */
  unit?: string | undefined;
  /** Passed through for a consumer that positions the field. */
  className?: string | undefined;
}
