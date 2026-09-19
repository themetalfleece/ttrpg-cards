import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import { CARD_BLOCK_KINDS } from "./card.constants";
import { emberwakeSigil, tidewalkerBoots } from "./card.fixtures";
import type { Card } from "./card.types";
import { CardModel } from "./CardModel";

const bareCard: Card = {
  id: "bare",
  name: RichText.of("Bare"),
  meta: [],
  body: [],
};

describe("CardModel.isCard", () => {
  it("accepts both a spell-shaped and a gear-shaped card", () => {
    expect(CardModel.isCard(emberwakeSigil)).toBe(true);
    expect(CardModel.isCard(tidewalkerBoots)).toBe(true);
  });

  it("rejects input that is not a card", () => {
    expect(CardModel.isCard(null)).toBe(false);
    expect(CardModel.isCard(undefined)).toBe(false);
    expect(CardModel.isCard("Emberwake Sigil")).toBe(false);
    expect(CardModel.isCard({})).toBe(false);
  });
});

describe("CardModel.validate", () => {
  it("reports nothing for a card", () => {
    expect(CardModel.validate(emberwakeSigil)).toEqual([]);
  });

  it("reports the path and a message for each failure", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      id: "",
      name: "",
    });

    expect(issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["/id", "/name"]),
    );
    for (const issue of issues) {
      expect(issue.message.length).toBeGreaterThan(0);
    }
  });

  it("reports a failure at the root for input of the wrong type", () => {
    const issues = CardModel.validate(42);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.path).toBe("");
  });

  it("reports only what is wrong with a block, not every kind it is not", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "" }],
        },
      ],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("/body/0/text/0/text");
  });

  it("names the kinds a block may declare when it declares another", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      body: [{ kind: "table", rows: [] }],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("/body/0/kind");
    expect(issues[0]?.message).toBe(
      "must be one of paragraph, list, callout",
    );
  });

  it("treats a block with no kind at all the same way", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      body: [{ text: "No kind here." }],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("/body/0/kind");
  });

  it("reports a field a block's own kind does not define", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "Prose." }],
          items: [[{ text: "An item." }]],
        },
      ],
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      "/body/0/items",
      "/body/0",
    ]);
  });

  it("reports an empty list of items at the list's own path", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      body: [{ kind: CARD_BLOCK_KINDS.list, items: [] }],
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      "/body/0/items",
    ]);
  });

  it("keeps each block's failures at its own index", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "Fine." }],
        },
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "" }],
        },
        { kind: "table", rows: [] },
      ],
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      "/body/1/text/0/text",
      "/body/2/kind",
    ]);
  });

  it("reports failures outside the body alongside the body's own", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      name: "",
      body: [{ kind: CARD_BLOCK_KINDS.paragraph, text: "" }],
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      "/name",
      "/body/0/text",
    ]);
  });

  it("reports a body that is not a list at all", () => {
    const issues = CardModel.validate({
      ...emberwakeSigil,
      body: "Prose.",
    });

    expect(issues.map((issue) => issue.path)).toContain("/body");
  });
});

