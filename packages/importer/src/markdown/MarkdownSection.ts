import {
  CARD_BLOCK_KINDS,
  type Card,
  type CardBlock,
  type CardCalloutBlock,
  type CardMetaField,
} from "@ttrpg-cards/card";
import {
  RichText,
  TEXT_MARKS,
  type TextRuns,
} from "@ttrpg-cards/text";

import { plainFromMarkup, runsFromMarkup } from "../markup";

import {
  ASIDE_HEADINGS,
  BARE_LABEL,
  BULLET,
  DIVIDER,
  FOOTER_SEPARATOR,
  HEADING_BADGE,
  LAYOUT_DIRECTIVE,
  LEADING_COLON,
  LEAD_IN_PUNCTUATION,
  LINE_BREAK,
  LIST_BREAK,
  MARKED_LABEL,
  QUOTE,
  RANK_LINE_MAX_WORDS,
  RANK_NUMBER,
  RANK_NUMBER_WITHIN,
  SENTENCE_END,
  SENTENCE_PUNCTUATION,
  TITLE_CASE_LABEL,
  TRAILING_COLON,
  WORD_GAP,
} from "./markdown.constants";
import type {
  MarkdownBlock,
  MarkdownBlockKind,
  SourceLine,
} from "./markdown.types";

/** How many markers wrap a span read as a lead-in rather than as stress. */
const LEAD_IN_MARKER_LENGTH = 2;

/**
 * How many lines have to agree before a block is read as a stat block. One
 * line holding a colon is as likely to be a sentence with a bold opening;
 * two in a row is a stat block.
 */
const FIELD_BLOCK_QUORUM = 2;

/** A heading split into the name and the badge it may end with. */
interface HeadingParts {
  readonly name: string;
  readonly badge: string | undefined;
}

/** A bold opening to a block, and whatever it introduces. */
interface LeadIn {
  readonly label: string;
  readonly rest: string;
}

/** An opening line that states a rank, split into what it says. */
interface RankLine {
  /** The number it names, which becomes the glyph in the title bar. */
  readonly badge: string;
  /** What it classifies the card as, which joins the bottom rule. */
  readonly category: string | undefined;
}

/**
 * A block closing a card, read both ways at once.
 *
 * Whether it is a classification or a field is not a property of the block:
 * it depends on how many of them the card closes with, which is only known
 * once the run has been walked.
 */
interface TrailingEntry {
  /** What it puts on the bottom rule, read as a classification. */
  readonly classification: string;
  /** What it holds, read as fields. Absent for a line set in italics. */
  readonly fields: readonly CardMetaField[] | undefined;
}

/** Everything a section says, once its lines have been read. */
interface SectionParts {
  readonly subtitle: TextRuns | undefined;
  /** The badge its opening line implies, when the heading named none. */
  readonly badge: string | undefined;
  readonly meta: readonly CardMetaField[];
  readonly body: readonly CardBlock[];
  readonly footer: readonly TextRuns[] | undefined;
}

/**
 * One heading in a document and the lines under it, read as a card.
 *
 * The whole point of this class is to be forgiving. A document is written by a
 * person in whatever editor they already use, and the same card comes out of
 * four of them spelled four ways: a different heading level, bullets in front
 * of the stat block or none, a rule between cards or nothing, an aside quoted
 * or introduced in bold. They all mean the same thing, so they are all read
 * the same way.
 *
 * A section decides nothing about identity. The document names the card,
 * because uniqueness is a property of the set rather than of one heading.
 *
 * @example
 * ```ts
 * const section = new MarkdownSection({
 *   heading: { number: 1, text: "Lantern Ward [3]" },
 *   lines: [{ number: 2, text: "**Range:** Self" }],
 * });
 *
 * section.cardFrom({ id: "imported:lantern-ward" })?.badge; // [{ text: "3" }]
 * ```
 */
export class MarkdownSection {
  readonly #heading: SourceLine;

