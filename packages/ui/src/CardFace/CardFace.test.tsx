import { type Card, CardLayout, CardModel } from "@ttrpg-cards/card";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CardFace } from "./CardFace.component";
import * as cardFixtures from "./CardFace.fixtures";
import {
  gearShapedCard,
  minimalCard,
  longBodyCard,
  spellShapedCard,
} from "./CardFace.fixtures";

/** The markup a card renders to, at the default geometry unless told otherwise. */
function markupFor(options: {
  card: Card;
  layout?: CardLayout;
}): string {
  const layout = options.layout ?? CardLayout.default();

  return renderToStaticMarkup(
    <CardFace card={options.card} layout={layout} />,
  );
}

/** What a reader would see, with the markup taken out. */
function textOf(markup: string): string {
  return markup.replace(/<[^>]*>/g, "");
}

describe("CardFace", () => {
  it("renders a spell-shaped and a gear-shaped card through the same component", () => {
    const spell = markupFor({ card: spellShapedCard });
    const gear = markupFor({ card: gearShapedCard });

    expect(textOf(spell)).toContain("Casting Time");
    expect(textOf(gear)).toContain("Rarity");

    // The two carry different meta labels and nothing else differs in kind,
    // which is the whole claim: one renderer, no branch on what a card is.
    for (const markup of [spell, gear]) {
      expect(markup).toContain("<dl");
      expect(markup).toContain("<ul");
      expect(markup).toContain("<article");
    }
  });

  it("carries the marks a run of text is written with", () => {
    expect(markupFor({ card: spellShapedCard })).toContain(
      "<strong>seen</strong>",
    );
  });

  it("lays the card out at the size it is handed", () => {
    const layout = CardLayout.default().with({
      size: { widthMillimetres: 89, heightMillimetres: 127 },
    });

    const markup = markupFor({ card: spellShapedCard, layout });

    expect(markup).toContain("--card-width:89mm");
    expect(markup).toContain("--card-height:127mm");
  });

  it("changes nothing but the geometry when the size changes", () => {
    const standard = markupFor({ card: spellShapedCard });
    const larger = markupFor({
      card: spellShapedCard,
      layout: CardLayout.default().with({
        size: { widthMillimetres: 89, heightMillimetres: 127 },
      }),
    });

    expect(larger).not.toBe(standard);
    expect(textOf(larger)).toBe(textOf(standard));
  });

  it("keeps tags off the face, because they are for finding a card rather than reading it", () => {
    const card: Card = { ...gearShapedCard, tags: ["ninefold"] };

    expect(markupFor({ card })).not.toContain("ninefold");
  });

  it("leaves out the regions a card does not carry", () => {
    const markup = markupFor({ card: minimalCard });

    expect(textOf(markup)).toContain("Quiet Hour");
    expect(markup).not.toContain("<dl");
    expect(markup).not.toContain("<ul");
  });

  /*
   * Nothing is ever cut. A card with more than fits gives up type size, and
   * when even the floor is not enough the answer is a second card rather than
   * fewer words. Either way every word the card carries is in the output.
   */
  it("keeps every word of a long card rather than cutting it", () => {
    const text = textOf(markupFor({ card: longBodyCard }));

    expect(text).toContain("not where you would like it");
    expect(text).toContain(
      "which is not a comfortable thing to carry",
    );
  });

  it("renders sample cards the model accepts", () => {
    // Every export of the fixtures file, rather than a list to keep in step
    // with it. A fixture the stories render but this never sees is worse than
    // no check, because a green suite says the sample cards are legal.
    const cards = Object.values(cardFixtures);

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(CardModel.validate(card)).toEqual([]);
    }
  });
});
