/** One of the choices a group offers. */
export interface ChoiceGroupOption<Value extends string> {
  /** What picking this reports back. */
  readonly value: Value;
  /** What the reader sees on it. */
  readonly label: string;
}

/**
 * A small set of choices, exactly one of which is picked.
 *
 * Controlled: the group draws whatever `value` says and reports a pick rather
 * than remembering one, so the state lives with whatever the choice changes.
 */
export interface ChoiceGroupProps<Value extends string> {
  /** What the group is asking, shown above the choices. */
  label: string;
  /** The choices, in the order they are offered. */
  options: readonly ChoiceGroupOption<Value>[];
  /** Which one is picked. */
  value: Value;
  /** Called with the choice the reader picked. */
  onValueChange: (value: Value) => void;
  /** Passed through for a consumer that positions the group. */
  className?: string | undefined;
}