  readonly #lines: readonly SourceLine[];

  #headingParts: HeadingParts | undefined;

  #parts: SectionParts | undefined;

  constructor(options: {
    heading: SourceLine;
    lines: readonly SourceLine[];
  }) {
    this.#heading = options.heading;
    this.#lines = options.lines;
  }

  /** The line the heading was read from, for reporting what went wrong. */
  get line(): number {
    return this.#heading.number;
  }

  /** The card's title, or undefined when the heading said nothing. */
  get name(): TextRuns | undefined {
    return MarkdownSection.#runsFrom(this.#nameAndBadge.name);
  }

  /** The title with its markup resolved away, for building an identifier. */
  get plainName(): string {
    return plainFromMarkup(this.#nameAndBadge.name).trim();
  }

  /** True when the heading has something under it to put on a card. */
  get hasContent(): boolean {
    const parts = this.#sectionParts;

    return (
      parts.subtitle !== undefined ||
      parts.meta.length > 0 ||
      parts.body.length > 0 ||
      parts.footer !== undefined
    );
  }

  /**
   * The section as a card under `id`, or undefined when it has no name.
   *
   * What comes back is a candidate rather than a card: it is built out of text
   * a reader supplied, so the caller checks it against the model before
   * anything downstream sees it.
   */
  cardFrom(options: { id: string }): Card | undefined {
    const heading = this.#nameAndBadge;
    const name = MarkdownSection.#runsFrom(heading.name);

    if (name === undefined) {
      return undefined;
    }

    const parts = this.#sectionParts;
    const card: Card = {
      id: options.id,
      name,
      meta: [...parts.meta],
      body: [...parts.body],
    };
    const badge = MarkdownSection.#badgeFrom(heading, parts);

    if (badge !== undefined) {
      card.badge = badge;
    }

    if (parts.subtitle !== undefined) {
      card.subtitle = parts.subtitle;
    }

    if (parts.footer !== undefined) {
      card.footer = [...parts.footer];
    }

    return card;
  }

  /**
   * The glyph in the corner of the title bar.
   *
   * What the heading spells out wins, because it was written to be a badge.
   * A rank read off the opening line is the fallback, for the documents that
   * state one there instead.
   */
  static #badgeFrom(
    heading: HeadingParts,
    parts: SectionParts,
  ): TextRuns | undefined {
    const written = MarkdownSection.#runsFrom(heading.badge ?? "");

    if (written !== undefined) {
      return written;
    }

    return MarkdownSection.#runsFrom(parts.badge ?? "");
  }

