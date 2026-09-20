import { MarkdownDocument } from "@ttrpg-cards/importer";
import { describe, expect, it } from "vitest";

import { PASTE_PLACEHOLDER } from "./ImportPanel.constants";

/** A span of card text as the reader sees it, with the emphasis flattened. */
function plain(text: readonly { text: string }[] = []): string {
  return text.map((run) => run.text).join("");
}

/**
 * The placeholder is the only thing on this screen that tells a reader what a
 * card looks like, so it is held to the parser rather than to anyone's memory
 * of it. A shape that stopped parsing would otherwise go on being advertised
 * until somebody happened to copy it.
 */
describe("PASTE_PLACEHOLDER", () => {
  const document = new MarkdownDocument({
    source: PASTE_PLACEHOLDER,
  });

  it("reads as exactly one card, with nothing left over", () => {
    expect(document.cards).toHaveLength(1);
    expect(document.issues).toEqual([]);
  });

  it("shows every part of a card it appears to show", () => {
    const card = document.cards[0];

    expect(plain(card?.name)).toBe("Lantern Ward");
    expect(card?.meta.map((field) => plain(field.label))).toEqual([
      "Range",
      "Duration",
    ]);
    expect(card?.body).toHaveLength(1);
  });

  // The line under the title states a rank, so it lands where a card puts
  // one: the number in the badge and the rest along the bottom rule.
  it("lands its opening line in the badge and along the rule", () => {
    const card = document.cards[0];

    expect(plain(card?.badge)).toBe("3");
    expect(card?.footer?.map(plain)).toEqual(["abjuration"]);
    expect(card?.subtitle).toBeUndefined();
  });
});
