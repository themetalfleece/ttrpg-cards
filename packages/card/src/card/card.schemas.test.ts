import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";
import { Value } from "@ttrpg-cards/validator";
import { describe, expect, it } from "vitest";

import { CARD_BLOCK_KINDS } from "./card.constants";
import { emberwakeSigil, tidewalkerBoots } from "./card.fixtures";
import {
  CARD_BLOCK_SCHEMA_BY_KIND,
  CardBlockSchema,
  CardCalloutBlockSchema,
  CardListBlockSchema,
  CardMetaFieldSchema,
  CardParagraphBlockSchema,
  CardSchema,
  CardSourceSchema,
} from "./card.schemas";
import type { Card } from "./card.types";

/** The fixture with one field removed, for the missing-field cases. */
function cardWithout(key: keyof Card): unknown {
  const draft: Record<string, unknown> = { ...emberwakeSigil };
  delete draft[key];
  return draft;
}

/** The smallest value the schema accepts. */
const bareCard: Card = {
  id: "bare",
  name: RichText.of("Bare"),
  meta: [],
  body: [],
};

function pathsOf(value: unknown): string[] {
  return Value.Errors(CardSchema, value).map(
    (error) => error.instancePath,
  );
}

describe("CardSchema", () => {
  it("accepts a spell-shaped card", () => {
    expect(Value.Check(CardSchema, emberwakeSigil)).toBe(true);
  });

  it("accepts a gear-shaped card built from the same shape", () => {
    expect(Value.Check(CardSchema, tidewalkerBoots)).toBe(true);
  });

  it("accepts a card with only the required fields", () => {
    expect(Value.Check(CardSchema, bareCard)).toBe(true);
  });

  it("accepts a card with no meta fields and no body", () => {
    const stripped = { ...emberwakeSigil, meta: [], body: [] };

    expect(Value.Check(CardSchema, stripped)).toBe(true);
  });

  it("accepts body text far longer than a face can hold", () => {
    const long = {
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "ember ".repeat(2_000) }],
        },
      ],
    };

    expect(Value.Check(CardSchema, long)).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(Value.Check(CardSchema, cardWithout("id"))).toBe(false);
  });

  it("rejects a missing meta list", () => {
    expect(Value.Check(CardSchema, cardWithout("meta"))).toBe(false);
  });

  it("rejects a missing body list", () => {
    expect(Value.Check(CardSchema, cardWithout("body"))).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(
      Value.Check(CardSchema, { ...emberwakeSigil, name: "" }),
    ).toBe(false);
  });

  it("rejects a field the model does not define", () => {
    const withExtra = { ...emberwakeSigil, difficulty: 12 };

    expect(Value.Check(CardSchema, withExtra)).toBe(false);
  });

  it("rejects an empty tag", () => {
    expect(
      Value.Check(CardSchema, { ...emberwakeSigil, tags: [""] }),
    ).toBe(false);
  });

  it("rejects a value that is not an object", () => {
    expect(Value.Check(CardSchema, null)).toBe(false);
    expect(Value.Check(CardSchema, "Emberwake Sigil")).toBe(false);
    expect(Value.Check(CardSchema, [emberwakeSigil])).toBe(false);
  });

  it("reports the position of a failing meta field", () => {
    const broken = {
      ...emberwakeSigil,
      meta: [
        { label: "Casting Time", value: "1 action" },
        { label: "", value: "18 metres" },
      ],
    };

    expect(pathsOf(broken)).toContain("/meta/1/label");
  });

  it("accepts a badge in the corner of the title bar", () => {
    expect(
      Value.Check(CardSchema, {
        ...emberwakeSigil,
        badge: RichText.of("1/4"),
      }),
    ).toBe(true);
  });

  it("accepts a badge longer than a corner can hold", () => {
    expect(
      Value.Check(CardSchema, {
        ...emberwakeSigil,
        badge: RichText.of("Second circle"),
      }),
    ).toBe(true);
  });

  it("accepts a footer of several entries", () => {
    expect(
      Value.Check(CardSchema, {
        ...emberwakeSigil,
        footer: [
          RichText.of("Kindling"),
          RichText.of("Ashcaller"),
          RichText.of("Third"),
        ],
      }),
    ).toBe(true);
  });

  it("rejects an empty footer, since absence already says none", () => {
    expect(
      Value.Check(CardSchema, { ...emberwakeSigil, footer: [] }),
    ).toBe(false);
  });

  it("rejects an empty footer entry", () => {
    expect(
      Value.Check(CardSchema, { ...emberwakeSigil, footer: [[]] }),
    ).toBe(false);
  });

  it("has no field for a category, since a tag says the same thing", () => {
    expect(
      Value.Check(CardSchema, {
        ...emberwakeSigil,
        category: "Spell",
      }),
    ).toBe(false);
  });

  it("rejects an empty tag list, since absence already says none", () => {
    expect(
      Value.Check(CardSchema, { ...emberwakeSigil, tags: [] }),
    ).toBe(false);
  });

  it("takes emphasis in the name, subtitle and footer alike", () => {
    const emphasised = {
      ...emberwakeSigil,
      name: [
        { text: "Emberwake", marks: [TEXT_MARKS.strong] },
        { text: " Sigil" },
      ],
      subtitle: [
        { text: "Second circle", marks: [TEXT_MARKS.emphasis] },
      ],
      footer: [[{ text: "Kindling", marks: [TEXT_MARKS.emphasis] }]],
    };

    expect(Value.Check(CardSchema, emphasised)).toBe(true);
  });

  it("keeps identifiers, tags and the attribution as plain strings", () => {
    expect(
      Value.Check(CardSchema, {
        ...emberwakeSigil,
        id: RichText.of("emberwake-sigil"),
      }),
    ).toBe(false);
    expect(
      Value.Check(CardSchema, {
        ...emberwakeSigil,
        tags: [RichText.of("fire")],
      }),
    ).toBe(false);
    expect(
      Value.Check(CardSchema, {
        ...emberwakeSigil,
        source: { name: RichText.of("Ember and Ledger") },
      }),
    ).toBe(false);
  });

  it("reports a failing body block against every block kind", () => {
    const broken = {
      ...emberwakeSigil,
      body: [
        {
          kind: CARD_BLOCK_KINDS.paragraph,
          text: [{ text: "" }],
        },
      ],
    };
    const paths = pathsOf(broken);

    expect(paths).toContain("/body/0/text");
    // A union is checked branch by branch, so most of what comes back is
    // untrue of the input. CardModel narrows to the declared kind before
    // any of it reaches a reader.
    expect(paths.length).toBeGreaterThan(1);
  });
});