describe("CardModel.from", () => {
  it("builds a model from valid input", () => {
    const model = CardModel.from(structuredClone(emberwakeSigil));

    expect(model.card).toEqual(emberwakeSigil);
  });

  it("copies what it validates, so later edits cannot reach it", () => {
    const untrusted = structuredClone(emberwakeSigil);
    const model = CardModel.from(untrusted);

    untrusted.name = RichText.of("Renamed after the check");
    untrusted.body.length = 0;

    expect(model.card).not.toBe(untrusted);
    expect(model.card.name).toEqual(RichText.of("Emberwake Sigil"));
    expect(model.blockCount).toBe(3);
  });

  it("canonicalises the body, so one prose has one card", () => {
    const split = {
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "One half, " }, { text: "then the other." }],
        },
      ],
    };
    const whole = {
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "One half, then the other." }],
        },
      ],
    };

    expect(CardModel.from(split).card).toEqual(
      CardModel.from(whole).card,
    );
  });

  it("canonicalises list items and callouts, not only paragraphs", () => {
    const model = CardModel.from({
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.list,
          items: [[{ text: "One half, " }, { text: "then more." }]],
        },
        {
          kind: CARD_BLOCK_KINDS.callout,
          text: [{ text: "An aside, " }, { text: "continued." }],
        },
      ],
    });

    expect(model.card.body).toEqual([
      {
        kind: CARD_BLOCK_KINDS.list,
        items: [[{ text: "One half, then more." }]],
      },
      {
        kind: CARD_BLOCK_KINDS.callout,
        text: [{ text: "An aside, continued." }],
      },
    ]);
  });

  it("canonicalises every span, not only the body", () => {
    const model = CardModel.from({
      ...emberwakeSigil,
      name: [{ text: "Emberwake" }, { text: " Sigil" }],
      subtitle: [{ text: "Second " }, { text: "circle" }],
      meta: [
        {
          label: [{ text: "Casting " }, { text: "Time" }],
          value: [{ text: "1 " }, { text: "action" }],
        },
      ],
      footer: [[{ text: "Kind" }, { text: "ling" }]],
    });

    expect(model.card.name).toEqual(RichText.of("Emberwake Sigil"));
    expect(model.card.subtitle).toEqual(RichText.of("Second circle"));
    expect(model.card.meta).toEqual([
      {
        label: RichText.of("Casting Time"),
        value: RichText.of("1 action"),
      },
    ]);
    expect(model.card.footer).toEqual([RichText.of("Kindling")]);
  });

  it("throws with the failing path named", () => {
    expect(() =>
      CardModel.from({ ...emberwakeSigil, name: "" }),
    ).toThrow(/\/name/);
  });

  it("throws one readable failure for a bad block", () => {
    expect(() =>
      CardModel.from({
        ...emberwakeSigil,
        body: [
          {
            kind: CARD_BLOCK_KINDS.paragraph,
            text: [{ text: "" }],
          },
        ],
      }),
    ).toThrow(
      "Not a card. /body/0/text/0/text: must not have fewer than 1 characters",
    );
  });

  it("throws for input that is not an object", () => {
    expect(() => CardModel.from(null)).toThrow(TypeError);
  });
});

describe("CardModel.blockText", () => {
  it("returns a paragraph's prose", () => {
    expect(
      CardModel.blockText({
        kind: CARD_BLOCK_KINDS.paragraph,
        text: [{ text: "A low ring of embers." }],
      }),
    ).toBe("A low ring of embers.");
  });

  it("flattens the runs inside a paragraph", () => {
    expect(
      CardModel.blockText({
        kind: CARD_BLOCK_KINDS.paragraph,
        text: [
          { text: "A low ring of " },
          { text: "embers", marks: [TEXT_MARKS.emphasis] },
          { text: "." },
        ],
      }),
    ).toBe("A low ring of embers.");
  });

  it("puts each list item on its own line", () => {
    expect(
      CardModel.blockText({
        kind: CARD_BLOCK_KINDS.list,
        items: [[{ text: "First." }], [{ text: "Second." }]],
      }),
    ).toBe("First.\nSecond.");
  });

  it("flattens the runs inside a list item", () => {
    expect(
      CardModel.blockText({
        kind: CARD_BLOCK_KINDS.list,
        items: [
          [
            { text: "Rough water", marks: [TEXT_MARKS.strong] },
            { text: " gives way." },
          ],
        ],
      }),
    ).toBe("Rough water gives way.");
  });

  it("puts a callout's label above its text", () => {
    expect(
      CardModel.blockText({
        kind: CARD_BLOCK_KINDS.callout,
        label: RichText.of("Stoked"),
        text: [{ text: "Twice as hot." }],
      }),
    ).toBe("Stoked\nTwice as hot.");
  });

  it("returns only the text of an unlabelled callout", () => {
    expect(
      CardModel.blockText({
        kind: CARD_BLOCK_KINDS.callout,
        text: [{ text: "Twice as hot." }],
      }),
    ).toBe("Twice as hot.");
  });
});

