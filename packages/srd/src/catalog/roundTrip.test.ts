import {
  CARD_BLOCK_KINDS,
  type Card,
  type CardBlock,
} from "@ttrpg-cards/card";
import { MarkdownDocument } from "@ttrpg-cards/importer";
import {
  TEXT_MARKS,
  type TextRun,
  type TextRuns,
} from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import { BUNDLED_CATALOGS } from "./bundled";

/** The heading level the cards are written at. Any level reads the same. */
const HEADING_LEVEL = "###";

/** What the entries of a classification line are joined with. */
const FOOTER_JOIN = " · ";

/** One run as the markup that produces it. */
function markupFromRun(run: TextRun): string {
  const marks = run.marks ?? [];
  const strong = marks.includes(TEXT_MARKS.strong);
  const emphasis = marks.includes(TEXT_MARKS.emphasis);

  if (strong && emphasis) {
    return `***${run.text}***`;
  }

  if (strong) {
    return `**${run.text}**`;
  }

  if (emphasis) {
    return `*${run.text}*`;
  }

  return run.text;
}

/** A span as the markup that produces it. */
function markupFrom(text: TextRuns): string {
  return text.map(markupFromRun).join("");
}

/** One body block as the lines it is written on. */
function blockMarkdown(block: CardBlock): string {
  if (block.kind === CARD_BLOCK_KINDS.list) {
    return block.items
      .map((item) => `- ${markupFrom(item)}`)
      .join("\n");
  }

  if (block.kind === CARD_BLOCK_KINDS.callout) {
    const text = markupFrom(block.text);

    if (block.label === undefined) {
      return `> ${text}`;
    }

    return `> **${markupFrom(block.label)}.** ${text}`;
  }

  return markupFrom(block.text);
}

/**
 * A card written out as Markdown: a heading, a bold-labelled stat block, the
 * body, and the classification line along the bottom. An aside is quoted,
 * which is the spelling that stands on its own without a known heading.
 */
function markdownFrom(card: Card): string {
  const badge =
    card.badge === undefined ? "" : ` [${markupFrom(card.badge)}]`;
  const parts: string[] = [
    `${HEADING_LEVEL} ${markupFrom(card.name)}${badge}`,
  ];

  if (card.subtitle !== undefined) {
    parts.push(`*${markupFrom(card.subtitle)}*`);
  }

  if (card.meta.length > 0) {
    parts.push(
      card.meta
        .map(
          (field) =>
            `**${markupFrom(field.label)}:** ${markupFrom(field.value)}`,
        )
        .join("\n"),
    );
  }

  for (const block of card.body) {
    parts.push(blockMarkdown(block));
  }

  if (card.footer !== undefined) {
    parts.push(`*${card.footer.map(markupFrom).join(FOOTER_JOIN)}*`);
  }

  return `${parts.join("\n\n")}\n`;
}

/**
 * The parts of a card a document carries.
 *
 * An identifier is the importer's to hand out, and tags and provenance are
 * ours rather than the document's, so none of the three survives the trip and
 * none of them is compared.
 */
function written(card: Card): Partial<Card> {
  const shown: Partial<Card> = {
    name: card.name,
    meta: card.meta,
    body: card.body,
  };

  if (card.badge !== undefined) {
    shown.badge = card.badge;
  }

  if (card.subtitle !== undefined) {
    shown.subtitle = card.subtitle;
  }

  if (card.footer !== undefined) {
    shown.footer = card.footer;
  }

  return shown;
}

/**
 * The catalog written out as Markdown and read back in.
 *
 * This is the test that keeps the parser honest about real content rather than
 * about fixtures written to suit it. Every card the app ships goes through it,
 * which is a few hundred entries of prose, lists, asides and tables read back
 * out of a format that was never designed to hold them.
 */
describe("the bundled catalog as a Markdown document", () => {
  for (const catalog of BUNDLED_CATALOGS) {
    describe(catalog.id, () => {
      const source = catalog.cards.map(markdownFrom).join("\n");
      const document = new MarkdownDocument({ source });

      it("reads back with nothing left unparsed", () => {
        expect(document.issues).toEqual([]);
        expect(document.cards).toHaveLength(catalog.cards.length);
      });

      it("reads every card back as the card it was", () => {
        expect(document.cards.map(written)).toEqual(
          catalog.cards.map(written),
        );
      });

      it("names every card it read something a reader can tell apart", () => {
        const identifiers = new Set(
          document.cards.map((card) => card.id),
        );

        expect(identifiers.size).toBe(document.cards.length);
      });
    });
  }
});