describe("CardMetaFieldSchema", () => {
  it("accepts any label the content needs", () => {
    expect(
      Value.Check(CardMetaFieldSchema, {
        label: RichText.of("Attunement"),
        value: RichText.of("Required"),
      }),
    ).toBe(true);
  });

  it("rejects an empty label", () => {
    expect(
      Value.Check(CardMetaFieldSchema, {
        label: [{ text: "" }],
        value: RichText.of("Required"),
      }),
    ).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(
      Value.Check(CardMetaFieldSchema, {
        label: RichText.of("Rarity"),
        value: [{ text: "" }],
      }),
    ).toBe(false);
  });

  it("rejects a value that is not runs", () => {
    expect(
      Value.Check(CardMetaFieldSchema, {
        label: RichText.of("Weight"),
        value: 0.5,
      }),
    ).toBe(false);
  });

  it("takes emphasis in a stat value, like any other text", () => {
    expect(
      Value.Check(CardMetaFieldSchema, {
        label: RichText.of("Duration"),
        value: [
          { text: "Up to 1 minute", marks: [TEXT_MARKS.emphasis] },
          { text: ", held" },
        ],
      }),
    ).toBe(true);
  });
});

describe("CardParagraphBlockSchema", () => {
  it("accepts prose", () => {
    expect(
      Value.Check(CardParagraphBlockSchema, {
        kind: CARD_BLOCK_KINDS.paragraph,
        text: [{ text: "A low ring of embers." }],
      }),
    ).toBe(true);
  });

  it("rejects empty prose", () => {
    expect(
      Value.Check(CardParagraphBlockSchema, {
        kind: CARD_BLOCK_KINDS.paragraph,
        text: [{ text: "" }],
      }),
    ).toBe(false);
  });
});

