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

/** Which capture of a heading holds its hashes, and which holds its text. */
const HEADING_LEVEL_GROUP = 1;
const HEADING_TEXT_GROUP = 2;

/** The cards a document held, and the stretches of it that did not become one. */
interface DocumentReading {
  readonly cards: readonly Card[];
  readonly issues: readonly ImportIssue[];
}

/**
 * A heading, as everything that has to reason about the shape of a document
 * reads one.
 *
 * Read once for the whole document rather than by each question that has one
 * to ask, so what counts as a heading and how deep it is are decided in a
 * single place.
 */
interface DocumentHeading {
  /** The line it was written on, and what it says without its hashes. */
  readonly line: SourceLine;
  /** How deep it is, counted in hashes. */
  readonly level: number;
  /** Whether anything is written under it before the next heading. */
  carries: boolean;
}

/**
 * A Markdown document read as a set of cards.
 *
 * A heading starts a card and everything under it belongs to that card, which
 * is the one structural assumption made here. It holds across the documents
 * people actually have, and which level the writer reached for does not matter:
 * the level the cards are written at is found rather than assumed, so a writer
 * who gives each card an `h1` and a writer who nests them under a title mean
 * the same thing, and a heading deeper than that level stays inside its card.
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

  /**
   * The document split at its headings, one section per card.
   *
   * Only the headings a card is written at do the splitting. A document that
   * captions a table inside a card writes that caption as a heading too, and
   * a deeper one is part of the card it sits in rather than the start of
   * another. Anything deeper than the card level stays with its lines and the
   * section reads it as a caption.
   */
  static #sectionsOf(
    lines: readonly SourceLine[],
  ): readonly MarkdownSection[] {
    const headings = MarkdownDocument.#headingsOf(lines);
    const cardLevel = MarkdownDocument.#cardLevelOf(headings);
    const starts = new Map(
      headings
        .filter((candidate) => candidate.level <= cardLevel)
        .map((candidate) => [candidate.line.number, candidate.line]),
    );
    const sections: MarkdownSection[] = [];
    let heading: SourceLine | undefined;
    let current: SourceLine[] = [];

    for (const line of lines) {
      const starting = starts.get(line.number);

      if (starting === undefined) {
        current.push(line);
        continue;
      }

      MarkdownDocument.#pushSection(sections, heading, current);
      heading = starting;
      current = [];
    }

    MarkdownDocument.#pushSection(sections, heading, current);

    return sections;
  }

  /**
   * Every heading in the document, in the order they were written, each
   * carrying whether anything was written under it before the next one.
   *
   * One pass, because three questions are asked of the same headings: which
   * level the cards are written at, which headings start one, and what each
   * one says.
   */
  static #headingsOf(
    lines: readonly SourceLine[],
  ): readonly DocumentHeading[] {
    const headings: DocumentHeading[] = [];

    for (const line of lines) {
      const match = HEADING.exec(line.text);

      if (match !== null) {
        headings.push({
          line: {
            number: line.number,
            text: match[HEADING_TEXT_GROUP] ?? "",
          },
          level: (match[HEADING_LEVEL_GROUP] ?? "").length,
          carries: false,
        });
        continue;
      }

      const open = headings.at(-1);

      if (open !== undefined && line.text.trim() !== "") {
        open.carries = true;
      }
    }

    return headings;
  }

  /**
   * How deep the headings are that start a card.
   *
   * The shallowest level where more than one heading carries content. Which
   * level a writer reaches for says nothing on its own: one document gives
   * each card an `h1` and the next nests them three deep under a title. What
   * does say something is repetition, because cards come in runs and a heading
   * that groups them is one of a kind. A title with a line of prose under it
   * carries content like any other heading, so content alone cannot tell the
   * two apart.
   *
   * Falls back to the shallowest level that carries anything, which is what a
   * document holding a single card wants: its one heading is not repeated
   * either, and a caption deeper inside it must not become the card level. Then
   * to the shallowest heading there is, for a document whose cards are all
   * empty. Nothing becomes a card in that case either way, and this keeps the
   * reporting pointed at the headings rather than at one of them.
   */
  static #cardLevelOf(headings: readonly DocumentHeading[]): number {
    // Counted once per heading rather than once per line, so a long card does
    // not outvote the level its neighbours are written at.
    const carrying = new Map<number, number>();

    for (const heading of headings) {
      if (heading.carries) {
        carrying.set(
          heading.level,
          (carrying.get(heading.level) ?? 0) + 1,
        );
      }
    }

    const levels = [...carrying.keys()].sort(
      (one, other) => one - other,
    );
    const repeated = levels.find(
      (level) => (carrying.get(level) ?? 0) > 1,
    );
    const shallowest = headings.reduce(
      (deepest, heading) => Math.min(deepest, heading.level),
      Number.POSITIVE_INFINITY,
    );

    return repeated ?? levels[0] ?? shallowest;
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
