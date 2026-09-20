import { ATTRIBUTIONS } from "@ttrpg-cards/srd";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AttributionNotice } from "./AttributionNotice.component";

/** The markup the notice renders to, for the catalogs the app bundles. */
function markupFor(
  attributions: typeof ATTRIBUTIONS = ATTRIBUTIONS,
): string {
  return renderToStaticMarkup(
    <AttributionNotice attributions={attributions} />,
  );
}

/** What a reader would see, with the markup taken out. */
function textOf(markup: string): string {
  return markup.replace(/<[^>]*>/g, "");
}

describe("AttributionNotice", () => {
  // The licence compels this exact text. A notice that paraphrases, reflows or
  // truncates it is not compliant, so the test reads the statement itself
  // rather than a phrase from it.
  it("reproduces every statement verbatim", () => {
    const text = textOf(markupFor());

    for (const attribution of ATTRIBUTIONS) {
      expect(text).toContain(attribution.statement);
    }
  });

  it("links the licensor's published source, which the reader has to be able to reach", () => {
    const markup = markupFor();

    for (const attribution of ATTRIBUTIONS) {
      expect(markup).toContain(`href="${attribution.sourceUrl}"`);
    }
  });

  it("names and links the licence", () => {
    const markup = markupFor();

    for (const attribution of ATTRIBUTIONS) {
      expect(markup).toContain(`href="${attribution.license.url}"`);
      expect(textOf(markup)).toContain(attribution.license.name);
    }
  });

  it("declares that the material was modified", () => {
    const text = textOf(markupFor());

    for (const attribution of ATTRIBUTIONS) {
      expect(text).toContain(attribution.modificationNotice);
    }
  });

  it("shows nothing when there is nothing to credit", () => {
    expect(markupFor([])).toBe("");
  });
});