  /** The heading read once into its name and its badge, and kept. */
  get #nameAndBadge(): HeadingParts {
    this.#headingParts ??= MarkdownSection.#splitHeading(
      this.#heading.text,
    );

    return this.#headingParts;
  }

  /** The lines under the heading read once into card parts, and kept. */
  get #sectionParts(): SectionParts {
    this.#parts ??= MarkdownSection.#partsFrom(this.#lines);

    return this.#parts;
  }

  /**
   * A heading split around the badge it may end with.
   *
   * A heading that is nothing but a badge keeps it as the name, since a card
   * with a glyph and no title is the less useful of the two readings.
   */
  static #splitHeading(text: string): HeadingParts {
    const match = HEADING_BADGE.exec(text.trim());

    if (match === null) {
      return { name: text.trim(), badge: undefined };
    }

    const name = (match[1] ?? "").trim();

    if (name === "") {
      return { name: text.trim(), badge: undefined };
    }

    return { name, badge: (match[2] ?? "").trim() };
  }

  /** Text as runs, or undefined when the markup leaves nothing to show. */
  static #runsFrom(text: string): TextRuns | undefined {
    const trimmed = text.trim();

    if (plainFromMarkup(trimmed).trim() === "") {
      return undefined;
    }

    return runsFromMarkup(trimmed);
  }

  /** Everything the lines under a heading turn out to say. */
  static #partsFrom(lines: readonly SourceLine[]): SectionParts {
    const blocks = MarkdownSection.#blocksFrom(lines);
    let first = 0;
    let last = blocks.length - 1;

    // The short line under the title, when the document writes one. It is in
    // italics because that is how it is set apart on the page, so the mark is
    // syntax rather than stress and does not survive onto the card.
    const opening = MarkdownSection.#italicLine(blocks[first]);
    const rank =
      opening === undefined
        ? undefined
        : MarkdownSection.#rankFrom(opening);
    let subtitle: TextRuns | undefined;

    if (opening !== undefined) {
      first += 1;
    }

    // A line that only states a rank and a category is those two things
    // rather than a subtitle, so it is set where a card puts them.
    if (opening !== undefined && rank === undefined) {
      subtitle = RichText.of(opening);
    }

    // The stat block comes off the top before anything comes off the end, so
    // the two can never reach for the same block.
    const statBlock = MarkdownSection.#statBlockFrom(blocks, {
      from: first,
      to: last,
    });

    first = statBlock.next;

    // What the card closes with, which is never body.
    const tail = MarkdownSection.#tailFrom(blocks, {
      from: first,
      to: last,
    });

    last = tail.last;

    const classifications: string[] = [];

    if (rank?.category !== undefined) {
      classifications.push(rank.category);
    }

    classifications.push(...tail.classifications);

    const body: CardBlock[] = [];

    for (const block of blocks.slice(first, last + 1)) {
      MarkdownSection.#readBody(block, body);
    }

    return {
      subtitle,
      badge: rank?.badge,
      meta: [...statBlock.fields, ...tail.fields],
      body,
      footer: MarkdownSection.#footerFrom(classifications),
    };
  }

  /**
   * What a card closes with that is not body, and where that starts.
   *
   * Two shapes end a card. A line set in italics classifies it, and so does a
   * single labelled line: `**Wardens:** Sentinel, Lampwright` puts its value
   * on the bottom rule and drops its label, because the rule is a row of
   * short entries rather than a second stat block.
   *
   * A run of labelled lines is something else. Dropping the label off each of
   * three of them leaves a rule reading `2d6 · 5 feet · 3 stone` and nothing
   * saying what any of it is, so a run that reaches the quorum is read as a
   * stat block the document wrote at the end. That is the same rule the top
   * of the card is read by, and it has to be, because those same lines above
   * the body are already a stat block with their labels intact.
   */
  static #tailFrom(
    blocks: readonly MarkdownBlock[],
    range: { from: number; to: number },
  ): {
    classifications: readonly string[];
    fields: readonly CardMetaField[];
    last: number;
  } {
    const entries: TrailingEntry[] = [];
    let index = range.to;

    while (index >= range.from) {
      const entry = MarkdownSection.#trailingEntryFrom(blocks[index]);

      if (entry === undefined) {
        break;
      }

      entries.unshift(entry);
      index -= 1;
    }

    const labelled = entries.filter(
      (entry) => entry.fields !== undefined,
    );

    if (labelled.length < FIELD_BLOCK_QUORUM) {
      return {
        classifications: entries.map((entry) => entry.classification),
        fields: [],
        last: index,
      };
    }

    const fields: CardMetaField[] = [];
    const classifications: string[] = [];

    for (const entry of entries) {
      if (entry.fields === undefined) {
        classifications.push(entry.classification);
        continue;
      }

      fields.push(...entry.fields);
    }

    return { classifications, fields, last: index };
  }

  /** One closing block read both ways, or undefined when it is body. */
  static #trailingEntryFrom(
    block: MarkdownBlock | undefined,
  ): TrailingEntry | undefined {
    if (block === undefined) {
      return undefined;
    }

    const italic = MarkdownSection.#italicLine(block);

    if (italic !== undefined) {
      return { classification: italic, fields: undefined };
    }

    const classification =
      MarkdownSection.#labelledClassification(block);
    const fields = MarkdownSection.#fieldsFrom(block);

    if (classification === undefined || fields === undefined) {
      return undefined;
    }

    return { classification, fields };
  }

  /**
   * The stat block at the top of a card, and where it ends.
   *
   * A run of blocks rather than one, because whether a document puts a blank
   * line between its fields says nothing about whether they are fields. The
   * run ends at the first block that reads as something else, which is what
   * keeps a colon in the prose below from being read as a label.
   *
   * One field on its own is as likely to be a sentence with a bold opening,
   * so a run of one is handed back as prose. Two in a row is a stat block.
   */
  static #statBlockFrom(
    blocks: readonly MarkdownBlock[],
    range: { from: number; to: number },
  ): { fields: readonly CardMetaField[]; next: number } {
    const fields: CardMetaField[] = [];
    let index = range.from;

    while (index <= range.to) {
      const block = blocks[index];
      const blockFields =
        block === undefined
          ? undefined
          : MarkdownSection.#fieldsFrom(block);

      if (blockFields === undefined) {
        break;
      }

      fields.push(...blockFields);
      index += 1;
    }

    if (fields.length < FIELD_BLOCK_QUORUM) {
      return { fields: [], next: range.from };
    }

    return { fields, next: index };
  }

  /** One block added to the body, in whichever shape it was written in. */
  static #readBody(block: MarkdownBlock, body: CardBlock[]): void {
    if (block.kind === "quote") {
      const aside = MarkdownSection.#asideFromQuote(block);

      if (aside !== undefined) {
        body.push(aside);
      }

      return;
    }

    if (block.kind === "bullets") {
      const list = MarkdownSection.#listFrom(block);

      if (list !== undefined) {
        body.push(list);
      }

      return;
    }

    const text = MarkdownSection.#joined(block.lines);
    const aside = MarkdownSection.#asideFromHeading(text);

    if (aside !== undefined) {
      body.push(aside);
      return;
    }

    const runs = MarkdownSection.#runsFrom(text);

    if (runs !== undefined) {
      body.push({ kind: CARD_BLOCK_KINDS.paragraph, text: runs });
    }
  }

  /**
   * The lines under a heading grouped into blocks.
   *
   * A blank line, a rule and a layout directive all do the same job here: they
   * end whatever was being written and start the next thing. Bullets, quotes
   * and prose are told apart so the classification afterwards has one shape to
   * look at rather than a line at a time.
   */
  static #blocksFrom(
    lines: readonly SourceLine[],
  ): readonly MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    let current: SourceLine[] = [];
    let kind: MarkdownBlockKind = "paragraph";

    for (const line of lines) {
      if (MarkdownSection.#isSeparator(line.text)) {
        MarkdownSection.#pushBlock(blocks, kind, current);
        current = [];
        continue;
      }

      const lineKind = MarkdownSection.#kindOf(line.text);
      // An aside written straight under the paragraph before it, with no
      // blank line between, is still an aside. Documents that lay a card out
      // tightly run the two together.
      const opensAside =
        MarkdownSection.#asideLeadIn(
          MarkdownSection.#lineText(line.text),
        ) !== undefined;

      if (current.length > 0 && (lineKind !== kind || opensAside)) {
        MarkdownSection.#pushBlock(blocks, kind, current);
        current = [];
      }

      kind = lineKind;
      current.push(line);
    }

    MarkdownSection.#pushBlock(blocks, kind, current);

    return blocks;
  }

  /** True for a line that ends a block and carries nothing of its own. */
  static #isSeparator(text: string): boolean {
    return (
      text.trim() === "" ||
      DIVIDER.test(text) ||
      LAYOUT_DIRECTIVE.test(text)
    );
  }

  /** Which of the three shapes a line is written in. */
  static #kindOf(text: string): MarkdownBlockKind {
    if (QUOTE.test(text)) {
      return "quote";
    }

    if (BULLET.test(text)) {
      return "bullets";
    }

    return "paragraph";
  }

  /** Appends a block, unless the run of lines turned out to be empty. */
  static #pushBlock(
    blocks: MarkdownBlock[],
    kind: MarkdownBlockKind,
    lines: readonly SourceLine[],
  ): void {
    if (lines.length > 0) {
      blocks.push({ kind, lines });
    }
  }

  /** One line with its hard break and surrounding space taken off. */
  static #lineText(text: string): string {
    return text.replace(LINE_BREAK, "").trim();
  }

  /** A run of lines as one stretch of text, with the line breaks taken out. */
  static #joined(lines: readonly SourceLine[]): string {
    return lines
      .map((line) => MarkdownSection.#lineText(line.text))
      .join(" ")
      .trim();
  }

  /**
   * The text of a block that is a single line set entirely in italics, which
   * is how both the subtitle and the trailing classification are written.
   */
  static #italicLine(
    block: MarkdownBlock | undefined,
  ): string | undefined {
    if (block?.kind !== "paragraph" || block.lines.length !== 1) {
      return undefined;
    }

    const runs = MarkdownSection.#runsFrom(
      MarkdownSection.#joined(block.lines),
    );
    const [run, ...rest] = runs ?? [];

    if (run === undefined || rest.length > 0) {
      return undefined;
    }

    const marks = run.marks ?? [];

    if (marks.length !== 1 || marks[0] !== TEXT_MARKS.emphasis) {
      return undefined;
    }

    return run.text;
  }

  /** The classifications a card carries, as the entries along its rule. */
  static #footerFrom(
    classifications: readonly string[],
  ): readonly TextRuns[] | undefined {
    const entries: TextRuns[] = [];

    for (const classification of classifications) {
      for (const part of classification.split(FOOTER_SEPARATOR)) {
        const runs = MarkdownSection.#runsFrom(part);

        if (runs !== undefined) {
          entries.push(runs);
        }
      }
    }

    return entries.length > 0 ? entries : undefined;
  }

  /**
   * A single labelled line whose value lists rather than says.
   *
   * The punctuation check is what keeps a card that closes on a bold lead-in
   * out of the bottom rule: a classification has no sentence in it.
   */
  static #labelledClassification(
    block: MarkdownBlock,
  ): string | undefined {
    const [line, ...rest] = block.lines;

    if (
      block.kind === "quote" ||
      line === undefined ||
      rest.length > 0
    ) {
      return undefined;
    }

    const field = MarkdownSection.#markedField(
      MarkdownSection.#lineText(line.text.replace(BULLET, "")),
    );

    if (field === undefined) {
      return undefined;
    }

    const value = RichText.plain(field.value);

    return SENTENCE_PUNCTUATION.test(value) ? undefined : value;
  }

  /**
   * An opening line that states a rank and what the card is, split in two.
   *
   * `Level 3 Abjuration` and `3rd-level abjuration` are the same line written
   * two ways, and both say the card is a third-rank one of something. The
   * number becomes the glyph in the title bar and the rest joins the bottom
   * rule, which is where a card puts those two things.
   *
   * Three things have to hold, and each keeps out a line that is doing
   * something else. The line is short, so a sentence about the card stays a
   * sentence: `Takes 2 hands to wield` says something rather than classifying
   * anything. The number is near the front, so it is the rank rather than a
   * measurement somewhere in the middle. And the word before it does not
   * close a list item, which is what tells `Level 3 Abjuration` from
   * `Rare, 500 coins`: the same length, the number in the same place, and a
   * price where the rank would go.
   */
  static #rankFrom(text: string): RankLine | undefined {
    const words = text
      .split(WORD_GAP)
      .filter((word) => word.length > 0);
    const index = words.findIndex((word) => RANK_NUMBER.test(word));

    if (
      words.length > RANK_LINE_MAX_WORDS ||
      index === -1 ||
      index >= RANK_NUMBER_WITHIN
    ) {
      return undefined;
    }

    const before = words[index - 1];

    if (before !== undefined && LIST_BREAK.test(before)) {
      return undefined;
    }

    const badge = RANK_NUMBER.exec(words[index] ?? "")?.[0];

    if (badge === undefined) {
      return undefined;
    }

    // What follows the rank is what the card is. A line that puts the rank
    // last classifies with the words in front of it instead.
    const after = words.slice(index + 1).join(" ");
    const category =
      after.length > 0 ? after : words.slice(0, index).join(" ");

    return {
      badge,
      category: category.length > 0 ? category : undefined,
    };
  }

  /**
   * A block's lines as stat block fields, or undefined when any of them is
   * something else.
   *
   * All or nothing on purpose: a run of lines where only some read as fields
   * is prose that happens to contain a colon, not a half-written stat block.
   */
  static #fieldsFrom(
    block: MarkdownBlock,
  ): readonly CardMetaField[] | undefined {
    if (block.kind === "quote") {
      return undefined;
    }

    const fields: CardMetaField[] = [];

    for (const line of block.lines) {
      const text = MarkdownSection.#lineText(
        line.text.replace(BULLET, ""),
      );
      const field =
        MarkdownSection.#markedField(text) ??
        MarkdownSection.#bareField(text);

      if (field === undefined) {
        return undefined;
      }

      fields.push(field);
    }

    const [only] = fields;

    // A block holding a single field has nothing beside it to confirm it, so
    // it has to read like a stat block line rather than like a sentence with
    // a bold opening. `**Failed Save:** the light goes out.` is the latter.
    if (
      fields.length === 1 &&
      only !== undefined &&
      SENTENCE_PUNCTUATION.test(RichText.plain(only.value))
    ) {
      return undefined;
    }

    return fields.length > 0 ? fields : undefined;
  }

  /**
   * A field whose label is wrapped in markers, which is the common spelling.
   *
   * The colon is what makes it a field, and it is accepted on either side of
   * the closing marker because both halves of the world write it there. A
   * bold opening with no colon is a sentence with a lead-in, not a field.
   */
  static #markedField(text: string): CardMetaField | undefined {
    const groups = MARKED_LABEL.exec(text)?.groups;

    if (groups === undefined) {
      return undefined;
    }

    const written = groups["label"] ?? "";
    const rest = groups["rest"] ?? "";
    const label = written.replace(TRAILING_COLON, "");
    const value = rest.replace(LEADING_COLON, "");

    if (label === written && value === rest) {
      return undefined;
    }

    return MarkdownSection.#field(label, value);
  }

  /**
   * A field written with no markers at all, as a hand-typed card often is.
   *
   * With no markers to go on the words are all there is, and hard wrapping is
   * normal in the notes this parser is aimed at. A label ending in sentence
   * punctuation is never a label, so that is refused outright. Past it, a line
   * is refused only when {@link TITLE_CASE_LABEL} and {@link SENTENCE_END}
   * agree: a label that is not a title (`Casting time: 1 action`) and a value
   * ending in a full stop (`Range: 60 ft.`) are each ordinary alone, and read
   * as prose only together (`The light dims: nothing happens.`).
   *
   * The cost is a one word capitalised lead-in to a wrapped sentence, `Note:
   * the light dims.`, which reads as a field. It takes two such lines running
   * ahead of any prose to be read that way at all, and a card that sets them
   * in its stat block is not much wrong about them.
   */
  static #bareField(text: string): CardMetaField | undefined {
    const groups = BARE_LABEL.exec(text)?.groups;

    if (groups === undefined) {
      return undefined;
    }

    const label = (groups["label"] ?? "").trim();
    const value = (groups["value"] ?? "").trim();

    if (label === "" || SENTENCE_END.test(label)) {
      return undefined;
    }

    if (!TITLE_CASE_LABEL.test(label) && SENTENCE_END.test(value)) {
      return undefined;
    }

    return MarkdownSection.#field(label, value);
  }

  /** One stat block entry, or undefined when either half says nothing. */
  static #field(
    label: string,
    value: string,
  ): CardMetaField | undefined {
    const labelRuns = MarkdownSection.#runsFrom(label);
    const valueRuns = MarkdownSection.#runsFrom(value);

    if (labelRuns === undefined || valueRuns === undefined) {
      return undefined;
    }

    return { label: labelRuns, value: valueRuns };
  }

  /** A bulleted block as a list, or undefined when no bullet said anything. */
  static #listFrom(block: MarkdownBlock): CardBlock | undefined {
    const items: TextRuns[] = [];

    for (const line of block.lines) {
      const runs = MarkdownSection.#runsFrom(
        MarkdownSection.#lineText(line.text.replace(BULLET, "")),
      );

      if (runs !== undefined) {
        items.push(runs);
      }
    }

    if (items.length === 0) {
      return undefined;
    }

    return { kind: CARD_BLOCK_KINDS.list, items };
  }

  /**
   * A quoted block as an aside.
   *
   * Quoting is the general way to set one apart, and it needs no list of
   * headings to recognise: whatever a writer quotes, they meant to stand out
   * from the prose around it.
   */
  static #asideFromQuote(
    block: MarkdownBlock,
  ): CardCalloutBlock | undefined {
    const text = MarkdownSection.#joined(
      block.lines.map((line) => ({
        number: line.number,
        text: line.text.replace(QUOTE, ""),
      })),
    );
    const leadIn = MarkdownSection.#leadInFrom(text);

    if (leadIn === undefined) {
      const runs = MarkdownSection.#runsFrom(text);

      if (runs === undefined) {
        return undefined;
      }

      return { kind: CARD_BLOCK_KINDS.callout, text: runs };
    }

    return MarkdownSection.#aside(leadIn);
  }

  /**
   * A paragraph opening with one of the headings an aside is commonly written
   * under, which is how most documents mark one rather than quoting it.
   *
   * Only those headings, because any other bold opening is a lead-in to a
   * sentence and turning every one of them into an aside would set half a
   * card's prose apart from the other half.
   */
  static #asideFromHeading(
    text: string,
  ): CardCalloutBlock | undefined {
    const leadIn = MarkdownSection.#asideLeadIn(text);

    if (leadIn === undefined) {
      return undefined;
    }

    return MarkdownSection.#aside(leadIn);
  }

  /** A bold opening that names an aside rather than introducing a sentence. */
  static #asideLeadIn(text: string): LeadIn | undefined {
    const leadIn = MarkdownSection.#leadInFrom(text);

    if (
      leadIn === undefined ||
      !ASIDE_HEADINGS.includes(leadIn.label.toLowerCase())
    ) {
      return undefined;
    }

    return leadIn;
  }

  /** An aside under the heading that introduced it. */
  static #aside(leadIn: LeadIn): CardCalloutBlock | undefined {
    const text = MarkdownSection.#runsFrom(leadIn.rest);

    if (text === undefined) {
      return undefined;
    }

    return {
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of(leadIn.label),
      text,
    };
  }

  /**
   * A bold or bold-italic opening and what follows it, with the punctuation
   * that separated the two taken off.
   *
   * Emphasis alone is not a lead-in. It is how a document sets a whole line
   * apart, which is something else entirely.
   */
  static #leadInFrom(text: string): LeadIn | undefined {
    const groups = MARKED_LABEL.exec(text)?.groups;

    if (groups === undefined) {
      return undefined;
    }

    const marker = groups["marker"] ?? "";

    if (marker.length < LEAD_IN_MARKER_LENGTH) {
      return undefined;
    }

    const label = plainFromMarkup(groups["label"] ?? "")
      .trim()
      .replace(LEAD_IN_PUNCTUATION, "")
      .trim();
    const rest = (groups["rest"] ?? "")
      .replace(LEADING_COLON, "")
      .trim();

    if (label === "" || rest === "") {
      return undefined;
    }

    return { label, rest };
  }
}
