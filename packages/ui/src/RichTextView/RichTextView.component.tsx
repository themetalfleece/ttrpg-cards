import { MarkedText } from "./MarkedText/MarkedText.component";
import type { RichTextViewProps } from "./RichTextView.types";

/**
 * A span of card text.
 *
 * Every field a reader sees is runs rather than a string, so this is the one
 * place that turns them into markup and every surface showing card text goes
 * through it. It adds no element of its own: the caller decides what the span
 * sits in.
 */
export function RichTextView({ text }: RichTextViewProps) {
  return (
    <>
      {text.map((run, index) => (
        <MarkedText key={index} run={run} />
      ))}
    </>
  );
}
