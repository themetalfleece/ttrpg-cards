import { CardModel, type Card } from "@ttrpg-cards/card";

import {
  DIVIDER,
  ESCAPED_PUNCTUATION,
  FALLBACK_SLUG,
  FRONT_MATTER_ENTRY,
  FRONT_MATTER_FENCE,
  FRONT_MATTER_LIMIT,
  HEADING,
  IMPORTED_ID_PREFIX,
  IMPORT_MESSAGES,
  LINE_ENDINGS,
  NON_SLUG,
  SLUG_EDGES,
} from "./markdown.constants";
import { MarkdownSection } from "./MarkdownSection";
import type { ImportIssue, SourceLine } from "./markdown.types";

/** Which capture of a heading holds its text. */
const HEADING_TEXT_GROUP = 2;

/** The cards a document held, and the stretches of it that did not become one. */
interface DocumentReading {
  readonly cards: readonly Card[];
  readonly issues: readonly ImportIssue[];
}

/**
 * A Markdown document read as a set of cards.
 *
 * Every heading starts a card and everything under it belongs to that card,
 * which is the one structural assumption made here. It holds across the
 * documents people actually have, and it is what lets the level of the heading
 * be ignored: a writer who gives each card an `h1` and a writer who nests them
 * under a title mean the same thing.
 *
 * Nothing is fetched, and nothing is sent. The document is read where it was
 * handed over and the cards it holds never leave the browser.
 *
 * A stretch that did not become a card is reported with the line it starts at
 * rather than dropped. A reader who pasted forty cards and got thirty-nine has
 * no other way to find the one that went missing.
 *
 * @example
 * ```ts
 * const document = new MarkdownDocument({
 *   source: "# Lantern Ward\n\n**Range:** Self\n",
 * });
 *
 * document.cards[0]?.id; // "imported:lantern-ward"
 * document.issues; // []
 * ```
 */
export class MarkdownDocument {
  readonly #source: string;

  readonly #reservedIdentifiers: readonly string[];

  #reading: DocumentReading | undefined;

  constructor(options: {
    source: string;
    /**
     * Identifiers already spoken for, so a reader adding a second document
     * to the cards they have keeps both when the two name a card the same
     * thing. A document read on its own reserves nothing.
     */
    reservedIdentifiers?: readonly string[];
  }) {
    this.#source = options.source;
    this.#reservedIdentifiers = options.reservedIdentifiers ?? [];
  }

  /**
   * The cards the document held, in the order they were written.
   *
   * Every one of them has been checked against the card model, because a
   * document a reader pasted in is untrusted input like any other.
   */
  get cards(): readonly Card[] {
    return this.#read.cards;
  }

  /** The stretches that did not become a card, each with its line number. */
  get issues(): readonly ImportIssue[] {
    return this.#read.issues;
  }

