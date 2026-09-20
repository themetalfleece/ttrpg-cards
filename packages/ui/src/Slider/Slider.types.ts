/**
 * A value dragged along a range.
 *
 * Controlled, like the other pickers here: it draws whatever `value` says and
 * reports a drag rather than remembering one.
 */
export interface SliderProps {
  /** What the slider is asking, shown above it. */
  label: string;
  /** Where it is now. */
  value: number;
  /** The smallest it may be. */
  minimum: number;
  /** The largest it may be. */
  maximum: number;
  /** The smallest change it moves in. */
  step: number;
  /** Called as the reader drags. */
  onValueChange: (value: number) => void;
  /** Shown beside the label, for a consumer that wants to say where it is. */
  readout?: string | undefined;
  /**
   * An aside about what dragging this actually does, shown when a reader rests
   * on the mark beside the label or tabs to it.
   *
   * Beside the label rather than on the track, because the track is dragged
   * and a bubble that opened under a pointer mid drag would be in the way of
   * the one thing the control is for. What goes here is help: a slider a
   * reader cannot use without reading this one wants a better label.
   */
  hint?: string | undefined;
  /** Passed through for a consumer that positions the slider. */
  className?: string | undefined;
}
