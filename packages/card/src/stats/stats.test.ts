import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import { CARD_BLOCK_KINDS, type Card } from "../card";
import {
  cardWithFittedStats,
  liftedParenthetical,
  shortenedStatValue,
} from "./stats";

/** A card carrying the stat block a test is about, and nothing else. */
function cardWith(options: {
  meta: readonly [label: string, value: string][];
  body?: Card["body"];
}): Card {
  return {
    id: "ward",
    name: RichText.of("Ward"),
    meta: options.meta.map(([label, value]) => ({
      label: RichText.of(label),
      value: RichText.of(value),
    })),
    body: options.body ?? [],
  };
}

/** The stat block values of a card, as plain words. */
function valuesOf(card: Card): string[] {
  return card.meta.map((field) => RichText.plain(field.value));
}

describe("shortenedStatValue", () => {
  // The rule exists for one shape: a value that is a single word wider than
  // the cell it sits in, which has nowhere to wrap and breaks in half.
  it("sets a value too long for a cell shorter", () => {
    expect(shortenedStatValue("Instantaneous")).toBe("Instant");
  });

  it("names a held duration once, in place of the up to it implies", () => {
    expect(shortenedStatValue("Concentration, up to 1 hour")).toBe(
      "Conc. 1 hour",
    );
    expect(
      shortenedStatValue("Concentration, up to 10 minutes"),
    ).toBe("Conc. 10 minutes");
  });

  // The wording varies between documents, and a reader's own varies more.
  it("reads a held duration however it was punctuated", () => {
    expect(shortenedStatValue("Concentration up to 1 hour")).toBe(
      "Conc. 1 hour",
    );
    expect(shortenedStatValue("concentration, 1 hour")).toBe(
      "Conc. 1 hour",
    );
  });

  it("leaves a value a cell can hold exactly as it was written", () => {
    for (const value of [
      "8 hours",
      "Until dispelled",
      "Until dispelled or triggered",
      "1 round",
      "Self",
      "V, S, M",
    ]) {
      expect(shortenedStatValue(value)).toBe(value);
    }
  });

  // Keyed on the whole value, so a longer one that happens to contain the
  // word keeps every word of it.
  it("leaves a longer value holding the shortened word alone", () => {
    expect(shortenedStatValue("Instantaneous or until dawn")).toBe(
      "Instantaneous or until dawn",
    );
  });

  it("trims what it is handed", () => {
    expect(shortenedStatValue("  8 hours  ")).toBe("8 hours");
    expect(shortenedStatValue("")).toBe("");
  });
});

describe("liftedParenthetical", () => {
  // The case this exists for: a component list carrying a sentence.
  it("lifts prose out of a value and leaves the value behind", () => {
    expect(
      liftedParenthetical("V, S, M (a twig struck by lightning)"),
    ).toEqual({
      value: "V, S, M",
      lifted: "A twig struck by lightning.",
    });
  });

  it("closes what it lifted, since it is a sentence once it is a block", () => {
    expect(
      liftedParenthetical("V, M (a silver pin worth 50 coins.)")
        .lifted,
    ).toBe("A silver pin worth 50 coins.");
    expect(
      liftedParenthetical("V, M (which silver pin is it, exactly?)")
        .lifted,
    ).toBe("Which silver pin is it, exactly?");
  });

  // What a caster holds is a thing, not a qualification of the letters beside
  // it, and the bundled catalog has always set one under the body.
  it("lifts a material however few words it runs to", () => {
    expect(
      liftedParenthetical("S, M (a silver pin)", {
        label: "Components",
      }),
    ).toEqual({ value: "S, M", lifted: "A silver pin." });
  });

  it("does not mind how the document capitalises that label", () => {
    expect(
      liftedParenthetical("S, M (a silver pin)", {
        label: "  COMPONENTS  ",
      }).lifted,
    ).toBe("A silver pin.");
  });

  // The exception is the components list, not brackets in general, so a field
  // that qualifies itself keeps its qualification.
  it("leaves a short bracket beside a value of any other field", () => {
    expect(
      liftedParenthetical("1 action (ritual)", {
        label: "Casting Time",
      }),
    ).toEqual({ value: "1 action (ritual)", lifted: undefined });
  });

  // A short bracket qualifies the value and reads as part of it.
  it("leaves a bracket short enough to belong in the cell", () => {
    for (const value of [
      "1 action (ritual)",
      "Self (30-foot cone)",
      "1 minute (see below)",
    ]) {
      expect(liftedParenthetical(value)).toEqual({
        value,
        lifted: undefined,
      });
    }
  });

  it("leaves a value with no bracket at all", () => {
    expect(liftedParenthetical("V, S, M")).toEqual({
      value: "V, S, M",
      lifted: undefined,
    });
  });

  // Nothing is left in the cell, so there is nothing for the lifted half to
  // qualify and the value stays as the reader wrote it.
  it("leaves a value that is nothing but a bracket", () => {
    const value = "(a twig struck by lightning)";

    expect(liftedParenthetical(value)).toEqual({
      value,
      lifted: undefined,
    });
  });

  it("leaves an empty bracket where it found it", () => {
    expect(liftedParenthetical("V, S, M ()")).toEqual({
      value: "V, S, M ()",
      lifted: undefined,
    });
  });
});