  /** The document read once, and kept. */
  get #read(): DocumentReading {
    this.#reading ??= MarkdownDocument.#readingOf(
      this.#source,
      this.#reservedIdentifiers,
    );

    return this.#reading;
  }

  /** The whole document: its sections as cards, and what went wrong. */
  static #readingOf(
    source: string,
    reservedIdentifiers: readonly string[],
  ): DocumentReading {
    const lines = MarkdownDocument.#withoutFrontMatter(
      MarkdownDocument.#linesOf(source),
    );
    const issues: ImportIssue[] = [];
    const stray = MarkdownDocument.#strayLine(lines);

    if (stray !== undefined) {
      issues.push({
        line: stray.number,
        message: IMPORT_MESSAGES.beforeFirstCard,
      });
    }

    const sections = MarkdownDocument.#sectionsOf(lines);
    const cards: Card[] = [];
    const taken = new Set<string>(reservedIdentifiers);

    for (const [index, section] of sections.entries()) {
      const isLast = index === sections.length - 1;
      const card = MarkdownDocument.#cardFrom(
        section,
        taken,
        issues,
        {
          isLast,
        },
      );

      if (card !== undefined) {
        cards.push(card);
      }
    }

    return { cards, issues };
  }

  /**
   * The source as numbered lines, whatever it ended them with.
   *
   * Escapes come off here rather than deeper in, because a document that
   * arrived escaped has them in front of its headings and its rules as well
   * as its emphasis, and everything downstream reads the line.
   */
  static #linesOf(source: string): readonly SourceLine[] {
    return source
      .replace(LINE_ENDINGS, "\n")
      .split("\n")
      .map((line, index) => ({
        number: index + 1,
        text: line.replace(ESCAPED_PUNCTUATION, "$1"),
      }));
  }

  /**
   * The document with a note's front matter taken off the top.
   *
   * The opening rule is the same three characters as a rule between cards, so
   * it is only read as front matter when a closing rule follows it within
   * reach and something between the two is written as a key and a value.
   */
  static #withoutFrontMatter(
    lines: readonly SourceLine[],
  ): readonly SourceLine[] {
    const opening = lines[0];

    if (
      opening === undefined ||
      !FRONT_MATTER_FENCE.test(opening.text)
    ) {
      return lines;
    }

    const searched = lines.slice(1, FRONT_MATTER_LIMIT);
    const closing = searched.findIndex((line) =>
      FRONT_MATTER_FENCE.test(line.text),
    );

    if (closing === -1) {
      return lines;
    }

    const entries = searched.slice(0, closing);

    if (!entries.some((line) => FRONT_MATTER_ENTRY.test(line.text))) {
      return lines;
    }

    return lines.slice(closing + 2);
  }

  /**
   * The first line of text above the first heading, when there is one.
   *
   * Text with no heading over it has no card to go on, and a reader who wrote
   * it meant it to end up somewhere.
   */
  static #strayLine(
    lines: readonly SourceLine[],
  ): SourceLine | undefined {
    for (const line of lines) {
      if (HEADING.test(line.text)) {
        return undefined;
      }

      if (line.text.trim() !== "" && !DIVIDER.test(line.text)) {
        return line;
      }
    }

    return undefined;
  }

  /** The document split at its headings, one section per card. */
  static #sectionsOf(
    lines: readonly SourceLine[],
  ): readonly MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    let heading: SourceLine | undefined;
    let current: SourceLine[] = [];

    for (const line of lines) {
      const match = HEADING.exec(line.text);

      if (match === null) {
        current.push(line);
        continue;
      }

      MarkdownDocument.#pushSection(sections, heading, current);
      heading = {
        number: line.number,
        text: match[HEADING_TEXT_GROUP] ?? "",
      };
      current = [];
    }

    MarkdownDocument.#pushSection(sections, heading, current);

    return sections;
  }

  /** Appends a section, unless no heading has been seen yet. */
  static #pushSection(
    sections: MarkdownSection[],
    heading: SourceLine | undefined,
    lines: readonly SourceLine[],
  ): void {
    if (heading !== undefined) {
      sections.push(new MarkdownSection({ heading, lines }));
    }
  }

  /**
   * One section as a card, reporting whatever stopped it from becoming one.
   *
   * A heading with nothing under it is a grouping heading rather than a card,
   * so it passes quietly while more cards follow. The last one is reported,
   * because there is nothing after it for it to have been grouping.
   */
  static #cardFrom(
    section: MarkdownSection,
    taken: Set<string>,
    issues: ImportIssue[],
    options: { isLast: boolean },
  ): Card | undefined {
    if (section.name === undefined) {
      issues.push({
        line: section.line,
        message: IMPORT_MESSAGES.namelessCard,
      });

      return undefined;
    }

    if (!section.hasContent) {
      if (options.isLast) {
        issues.push({
          line: section.line,
          message: IMPORT_MESSAGES.emptyCard,
        });
      }

      return undefined;
    }

    const id = MarkdownDocument.#identifierFor(
      section.plainName,
      taken,
    );
    const candidate = section.cardFrom({ id });

    if (candidate === undefined || !CardModel.isCard(candidate)) {
      issues.push({
        line: section.line,
        message: IMPORT_MESSAGES.unusableCard,
      });

      return undefined;
    }

    // Through the model rather than straight out of the parser, so every span
    // comes back canonical and two imports of the same document agree.
    return CardModel.from(candidate).card;
  }

  /**
   * An identifier for a card, unique across the document.
   *
   * Built from the name so it stays readable, and counted up when two cards
   * are called the same thing, which a document is entitled to do.
   */
  static #identifierFor(name: string, taken: Set<string>): string {
    const slug = name
      .toLowerCase()
      .replace(NON_SLUG, "-")
      .replace(SLUG_EDGES, "");
    const base = slug === "" ? FALLBACK_SLUG : slug;
    let identifier = `${IMPORTED_ID_PREFIX}${base}`;
    let ordinal = 2;

    while (taken.has(identifier)) {
      identifier = `${IMPORTED_ID_PREFIX}${base}-${ordinal}`;
      ordinal += 1;
    }

    taken.add(identifier);

    return identifier;
  }
}