describe("CardListBlockSchema", () => {
  it("accepts a list of items", () => {
    expect(
      Value.Check(CardListBlockSchema, {
        kind: CARD_BLOCK_KINDS.list,
        items: [[{ text: "Sheds dim light." }]],
      }),
    ).toBe(true);
  });

  it("rejects a list with no items", () => {
    expect(
      Value.Check(CardListBlockSchema, {
        kind: CARD_BLOCK_KINDS.list,
        items: [],
      }),
    ).toBe(false);
  });

  it("rejects an empty item", () => {
    expect(
      Value.Check(CardListBlockSchema, {
        kind: CARD_BLOCK_KINDS.list,
        items: [[{ text: "Sheds dim light." }], [{ text: "" }]],
      }),
    ).toBe(false);
  });
});

describe("CardCalloutBlockSchema", () => {
  it("accepts a callout with a label", () => {
    expect(
      Value.Check(CardCalloutBlockSchema, {
        kind: CARD_BLOCK_KINDS.callout,
        label: RichText.of("Stoked"),
        text: [{ text: "The ring burns twice as hot." }],
      }),
    ).toBe(true);
  });

  it("accepts a callout without a label", () => {
    expect(
      Value.Check(CardCalloutBlockSchema, {
        kind: CARD_BLOCK_KINDS.callout,
        text: [{ text: "The ring burns twice as hot." }],
      }),
    ).toBe(true);
  });

  it("rejects an empty label", () => {
    expect(
      Value.Check(CardCalloutBlockSchema, {
        kind: CARD_BLOCK_KINDS.callout,
        label: "",
        text: [{ text: "The ring burns twice as hot." }],
      }),
    ).toBe(false);
  });
});

describe("CardBlockSchema", () => {
  it("accepts every block kind", () => {
    const blocks = [
      {
        kind: CARD_BLOCK_KINDS.paragraph,
        text: [{ text: "Prose." }],
      },
      {
        kind: CARD_BLOCK_KINDS.list,
        items: [[{ text: "An item." }]],
      },
      {
        kind: CARD_BLOCK_KINDS.callout,
        text: [{ text: "An aside." }],
      },
    ];

    for (const block of blocks) {
      expect(Value.Check(CardBlockSchema, block)).toBe(true);
    }
  });

  it("rejects a kind the model does not define", () => {
    expect(
      Value.Check(CardBlockSchema, { kind: "table", rows: [] }),
    ).toBe(false);
  });

  it("accepts exactly the kinds the per-kind record holds", () => {
    expect(Object.keys(CARD_BLOCK_SCHEMA_BY_KIND).sort()).toEqual(
      Object.values(CARD_BLOCK_KINDS).sort(),
    );
    expect(Object.values(CARD_BLOCK_SCHEMA_BY_KIND)).toEqual(
      CardBlockSchema.anyOf,
    );
  });

  it("rejects a block carrying another kind's field", () => {
    expect(
      Value.Check(CardBlockSchema, {
        kind: CARD_BLOCK_KINDS.paragraph,
        text: [{ text: "Prose." }],
        items: [[{ text: "An item." }]],
      }),
    ).toBe(false);
  });
});

describe("CardSourceSchema", () => {
  it("accepts a name on its own", () => {
    expect(
      Value.Check(CardSourceSchema, { name: "Ember and Ledger" }),
    ).toBe(true);
  });

  it("accepts a web address", () => {
    expect(
      Value.Check(CardSourceSchema, {
        name: "Ember and Ledger",
        url: "https://example.com/ember-and-ledger",
      }),
    ).toBe(true);
  });

  it("rejects a scheme a browser should not follow", () => {
    const schemes = [
      "javascript:alert(1)",
      "data:text/html,<script></script>",
      "file:///etc/passwd",
    ];

    for (const url of schemes) {
      expect(
        Value.Check(CardSourceSchema, {
          name: "Ember and Ledger",
          url,
        }),
      ).toBe(false);
    }
  });

  it("rejects a web address with whitespace in it", () => {
    expect(
      Value.Check(CardSourceSchema, {
        name: "Ember and Ledger",
        url: "https://example.com/a b",
      }),
    ).toBe(false);
  });

  it("names the terms under the spelling other tools write", () => {
    expect(
      Value.Check(CardSourceSchema, {
        name: "Ember and Ledger",
        license: "CC BY 4.0",
      }),
    ).toBe(true);
    expect(
      Value.Check(CardSourceSchema, {
        name: "Ember and Ledger",
        licence: "CC BY 4.0",
      }),
    ).toBe(false);
  });
});