// The transformer every source goes through. What it does to one value is
// settled above; these are about what it does to a card.
describe("cardWithFittedStats", () => {
  it("sets every value its cell can hold shorter", () => {
    const card = cardWithFittedStats(
      cardWith({
        meta: [
          ["Range", "60 feet"],
          ["Duration", "Instantaneous"],
          ["Casting Time", "1 action"],
        ],
      }),
    );

    expect(valuesOf(card)).toEqual([
      "60 feet",
      "Instant",
      "1 action",
    ]);
    expect(card.body).toEqual([]);
  });

  // The whole point of lifting: the body is where prose belongs, and the end
  // of it is where a reader looks for what a card needs rather than what it
  // does.
  it("puts prose it lifted at the end of the body", () => {
    const card = cardWithFittedStats(
      cardWith({
        meta: [
          ["Components", "V, S, M (a twig struck by lightning)"],
        ],
        body: [
          {
            kind: CARD_BLOCK_KINDS.paragraph,
            text: RichText.of("The light holds."),
          },
        ],
      }),
    );

    expect(valuesOf(card)).toEqual(["V, S, M"]);
    expect(card.body).toHaveLength(2);
    expect(card.body[1]).toEqual({
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of("Material"),
      text: RichText.of("A twig struck by lightning."),
    });
  });

  // `Components` is printed in the cell above the block, so repeating it over
  // the block says nothing the card does not already say.
  it("names a block lifted out of the components list for what it is", () => {
    const card = cardWithFittedStats(
      cardWith({ meta: [["Components", "S, M (a silver pin)"]] }),
    );

    expect(card.body[0]).toEqual({
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of("Material"),
      text: RichText.of("A silver pin."),
    });
  });

  it("labels a block lifted out of any other field with that field", () => {
    const card = cardWithFittedStats(
      cardWith({
        meta: [
          ["Range", "Self (a line 30 feet long and 5 feet wide)"],
        ],
      }),
    );

    expect(valuesOf(card)).toEqual(["Self"]);
    expect(card.body[0]).toEqual({
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of("Range"),
      text: RichText.of("A line 30 feet long and 5 feet wide."),
    });
  });

  // A card that has been through once is already set the way the face wants
  // it, so going through again has nothing left to do. That is what makes it
  // safe to apply wherever a card is built without tracking whether it was.
  it("gives back the same card when there is nothing to set", () => {
    const card = cardWith({
      meta: [
        ["Range", "60 feet"],
        ["Duration", "8 hours"],
      ],
    });

    expect(cardWithFittedStats(card)).toBe(card);
  });

  it("gives the same answer however many times it runs", () => {
    const once = cardWithFittedStats(
      cardWith({
        meta: [
          ["Components", "V, S, M (a twig struck by lightning)"],
          ["Duration", "Concentration, up to 1 hour"],
        ],
      }),
    );

    expect(cardWithFittedStats(once)).toEqual(once);
  });

  // Emphasis is something a writer meant, and no rewrite here can carry it
  // through, so a value carrying any is left exactly as it was set.
  it("leaves a value that carries marks alone", () => {
    const marked: Card = {
      ...cardWith({ meta: [] }),
      meta: [
        {
          label: RichText.of("Duration"),
          value: [
            { text: "Instantaneous", marks: [TEXT_MARKS.emphasis] },
          ],
        },
      ],
    };

    expect(cardWithFittedStats(marked)).toBe(marked);
  });

  it("keeps everything about a card that is not its stat block", () => {
    const card = cardWith({
      meta: [["Duration", "Instantaneous"]],
    });
    const fitted = cardWithFittedStats({
      ...card,
      badge: RichText.of("3"),
      footer: [RichText.of("Abjuration")],
      tags: ["ward"],
    });

    expect(fitted.id).toBe("ward");
    expect(fitted.badge).toEqual(RichText.of("3"));
    expect(fitted.footer).toEqual([RichText.of("Abjuration")]);
    expect(fitted.tags).toEqual(["ward"]);
  });
});
