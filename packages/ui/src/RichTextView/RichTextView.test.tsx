import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RichTextView } from "./RichTextView.component";
import type { RichTextViewProps } from "./RichTextView.types";

/** The markup a span renders to, which is the whole of what this component does. */
function markupFor(text: RichTextViewProps["text"]): string {
  return renderToStaticMarkup(<RichTextView text={text} />);
}

describe("RichTextView", () => {
  it("renders unmarked text as characters and nothing else", () => {
    expect(markupFor(RichText.of("Guttering"))).toBe("Guttering");
  });

  it("sets a strong run in an element that says so", () => {
    const markup = markupFor([
      { text: "Loud", marks: [TEXT_MARKS.strong] },
    ]);

    expect(markup).toBe("<strong>Loud</strong>");
  });

  it("sets an emphasised run in an element that says so", () => {
    const markup = markupFor([
      { text: "Quiet", marks: [TEXT_MARKS.emphasis] },
    ]);

    expect(markup).toBe("<em>Quiet</em>");
  });

  it("nests both marks when a run carries both", () => {
    const markup = markupFor([
      {
        text: "Both",
        marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
      },
    ]);

    expect(markup).toBe("<strong><em>Both</em></strong>");
  });

  it("keeps runs in reading order", () => {
    const markup = markupFor([
      { text: "1 reaction", marks: [TEXT_MARKS.strong] },
      { text: ", taken as the light goes out" },
    ]);

    expect(markup).toBe(
      "<strong>1 reaction</strong>, taken as the light goes out",
    );
  });

  // The model rejects an empty span, so this is about not falling over on one.
  it("renders nothing for a span with no runs", () => {
    expect(markupFor([])).toBe("");
  });
});
