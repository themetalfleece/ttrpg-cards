import {
  CARD_BLOCK_KINDS,
  CardModel,
  type Card,
} from "@ttrpg-cards/card";
import { RichText } from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import { MarkdownDocument } from "./MarkdownDocument";
import { ASIDE_HEADINGS } from "./markdown.constants";
import { WARD_CARD, WARD_DIALECTS } from "./markdown.fixtures";

/** The cards a document holds, for a test that expects it to hold some. */
function cardsIn(source: string): readonly Card[] {
  return new MarkdownDocument({ source }).cards;
}

/** The one card a document holds, failing loudly when it holds none. */
function onlyCard(source: string): Card {
  const [card, ...rest] = cardsIn(source);

  if (card === undefined) {
    throw new Error("The document held no cards");
  }

  expect(rest).toHaveLength(0);

  return card;
}

/** The stat block values a card carries, as plain words. */
function valuesOf(card: Card): string[] {
  return card.meta.map((field) => RichText.plain(field.value));
}

describe("MarkdownDocument", () => {
  // The whole point of the parser. A reader's document was written in
  // whatever they already use, and every one of these means the same card.
  describe("the spellings the same card is written in", () => {
    for (const [dialect, source] of Object.entries(WARD_DIALECTS)) {
      it(`reads ${dialect}`, () => {
        expect(onlyCard(source)).toEqual(WARD_CARD);
      });
    }

    it("reads every one of them to the same card", () => {
      const cards = Object.values(WARD_DIALECTS).map(onlyCard);

      for (const card of cards) {
        expect(card).toEqual(cards[0]);
      }
    });
  });

  describe("how many cards a document holds", () => {
    it("reads one card written on its own", () => {
      expect(
        onlyCard("# Hearth Token\n\nIt keeps a fire lit overnight.\n")
          .name,
      ).toEqual(RichText.of("Hearth Token"));
    });

    it("reads many cards in one document", () => {
      const cards = cardsIn(
        [
          "## One",
          "",
          "The first.",
          "",
          "---",
          "",
          "## Two",
          "",
          "The second.",
          "",
          "---",
          "",
          "## Three",
          "",
          "The third.",
          "",
        ].join("\n"),
      );

      expect(cards.map((card) => RichText.plain(card.name))).toEqual([
        "One",
        "Two",
        "Three",
      ]);
    });

    it("reads cards with no rule between them at all", () => {
      const cards = cardsIn(
        "## One\n\nThe first.\n\n## Two\n\nThe second.\n",
      );

      expect(cards).toHaveLength(2);
    });

    // A heading with nothing under it is a title or a group, which is how
    // most documents that hold a set of cards are laid out.
    it("passes over a heading that only groups the ones below it", () => {
      const document = new MarkdownDocument({
        source: "# My Cards\n\n## One\n\nThe first.\n",
      });

      expect(document.cards).toHaveLength(1);
      expect(document.issues).toEqual([]);
    });

    it("gives every card its own identifier, even when two share a name", () => {
      const cards = cardsIn(
        "## Ward\n\nThe first.\n\n## Ward\n\nThe second.\n",
      );

      expect(cards.map((card) => card.id)).toEqual([
        "imported:ward",
        "imported:ward-2",
      ]);
    });

    // A reader adding a second document to the cards they already have keeps
    // both, so the names already spoken for have to be said.
    it("steps around the identifiers it is told are taken", () => {
      const document = new MarkdownDocument({
        source: "## Ward\n\nThe second.\n",
        reservedIdentifiers: ["imported:ward"],
      });

      expect(document.cards.map((card) => card.id)).toEqual([
        "imported:ward-2",
      ]);
    });

    it("reserves nothing when it is told nothing", () => {
      expect(cardsIn("## Ward\n\nThe first.\n")[0]?.id).toBe(
        "imported:ward",
      );
    });
  });

  describe("what a card is built out of", () => {
    it("takes the badge off the end of the heading", () => {
      const card = onlyCard("# Ward [3]\n\nIt holds.\n");

      expect(card.name).toEqual(RichText.of("Ward"));
      expect(card.badge).toEqual(RichText.of("3"));
    });

    it("leaves a heading that is nothing but a badge as the name", () => {
      expect(onlyCard("# [3]\n\nIt holds.\n").badge).toBeUndefined();
    });

    it("reads a quoted block as an aside, under its bold opening", () => {
      const card = onlyCard(
        "# Ward\n\nIt holds.\n\n> **Variant.** It holds twice.\n",
      );

      expect(card.body[1]).toEqual({
        kind: CARD_BLOCK_KINDS.callout,
        label: RichText.of("Variant"),
        text: RichText.of("It holds twice."),
      });
    });

    it("reads a quoted block with no opening as an aside all the same", () => {
      const card = onlyCard(
        "# Ward\n\nIt holds.\n\n> It holds twice.\n",
      );

      expect(card.body[1]).toEqual({
        kind: CARD_BLOCK_KINDS.callout,
        text: RichText.of("It holds twice."),
      });
    });

    // Read off the list itself, so it cannot grow past its own coverage.
    describe("the headings an aside is written under", () => {
      for (const heading of ASIDE_HEADINGS) {
        it(`reads a bold opening of "${heading}" as an aside`, () => {
          const card = onlyCard(
            `# Ward\n\nIt holds.\n\n**${heading}.** It holds twice.\n`,
          );

          expect(card.body[1]).toEqual({
            kind: CARD_BLOCK_KINDS.callout,
            label: RichText.of(heading),
            text: RichText.of("It holds twice."),
          });
        });
      }

      // Documents that lay a card out tightly run the aside straight under
      // the paragraph before it with no blank line between.
      it("reads one written straight under the paragraph above it", () => {
        const card = onlyCard(
          [
            "# Ward",
            "",
            "It holds.",
            "**At Higher Levels.** It holds twice.",
            "",
          ].join("\n"),
        );

        expect(card.body).toHaveLength(2);
        expect(card.body[0]?.kind).toBe(CARD_BLOCK_KINDS.paragraph);
        expect(card.body[1]).toEqual({
          kind: CARD_BLOCK_KINDS.callout,
          label: RichText.of("At Higher Levels"),
          text: RichText.of("It holds twice."),
        });
      });

      it("does not mind how the document capitalises one", () => {
        const card = onlyCard(
          "# Ward\n\nIt holds.\n\n***At Higher Levels:*** It holds twice.\n",
        );

        expect(card.body[1]?.kind).toBe(CARD_BLOCK_KINDS.callout);
      });
    });

    // A bold opening is how a card introduces a sentence. Turning every one
    // of them into an aside would set half a card's prose apart.
    it("leaves a bold opening that is not an aside heading in the prose", () => {
      const card = onlyCard(
        "# Ward\n\n**Guttering.** The light dims but holds.\n",
      );

      expect(card.body[0]?.kind).toBe(CARD_BLOCK_KINDS.paragraph);
    });

    it("keeps a stat block out of the prose, and prose out of the stat block", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "**Range:** Self",
          "**Duration:** 1 minute",
          "",
          "**Failed Save:** the light goes out.",
          "",
        ].join("\n"),
      );

      expect(card.meta).toHaveLength(2);
      expect(card.body).toHaveLength(1);
      expect(card.body[0]?.kind).toBe(CARD_BLOCK_KINDS.paragraph);
    });

    // One line holding a colon is far more often a sentence than a field.
    it("leaves a lone line holding a colon in the prose", () => {
      const card = onlyCard(
        "# Ward\n\nThe light dims: nothing else happens.\n",
      );

      expect(card.meta).toEqual([]);
      expect(card.body).toHaveLength(1);
    });

    // Hard wrapping is normal in the notes this parser is aimed at, so two
    // wrapped lines that each hold a colon must not become a stat block. A
    // label that is not a title and a value that ends a sentence, together,
    // are what say they are prose.
    it("leaves hard-wrapped prose holding colons in the prose", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "The light dims: nothing happens.",
          "The dark rises: something does.",
          "",
        ].join("\n"),
      );

      expect(card.meta).toEqual([]);
      expect(card.body).toHaveLength(1);
      expect(card.body[0]?.kind).toBe(CARD_BLOCK_KINDS.paragraph);
    });

    // The other half of that decision, and the reason it takes both signals:
    // an abbreviated unit ends in a full stop, and a card full of them is one
    // of the commonest shapes a hand-typed stat block takes.
    it("reads unmarked fields whose values are abbreviated units", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "Casting Time: 1 action",
          "Range: 60 ft.",
          "Components: V, S, M",
          "Duration: 1 min.",
          "",
        ].join("\n"),
      );

      expect(
        card.meta.map((field) => RichText.plain(field.value)),
      ).toEqual(["1 action", "60 ft.", "V, S, M", "1 min."]);
      expect(card.body).toEqual([]);
    });

    // A title carries particles, and both signals have to fire to refuse a
    // line, so a label like this one with an abbreviated unit beside it is
    // where the two rules meet.
    it("reads an unmarked label that carries a particle", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "Area of Effect: 30 ft.",
          "Duration: 1 min.",
          "",
        ].join("\n"),
      );

      expect(
        card.meta.map((field) => RichText.plain(field.label)),
      ).toEqual(["Area of Effect", "Duration"]);
      expect(card.body).toEqual([]);
    });

    // Whether a document puts a blank line between its fields says nothing
    // about whether they are fields, so the run is counted across blocks.
    it("reads fields written with a blank line between them", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "**Casting Time:** Action",
          "",
          "**Range:** 60 feet",
          "",
          "It holds.",
          "",
        ].join("\n"),
      );

      expect(
        card.meta.map((field) => RichText.plain(field.label)),
      ).toEqual(["Casting Time", "Range"]);
      expect(card.body).toHaveLength(1);
    });

    // A label written as a sentence rather than a title is ordinary too, so
    // long as its value does not also read like prose.
    it("reads unmarked fields whose labels are not written as titles", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "Casting time: 1 action",
          "Range: Self",
          "",
        ].join("\n"),
      );

      expect(
        card.meta.map((field) => RichText.plain(field.label)),
      ).toEqual(["Casting time", "Range"]);
    });

    it("divides a trailing classification into its entries", () => {
      const card = onlyCard(
        "# Ward\n\nIt holds.\n\n*Abjuration · Warden*\n",
      );

      expect(card.footer).toEqual([
        RichText.of("Abjuration"),
        RichText.of("Warden"),
      ]);
    });

    it("reads an italic line under the title as the subtitle", () => {
      const card = onlyCard("# Ward\n\n*A ward against the dark*\n");

      expect(card.subtitle).toEqual(
        RichText.of("A ward against the dark"),
      );
      expect(card.footer).toBeUndefined();
    });
  });

  // A stat block cell is a quarter of a card wide. A document is written for
  // a page, so what it states has to be set to fit what it is being put on,
  // and a reader's own document gets the same treatment as a bundled one.
  describe("fitting a stat block to the card", () => {
    /** A stat block stating one field beside a plain one, as a document. */
    function statBlock(label: string, value: string): string {
      return [
        "# Ward",
        "",
        "**Range:** Self",
        `**${label}:** ${value}`,
        "",
      ].join("\n");
    }

    it("sets a value too long for its cell shorter", () => {
      const card = onlyCard(statBlock("Duration", "Instantaneous"));

      expect(valuesOf(card)).toEqual(["Self", "Instant"]);
    });

    it("names a held duration once, in place of the up to it implies", () => {
      const card = onlyCard(
        statBlock("Duration", "Concentration, up to 1 minute"),
      );

      expect(valuesOf(card)).toEqual(["Self", "Conc. 1 minute"]);
    });

    // Prose in a cell pushes the strip down the card and takes the room off
    // the body, which is where prose belongs and where a reader looks for it.
    it("puts prose a cell cannot hold at the end of the body", () => {
      const card = onlyCard(
        [
          statBlock(
            "Components",
            "V, S, M (a twig struck by lightning)",
          ),
          "The light holds.",
          "",
        ].join("\n"),
      );

      expect(valuesOf(card)).toEqual(["Self", "V, S, M"]);
      expect(card.body).toHaveLength(2);
      expect(card.body[0]?.kind).toBe(CARD_BLOCK_KINDS.paragraph);
      expect(card.body[1]).toEqual({
        kind: CARD_BLOCK_KINDS.callout,
        label: RichText.of("Material"),
        text: RichText.of("A twig struck by lightning."),
      });
    });

    // Short or long, a material is a thing the caster holds rather than a
    // qualification of the letters, so both read in the same place.
    it("puts a short material at the end of the body as well", () => {
      const card = onlyCard(
        statBlock("Components", "S, M (a silver pin)"),
      );

      expect(valuesOf(card)).toEqual(["Self", "S, M"]);
      expect(card.body).toEqual([
        {
          kind: CARD_BLOCK_KINDS.callout,
          label: RichText.of("Material"),
          text: RichText.of("A silver pin."),
        },
      ]);
    });

    it("leaves a bracket short enough to read as part of the value", () => {
      const card = onlyCard(
        statBlock("Casting Time", "1 action (ritual)"),
      );

      expect(valuesOf(card)).toEqual(["Self", "1 action (ritual)"]);
      expect(card.body).toEqual([]);
    });

    // Rewriting a value means reading it as plain words, and a value a reader
    // marked up is not only words. Theirs is left exactly as they set it.
    it("leaves a value the reader marked up alone", () => {
      const card = onlyCard(statBlock("Duration", "*Instantaneous*"));

      expect(valuesOf(card)).toEqual(["Self", "Instantaneous"]);
      expect(card.body).toEqual([]);
    });
  });

  // A document that captions a table writes the caption as a heading too, and
  // a heading inside a card is part of it rather than the start of another.
  describe("a heading deeper than the cards are written at", () => {
    const withCaption = [
      "#### Ward",
      "",
      "**Range:** Self",
      "**Duration:** 1 minute",
      "",
      "The light holds.",
      "",
      "##### What the lantern shows",
      "| Roll | Effect |",
      "|:----:|--------|",
      "| 1 | The light fails |",
      "| 2 | It holds |",
      "",
    ].join("\n");

    it("keeps it on the card it sits in rather than starting another", () => {
      expect(cardsIn(withCaption)).toHaveLength(1);
    });

    it("sets it as a caption over what it names", () => {
      const card = onlyCard(withCaption);
      const caption = card.body[1];

      if (caption?.kind !== CARD_BLOCK_KINDS.paragraph) {
        throw new Error("The card carried no caption");
      }

      expect(RichText.plain(caption.text)).toBe(
        "What the lantern shows",
      );
      expect(caption.text[0]?.marks).toEqual(["strong"]);
    });

    // The other half of the same rule, and the reason level alone cannot
    // decide it: a document that nests its cards under a title has a
    // shallower heading that is not a card.
    it("still reads cards nested under a title of their own", () => {
      const cards = cardsIn(
        [
          "# My Cards",
          "",
          "## One",
          "",
          "The first.",
          "",
          "## Two",
          "",
          "The second.",
          "",
        ].join("\n"),
      );

      expect(cards.map((card) => RichText.plain(card.name))).toEqual([
        "One",
        "Two",
      ]);
    });

    // And the shape that shows content alone cannot find the level: a title
    // with a line under it carries content like any card does. What tells them
    // apart is repetition, since cards come in runs and a title is one of a
    // kind. Reading the whole document as a single card would be the worst
    // answer available, because every card after the first would be body text
    // on the one before it.
    it("still reads cards nested under a title that says something", () => {
      const cards = cardsIn(
        [
          "# My Cards",
          "",
          "Everything I have written down so far.",
          "",
          "## One",
          "",
          "The first.",
          "",
          "## Two",
          "",
          "The second.",
          "",
        ].join("\n"),
      );

      expect(
        cards.map((card) => RichText.plain(card.name)),
      ).toContain("One");
      expect(
        cards.map((card) => RichText.plain(card.name)),
      ).toContain("Two");
    });
  });

  // A card has no grid, so a table is read as a line naming it and a line per
  // row. How that is arranged is one rule in the card model; all the parser
  // does is recognise the rows.
  describe("a table written in pipes", () => {
    const withTable = [
      "## Ward",
      "",
      "**Range:** Self",
      "**Duration:** 1 minute",
      "",
      "| Roll | Effect |",
      "|:----:|--------|",
      "| 1 | The light fails |",
      "| 2 | It holds |",
      "",
    ].join("\n");

    it("reads the rows rather than printing the pipes", () => {
      const card = onlyCard(withTable);
      const written = card.body.flatMap((block) => {
        if (block.kind === CARD_BLOCK_KINDS.list) {
          return block.items.map((item) => RichText.plain(item));
        }

        return block.kind === CARD_BLOCK_KINDS.paragraph
          ? [RichText.plain(block.text)]
          : [];
      });

      expect(written).toEqual([
        "Roll / Effect",
        "1: The light fails",
        "2: It holds",
      ]);
    });

    it("leaves out the row that only sets the columns", () => {
      expect(
        onlyCard(withTable).body.some((block) =>
          CardModel.blockText(block).includes("---"),
        ),
      ).toBe(false);
    });
  });

  // A card names a rank in the corner of its title bar and what it is along
  // the bottom rule. A document states both on one line under the title.
  describe("an opening line that states a rank", () => {
    it("sets the rank in the badge and the rest along the rule", () => {
      const card = onlyCard("# Ward\n\n*Level 3 Abjuration*\n");

      expect(card.badge).toEqual(RichText.of("3"));
      expect(card.footer).toEqual([RichText.of("Abjuration")]);
      expect(card.subtitle).toBeUndefined();
    });

    it("reads the rank written as an ordinal just the same", () => {
      const card = onlyCard("# Ward\n\n*3rd-level abjuration*\n");

      expect(card.badge).toEqual(RichText.of("3"));
      expect(card.footer).toEqual([RichText.of("abjuration")]);
    });

    it("classifies with the words in front when the rank comes last", () => {
      const card = onlyCard("# Ward\n\n*Tier 2*\n");

      expect(card.badge).toEqual(RichText.of("2"));
      expect(card.footer).toEqual([RichText.of("Tier")]);
    });

    // The heading was written to be a badge, so it wins.
    it("keeps the badge the heading spells out", () => {
      const card = onlyCard("# Ward [C]\n\n*Level 3 Abjuration*\n");

      expect(card.badge).toEqual(RichText.of("C"));
      expect(card.footer).toEqual([RichText.of("Abjuration")]);
    });

    // The line an item card opens with is the same length as a rank line and
    // has its number in the same place. The comma is what tells them apart,
    // and without it the price would be set where the rank goes.
    it("leaves a line that prices something as a subtitle", () => {
      const card = onlyCard("# Ward\n\n*Rare, 500 coins*\n");

      expect(card.subtitle).toEqual(RichText.of("Rare, 500 coins"));
      expect(card.badge).toBeUndefined();
      expect(card.footer).toBeUndefined();
    });

    // A subtitle that says something is not classifying anything, however
    // many numbers happen to be in it.
    it("leaves a subtitle that is a sentence alone", () => {
      const card = onlyCard("# Ward\n\n*Takes 2 hands to wield*\n");

      expect(card.subtitle).toEqual(
        RichText.of("Takes 2 hands to wield"),
      );
      expect(card.badge).toBeUndefined();
      expect(card.footer).toBeUndefined();
    });
  });

  describe("what a card is classified by", () => {
    it("reads a labelled line at the end as a classification", () => {
      const card = onlyCard(
        "# Ward\n\nIt holds.\n\n**Wardens:** Sentinel, Lampwright\n",
      );

      expect(card.footer).toEqual([
        RichText.of("Sentinel, Lampwright"),
      ]);
      expect(card.body).toHaveLength(1);
    });

    it("gathers the rank and the closing line onto the same rule", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "*Level 3 Abjuration*",
          "",
          "It holds.",
          "",
          "**Wardens:** Sentinel, Lampwright",
          "",
        ].join("\n"),
      );

      expect(card.footer).toEqual([
        RichText.of("Abjuration"),
        RichText.of("Sentinel, Lampwright"),
      ]);
    });

    // Dropping the label off each of three closing lines leaves a rule
    // saying nothing about what any of the numbers on it are. A run of them
    // is the stat block, written at the end, and read by the same rule the
    // top of the card is read by.
    it("reads a run of closing labelled lines as the stat block", () => {
      const card = onlyCard(
        [
          "# Blade",
          "",
          "It cuts.",
          "",
          "**Damage:** 2d6",
          "",
          "**Reach:** 5 feet",
          "",
          "**Weight:** 3 stone",
          "",
        ].join("\n"),
      );

      expect(
        card.meta.map(
          (field) =>
            `${RichText.plain(field.label)}=${RichText.plain(field.value)}`,
        ),
      ).toEqual(["Damage=2d6", "Reach=5 feet", "Weight=3 stone"]);
      expect(card.footer).toBeUndefined();
      expect(card.body).toHaveLength(1);
    });

    // The run keeps its labels, and an italic line among them still goes to
    // the rule, because it never had one to lose.
    it("keeps a closing italic line on the rule beside them", () => {
      const card = onlyCard(
        [
          "# Blade",
          "",
          "It cuts.",
          "",
          "**Damage:** 2d6",
          "",
          "**Reach:** 5 feet",
          "",
          "*Warden · Sentinel*",
          "",
        ].join("\n"),
      );

      expect(
        card.meta.map((field) => RichText.plain(field.label)),
      ).toEqual(["Damage", "Reach"]);
      expect(card.footer).toEqual([
        RichText.of("Warden"),
        RichText.of("Sentinel"),
      ]);
    });

    // A classification lists things. A card closing on a bold lead-in is
    // saying something, and saying it in the body.
    it("leaves a closing line that says something in the body", () => {
      const card = onlyCard(
        "# Ward\n\nIt holds.\n\n**Failed Save:** the light goes out.\n",
      );

      expect(card.footer).toBeUndefined();
      expect(card.body).toHaveLength(2);
    });
  });

  describe("what did not read as a card", () => {
    it("reports text written above the first heading, with its line", () => {
      const document = new MarkdownDocument({
        source: "\n\nSome loose notes.\n\n# Ward\n\nIt holds.\n",
      });

      expect(document.cards).toHaveLength(1);
      expect(document.issues).toHaveLength(1);
      expect(document.issues[0]?.line).toBe(3);
    });

    it("reports a document with no headings in it at all", () => {
      const document = new MarkdownDocument({
        source: "Just some prose, and no heading over it.\n",
      });

      expect(document.cards).toEqual([]);
      expect(document.issues[0]?.line).toBe(1);
    });

    it("reports a heading with nothing under it, when nothing follows", () => {
      const document = new MarkdownDocument({
        source: "# Ward\n\nIt holds.\n\n# Notes\n",
      });

      expect(document.cards).toHaveLength(1);
      expect(document.issues[0]?.line).toBe(5);
    });

    it("reports a heading that says nothing", () => {
      const document = new MarkdownDocument({
        source: "#    \n\nIt holds.\n",
      });

      expect(document.cards).toEqual([]);
      expect(document.issues[0]?.line).toBe(1);
    });

    it("reads the cards around a stretch it could not read", () => {
      const document = new MarkdownDocument({
        source:
          "Loose notes.\n\n# One\n\nThe first.\n\n# Two\n\nThe second.\n",
      });

      expect(document.cards).toHaveLength(2);
      expect(document.issues).toHaveLength(1);
    });

    it("holds nothing and says nothing about an empty document", () => {
      const document = new MarkdownDocument({ source: "" });

      expect(document.cards).toEqual([]);
      expect(document.issues).toEqual([]);
    });
  });

  describe("reading the document once", () => {
    it("gives back the same cards every time it is asked", () => {
      const document = new MarkdownDocument({
        source:
          WARD_DIALECTS["a third level heading and a quoted aside"] ??
          "",
      });

      expect(document.cards).toBe(document.cards);
    });

    // Copying a document out of some editors puts a backslash in front of
    // every marker. It is the same document, and it reads as one.
    it("reads a document that arrived with its markers escaped", () => {
      const card = onlyCard(
        [
          "#### Lantern Ward",
          "",
          "\\*Level 3 Abjuration\\*",
          "",
          "\\_\\_\\_",
          "",
          "\\- \\*\\*Casting Time:\\*\\* 1 reaction",
          "\\- \\*\\*Range:\\*\\* Self",
          "",
          "A ward of steady light closes over you.",
          "",
          "\\*\\*Wardens:\\*\\* Sentinel, Lampwright",
          "",
        ].join("\n"),
      );

      expect(card.badge).toEqual(RichText.of("3"));
      expect(
        card.meta.map((field) => RichText.plain(field.label)),
      ).toEqual(["Casting Time", "Range"]);
      expect(card.footer).toEqual([
        RichText.of("Abjuration"),
        RichText.of("Sentinel, Lampwright"),
      ]);
      expect(card.body).toHaveLength(1);
    });

    // A directive and a hard break are a backslash in front of a word
    // character and a line ending, so neither is an escape.
    it("leaves a layout directive and a hard line break alone", () => {
      const card = onlyCard(
        [
          "# Ward",
          "",
          "**Range:** Self\\",
          "**Duration:** 1 minute",
          "\\column",
          "It holds.",
          "",
        ].join("\n"),
      );

      expect(
        card.meta.map((field) => RichText.plain(field.value)),
      ).toEqual(["Self", "1 minute"]);
      expect(card.body).toHaveLength(1);
    });

    it("counts lines the same however the document ends them", () => {
      const windows = new MarkdownDocument({
        source: "\r\n\r\nLoose notes.\r\n",
      });

      expect(windows.issues[0]?.line).toBe(3);
    });
  });
});