describe("CardModel counts", () => {
  it("counts the meta fields and blocks of a spell-shaped card", () => {
    const model = new CardModel({ card: emberwakeSigil });

    expect(model.metaFieldCount).toBe(4);
    expect(model.blockCount).toBe(3);
  });

  it("counts the meta fields and blocks of a gear-shaped card", () => {
    const model = new CardModel({ card: tidewalkerBoots });

    expect(model.metaFieldCount).toBe(4);
    expect(model.blockCount).toBe(2);
  });

  it("counts nothing on a card with no meta fields and no body", () => {
    const model = new CardModel({ card: bareCard });

    expect(model.metaFieldCount).toBe(0);
    expect(model.blockCount).toBe(0);
  });
});

describe("CardModel.isEmpty", () => {
  it("is false when the card has content", () => {
    expect(new CardModel({ card: emberwakeSigil }).isEmpty).toBe(
      false,
    );
  });

  it("is false when only the stat block is filled", () => {
    const model = new CardModel({
      card: { ...emberwakeSigil, body: [] },
    });

    expect(model.isEmpty).toBe(false);
  });

  it("is false when only the body is filled", () => {
    const model = new CardModel({
      card: { ...emberwakeSigil, meta: [] },
    });

    expect(model.isEmpty).toBe(false);
  });

  it("is true when neither is filled", () => {
    expect(new CardModel({ card: bareCard }).isEmpty).toBe(true);
  });
});

describe("CardModel.tags", () => {
  it("returns the card's tags", () => {
    expect(new CardModel({ card: emberwakeSigil }).tags).toEqual([
      "fire",
      "zone",
    ]);
  });

  it("returns an empty list when the card declares none", () => {
    expect(new CardModel({ card: bareCard }).tags).toEqual([]);
  });
});

describe("CardModel.bodyText", () => {
  it("joins every block in order", () => {
    const model = new CardModel({ card: tidewalkerBoots });
    const lines = model.bodyText.split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain(
      "The soles never quite touch the water.",
    );
    expect(lines[2]).toContain("Removing them");
  });

  it("is empty for a card with no body", () => {
    expect(new CardModel({ card: bareCard }).bodyText).toBe("");
  });
});

describe("CardModel.faceText", () => {
  it("covers every region the face lays out", () => {
    const text = new CardModel({ card: emberwakeSigil }).faceText;

    expect(text).toContain("Emberwake Sigil");
    expect(text).toContain("2");
    expect(text).toContain("Second circle, kindling");
    expect(text).toContain("Casting Time: 1 action");
    expect(text).toContain("Stoked");
    expect(text).toContain("Kindling Ashcaller");
  });

  it("puts every footer entry on one line", () => {
    const model = new CardModel({ card: tidewalkerBoots });

    expect(model.faceText).toContain("Worn gear Coastal Salvaged");
  });

  it("leaves out the tags, which are for finding a card", () => {
    const model = new CardModel({
      card: { ...bareCard, tags: ["Taggish"] },
    });

    expect(model.faceText).toBe("Bare");
  });

  it("leaves out regions the card does not fill", () => {
    expect(new CardModel({ card: bareCard }).faceText).toBe("Bare");
  });

  it("carries text far longer than a face can hold", () => {
    const paragraph = "ember ".repeat(2_000);
    const model = new CardModel({
      card: {
        ...bareCard,
        body: [
          {
            kind: CARD_BLOCK_KINDS.paragraph,
            text: [{ text: paragraph }],
          },
        ],
      },
    });

    expect(model.faceText).toBe(`Bare\n${paragraph}`);
  });
});
