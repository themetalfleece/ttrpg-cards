import { RichText, type TextRuns } from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import {
  CARD_BLOCK_KINDS,
  type Card,
  type CardBlock,
  CardModel,
} from "../card";
import { CardLayout } from "../layout";
import { CardSet } from "./CardSet";
import {
  CONTINUATION_ID_SEPARATOR,
  MAXIMUM_CARDS_PER_SET,
} from "./set.constants";
import * as setFixtures from "./set.fixtures";
import {
  fitsByTextCapacity,
  longBodyCard,
  longCalloutCard,
  longFirstItemCard,
  longListCard,
  minimalCard,
  oneLongBlockCard,
  oneSentenceCard,
  orphanLastBlockCard,
  unbreakableWordCard,
} from "./set.fixtures";

const defaultLayout = CardLayout.default();

/** A card cut small enough that even a sentence or two will not fit on it. */
const tinyLayout = defaultLayout.with({
  size: { widthMillimetres: 30, heightMillimetres: 30 },
});

/** A taller card, for showing the cut move without anything else changing. */
const tallLayout = defaultLayout.with({
  size: { heightMillimetres: 110 },
});

const fitsDefault = fitsByTextCapacity(defaultLayout);

/** The words a card or a set carries, in order. */
function words(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0);
}

/** The body text of the card a set was made from. */
function sourceWords(card: Card): string[] {
  return words(new CardModel({ card }).bodyText);
}

/** How many blocks each card of a set carries. */
function blockCounts(set: CardSet): number[] {
  return set.cards.map((card) => card.body.length);
}

/** The text of a block, empty when there is no block there. */
function blockText(block: CardBlock | undefined): string {
  return block === undefined ? "" : CardModel.blockText(block);
}

/** How many bullets a block has, or zero when it is not a list. */
function listItemCount(block: CardBlock | undefined): number {
  if (block?.kind !== CARD_BLOCK_KINDS.list) {
    return 0;
  }

  return block.items.length;
}

/** The label of a block, when it is an aside that carries one. */
function calloutLabel(
  block: CardBlock | undefined,
): TextRuns | undefined {
  if (block?.kind !== CARD_BLOCK_KINDS.callout) {
    return undefined;
  }

  return block.label;
}

describe("CardSet.of", () => {
  it("makes a set of one that shows no position", () => {
    const set = CardSet.of(minimalCard);

    expect(set.length).toBe(1);
    expect(set.isSplit).toBe(false);
    expect(set.positionAt(0)).toBeUndefined();
  });
});

describe("new CardSet", () => {
  it("refuses a set with no cards in it", () => {
    expect(() => new CardSet({ cards: [] })).toThrow(TypeError);
  });

  it("is addressed by the id of the card it was made from", () => {
    expect(CardSet.of(minimalCard).id).toBe(minimalCard.id);
  });
});

describe("CardSet.positionAt", () => {
  it("reads as a position out of a total", () => {
    const set = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });

    expect(set.positionAt(0)?.label).toBe("1/2");
    expect(set.positionAt(1)).toEqual({
      number: 2,
      total: 2,
      label: "2/2",
    });
  });

  it("has nothing to say about a card outside the set", () => {
    const set = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });

    expect(set.positionAt(-1)).toBeUndefined();
    expect(set.positionAt(set.length)).toBeUndefined();
  });
});

describe("CardSet.split", () => {
  it("leaves a card that fits whole and untouched", () => {
    const set = CardSet.split({
      card: minimalCard,
      fits: fitsDefault,
    });

    expect(set.length).toBe(1);
    expect(set.cards[0]).toBe(minimalCard);
    expect(set.faces[0]?.position).toBeUndefined();
  });

  it("splits an entry that overflows into exactly two cards", () => {
    const set = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });

    expect(set.length).toBe(2);
    expect(set.faces.map((face) => face.position?.label)).toEqual([
      "1/2",
      "2/2",
    ]);
  });

  it("loses no word and repeats none", () => {
    const set = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });

    expect(words(set.bodyText)).toEqual(sourceWords(longBodyCard));
  });

  it("keeps the whole card on the first of the set", () => {
    const [first] = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    }).cards;

    expect(first?.meta).toEqual(longBodyCard.meta);
    expect(first?.subtitle).toEqual(longBodyCard.subtitle);
    expect(first?.footer).toEqual(longBodyCard.footer);
  });

  it("carries the name onto a continuation and the stat block nowhere", () => {
    const set = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });
    const continuation = set.cards[1];

    expect(continuation?.name).toEqual(longBodyCard.name);
    expect(continuation?.meta).toEqual([]);
    expect(continuation?.badge).toBeUndefined();
    expect(continuation?.subtitle).toBeUndefined();
    expect(continuation?.footer).toBeUndefined();
  });

  it("builds a continuation's id from the card the set was made from", () => {
    const set = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });

    expect(set.id).toBe(longBodyCard.id);
    expect(set.cards[1]?.id).toBe(
      `${longBodyCard.id}${CONTINUATION_ID_SEPARATOR}2`,
    );
  });

  it("cuts between blocks while there is a block boundary to use", () => {
    const set = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });

    // Every block of every card is a block of the card it came from, which is
    // only true while nothing was cut inside one.
    const sourceTexts = longBodyCard.body.map(CardModel.blockText);

    for (const card of set.cards) {
      for (const block of card.body) {
        expect(sourceTexts).toContain(CardModel.blockText(block));
      }
    }
  });

  it("cuts inside a block at a sentence end when there is no block boundary", () => {
    const set = CardSet.split({
      card: oneLongBlockCard,
      fits: fitsDefault,
    });

    const opening = set.cards[0]?.body[0];

    expect(set.length).toBe(2);
    expect(words(set.bodyText)).toEqual(
      sourceWords(oneLongBlockCard),
    );
    expect(blockText(opening).trimEnd()).toMatch(/[.!?]$/);
  });

  it("cuts at a word end when no sentence end is early enough", () => {
    const set = CardSet.split({
      card: oneSentenceCard,
      fits: fitsByTextCapacity(tinyLayout),
    });

    expect(set.length).toBeGreaterThan(1);
    expect(words(set.bodyText)).toEqual(sourceWords(oneSentenceCard));
  });

  it("leaves a block whole rather than cutting a word", () => {
    const set = CardSet.split({
      card: unbreakableWordCard,
      fits: fitsByTextCapacity(tinyLayout),
    });

    expect(set.length).toBe(1);
    expect(words(set.bodyText)).toEqual(
      sourceWords(unbreakableWordCard),
    );
  });

  it("splits a list between its items and sets them back out as a list", () => {
    const set = CardSet.split({
      card: longListCard,
      fits: fitsDefault,
    });

    expect(set.length).toBe(2);
    expect(words(set.bodyText)).toEqual(sourceWords(longListCard));

    for (const card of set.cards) {
      expect(card.body).toHaveLength(1);
      expect(card.body[0]?.kind).toBe(CARD_BLOCK_KINDS.list);
    }
  });

  it("gathers a cut item back together with the items after it", () => {
    const set = CardSet.split({
      card: longFirstItemCard,
      fits: fitsByTextCapacity(tinyLayout),
    });

    expect(set.length).toBe(2);
    expect(words(set.bodyText)).toEqual(
      sourceWords(longFirstItemCard),
    );

    // One list in, one list on every card out. A trailing half followed by the
    // next whole item is an item boundary, not the start of a second list.
    for (const card of set.cards) {
      expect(card.body).toHaveLength(1);
      expect(card.body[0]?.kind).toBe(CARD_BLOCK_KINDS.list);
    }

    expect(listItemCount(set.cards[1]?.body[0])).toBe(3);
  });

  it("keeps a cut aside's label on its opening half only", () => {
    const set = CardSet.split({
      card: longCalloutCard,
      fits: fitsDefault,
    });
    const labels = set.cards.map((card) =>
      calloutLabel(card.body[0]),
    );

    expect(set.length).toBe(2);
    expect(labels[0]).toBeDefined();
    expect(labels[1]).toBeUndefined();
    expect(words(set.bodyText)).toEqual(sourceWords(longCalloutCard));
  });

  it("moves a block forward rather than leaving one alone on the last card", () => {
    const set = CardSet.split({
      card: orphanLastBlockCard,
      fits: fitsDefault,
    });

    expect(set.length).toBe(2);
    expect(set.cards[1]?.body.length).toBeGreaterThan(1);
    expect(words(set.bodyText)).toEqual(
      sourceWords(orphanLastBlockCard),
    );
  });

  it("moves the cut when the card is cut to another size", () => {
    const onDefault = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });
    const onTall = CardSet.split({
      card: longBodyCard,
      fits: fitsByTextCapacity(tallLayout),
    });

    expect(blockCounts(onTall)[0]).toBeGreaterThan(
      blockCounts(onDefault)[0] ?? 0,
    );
    expect(words(onTall.bodyText)).toEqual(sourceWords(longBodyCard));
  });

  it("gives the same answer every time for the same card and geometry", () => {
    const first = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });
    const second = CardSet.split({
      card: longBodyCard,
      fits: fitsDefault,
    });

    expect(second.cards).toEqual(first.cards);
  });

  it("stops at the maximum rather than dividing a card down to words", () => {
    const body = Array.from({ length: 40 }, (_, index) => ({
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(`Turn ${index + 1} of the tide.`),
    }));
    const card: Card = { ...minimalCard, body };

    const set = CardSet.split({ card, fits: () => false });

    expect(set.length).toBe(MAXIMUM_CARDS_PER_SET);
    expect(words(set.bodyText)).toEqual(sourceWords(card));
  });

  it("makes a set of one from a card with nothing to split", () => {
    const card: Card = { ...minimalCard, body: [] };

    expect(CardSet.split({ card, fits: () => false }).length).toBe(1);
  });

  it("builds cards the model accepts", () => {
    const cards = Object.values(setFixtures).filter(
      (value): value is Card => typeof value !== "function",
    );

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(CardModel.validate(card)).toEqual([]);

      for (const split of CardSet.split({ card, fits: fitsDefault })
        .cards) {
        expect(CardModel.validate(split)).toEqual([]);
      }
    }
  });
});
