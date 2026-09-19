import {
  CARD_BLOCK_KINDS,
  type Card,
  type CardBlock,
  type CardMetaField,
  type CardSource,
} from "@ttrpg-cards/card";
import {
  RichText,
  TEXT_MARKS,
  type TextRuns,
} from "@ttrpg-cards/text";
import {
  Value,
  type ValidationIssue,
  describeIssues,
  issuesAgainst,
} from "@ttrpg-cards/validator";

import type { CatalogAttribution } from "../attribution";
import { attributionFor } from "../attribution";

import {
  CANTRIP_BADGE,
  CANTRIP_LEVEL_NAME,
  CANTRIP_WORD,
  COMPONENT_LETTERS,
  CONCENTRATION_PREFIX,
  CONCENTRATION_TAG,
  ENTRY_BLOCK_TYPES,
  LEVEL_NAME_PREFIX,
  META_LABELS,
  NO_COMPONENTS,
  RITUAL_FOOTER_SUFFIX,
  RITUAL_TAG,
} from "./catalog.constants";
import { CatalogSourceSchema } from "./catalog.schemas";
import type {
  CatalogEntry,
  CatalogSource,
  EntryBlock,
  EntryComponents,
  EntryTable,
} from "./catalog.types";
import { runsFromMarkup } from "./markup";

/** A casting time and the condition it waits on, when it names one. */
interface CastingTime {
  readonly value: string;
  readonly trigger: string | undefined;
}

/** One cell of a printed table, with the column heading above it. */
interface TableCell {
  readonly text: string;
  readonly heading: string;
}

/** "1 reaction, which you take when ..." splits before the clause. */
const CASTING_TIME_TRIGGER = /^([^,]+),\s*(which\b.*)$/is;

/** A material component reads as a sentence once it leaves its parentheses. */
const SENTENCE_END = /[.!?]$/;

/**
 * Above this many columns a row no longer reads as "key: value", so each cell
 * is written out under its own heading.
 */
const LABELLED_COLUMN_THRESHOLD = 2;

/**
 * What joins the column headings a captionless table is read under. A colon
 * would read badly after the two headings that end in an ellipsis.
 */
const HEADING_SEPARATOR = " / ";

/** What input has failed to be, for an error message. */
const CATALOG_SUBJECT = "catalog";

/**
 * One bundled catalog: the entries extracted from a release of the source
 * document, and the cards they map onto.
 *
 * This class is the mapping layer, and the only code we ship that knows what a
 * casting time is. Everything past it sees a card whose stat block is an
 * ordered list of labels and values, so no other package is named for a game
 * concept. The extraction in `scripts/` speaks the document's vocabulary too,
 * but it runs by hand and never reaches a browser.
 *
 * The constructor takes its source as given, for the bundled files that our
 * own extraction wrote and validated. {@link Catalog.from} checks untrusted
 * input instead.
 *
 * @example
 * ```ts
 * const catalog = bundledCatalog("srd-5.1")!;
 *
 * catalog.entryCount; // 319
 * catalog.attribution?.statement; // the verbatim credit the licence requires
 * catalog.cards[0]?.id; // "srd-5.1:acid-arrow"
 * ```
 */
export class Catalog {
  readonly #source: CatalogSource;

  #cards: readonly Card[] | undefined;

  constructor(options: { source: CatalogSource }) {
    this.#source = options.source;
  }

  /**
   * Narrows untrusted input, for a boundary that needs only a yes or no.
   *
   * @example
   * ```ts
   * Catalog.isSource({ id: "test", title: "Test", entries: [entry] }); // true
   * Catalog.isSource({ id: "test", title: "Test" }); // false
   * ```
   */
  static isSource(value: unknown): value is CatalogSource {
    return Value.Check(CatalogSourceSchema, value);
  }

  /**
   * Every structural failure in `value`, empty when it is a catalog.
   *
   * @example
   * ```ts
   * Catalog.validate({ ...source, entries: [{ ...entry, name: "" }] });
   * // [{ path: "/entries/0/name", message: "..." }]
   * ```
   */
  static validate(value: unknown): ValidationIssue[] {
    return issuesAgainst({
      schema: CatalogSourceSchema,
      value,
      pathPrefix: "",
    });
  }

  /**
   * Builds a catalog from untrusted input, throwing when it is not one.
   *
   * @example
   * ```ts
   * Catalog.from(JSON.parse(text)).entryCount;
   * Catalog.from(null); // throws TypeError, naming every failure
   * ```
   */
  static from(value: unknown): Catalog {
    if (Catalog.isSource(value)) {
      return new Catalog({ source: value });
    }

    throw new TypeError(
      describeIssues({
        issues: Catalog.validate(value),
        subject: CATALOG_SUBJECT,
      }),
    );
  }

  /**
   * One extracted entry as a card.
   *
   * The entry's named fields become an ordered stat block, its description
   * becomes body blocks, and the sections that read as asides (the higher
   * level upgrade, the material component) become callouts. Nothing about the
   * result says which kind of card it is.
   *
   * @example
   * ```ts
   * const card = Catalog.cardFrom(entry);
   *
   * card.badge; // [{ text: "2" }], or [{ text: "C" }] at level 0
   * card.meta[0]; // { label: [{ text: "Casting Time" }], value: [...] }
   * card.footer; // [[{ text: "Abjuration (ritual)" }], [{ text: "Warden" }]]
   * ```
   */
  static cardFrom(entry: CatalogEntry): Card {
    const card: Card = {
      id: entry.id,
      name: RichText.of(entry.name),
      badge: RichText.of(Catalog.#badge(entry.level)),
      meta: Catalog.#meta(entry),
      body: Catalog.#body(entry),
      footer: Catalog.#footer(entry),
      tags: Catalog.#tags(entry),
    };

    const source = Catalog.#cardSource(entry);

    if (source !== undefined) {
      card.source = source;
    }

    return card;
  }

  /** The glyph in the corner of the title bar: the entry's level. */
  static #badge(level: number): string {
    return level === 0 ? CANTRIP_BADGE : String(level);
  }

  /** How the tags name a level, where a bare numeral would not read. */
  static #levelName(level: number): string {
    return level === 0
      ? CANTRIP_LEVEL_NAME
      : `${LEVEL_NAME_PREFIX} ${level}`;
  }

  /** One stat block entry, both halves as plain text. */
  static #field(label: string, value: string): CardMetaField {
    return { label: RichText.of(label), value: RichText.of(value) };
  }

  /** The stat block, in the order it is laid out. */
  static #meta(entry: CatalogEntry): CardMetaField[] {
    return [
      Catalog.#field(
        META_LABELS.castingTime,
        Catalog.#castingTime(entry.castingTime).value,
      ),
      Catalog.#field(META_LABELS.range, entry.range),
      Catalog.#field(
        META_LABELS.components,
        Catalog.#componentLetters(entry.components),
      ),
      Catalog.#field(META_LABELS.duration, Catalog.#duration(entry)),
    ];
  }

  /** A casting time split from the condition it waits on, when it has one. */
  static #castingTime(castingTime: string): CastingTime {
    const trimmed = castingTime.trim();
    const match = CASTING_TIME_TRIGGER.exec(trimmed);

    if (match === null) {
      return { value: trimmed, trigger: undefined };
    }

    const [, value = "", trigger = ""] = match;

    return { value: value.trim(), trigger: trigger.trim() };
  }

  /** The letters the source prints, or the word it uses for none of them. */
  static #componentLetters(components: EntryComponents): string {
    const letters: string[] = [];

    if (components.verbal) {
      letters.push(COMPONENT_LETTERS.verbal);
    }

    if (components.somatic) {
      letters.push(COMPONENT_LETTERS.somatic);
    }

    if (components.material) {
      letters.push(COMPONENT_LETTERS.material);
    }

    return letters.length > 0 ? letters.join(", ") : NO_COMPONENTS;
  }

  /**
   * The duration as the document prints it. Extraction lifts the
   * concentration prefix into a flag, so putting it back restores the
   * licensor's own wording rather than inventing a second field for it.
   */
  static #duration(entry: CatalogEntry): string {
    if (!entry.concentration) {
      return entry.duration;
    }

    const rest =
      entry.duration.charAt(0).toLowerCase() +
      entry.duration.slice(1);

    return `${CONCENTRATION_PREFIX}${rest}`;
  }

  /** The body, in reading order. */
  static #body(entry: CatalogEntry): CardBlock[] {
    const blocks: CardBlock[] = [];
    const { trigger, value } = Catalog.#castingTime(
      entry.castingTime,
    );

    if (trigger !== undefined) {
      blocks.push({
        kind: CARD_BLOCK_KINDS.paragraph,
        text: RichText.joined(
          RichText.marked(RichText.of(value), TEXT_MARKS.strong),
          RichText.of(`, ${trigger}`),
        ),
      });
    }

    for (const block of entry.description) {
      blocks.push(...Catalog.#blocksFrom(block));
    }

    if (entry.upgrade !== undefined) {
      blocks.push({
        kind: CARD_BLOCK_KINDS.callout,
        label: RichText.of(entry.upgrade.label),
        text: runsFromMarkup(entry.upgrade.text),
      });
    }

    const material = entry.components.materialText;

    if (material !== undefined) {
      blocks.push({
        kind: CARD_BLOCK_KINDS.callout,
        label: RichText.of(META_LABELS.material),
        text: RichText.of(Catalog.#materialSentence(material)),
      });
    }

    return blocks;
  }

  /** A material component read back as its own sentence. */
  static #materialSentence(material: string): string {
    const trimmed = material.trim();
    const opened = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

    return SENTENCE_END.test(opened) ? opened : `${opened}.`;
  }

  /** One description block as the card blocks it maps onto. */
  static #blocksFrom(block: EntryBlock): CardBlock[] {
    if (block.type === ENTRY_BLOCK_TYPES.list) {
      return [
        {
          kind: CARD_BLOCK_KINDS.list,
          items: block.items.map(runsFromMarkup),
        },
      ];
    }

    if (block.type === ENTRY_BLOCK_TYPES.table) {
      return Catalog.#tableBlocks(block);
    }

    return [
      {
        kind: CARD_BLOCK_KINDS.paragraph,
        text: runsFromMarkup(block.text),
      },
    ];
  }

  /**
   * A printed table as a caption and a list, one item per row.
   *
   * The card model has no table, and that is the right shape for a card this
   * small: a grid sized for a page column does not survive being set at card
   * width. Each row is written out instead, led by its first cell.
   */
  static #tableBlocks(table: EntryTable): CardBlock[] {
    const blocks: CardBlock[] = [];
    const heading = Catalog.#tableHeading(table);

    if (heading !== undefined) {
      blocks.push({
        kind: CARD_BLOCK_KINDS.paragraph,
        text: RichText.marked(
          runsFromMarkup(heading),
          TEXT_MARKS.strong,
        ),
      });
    }

    const rows = table.rows
      .map((row) => Catalog.#cells(row, table.header))
      .filter((cells) => cells.some((cell) => cell.text !== ""));

    if (rows.length > 0) {
      blocks.push({
        kind: CARD_BLOCK_KINDS.list,
        items: rows.map((cells) =>
          Catalog.#rowRuns(cells, table.header.length),
        ),
      });
    }

    return blocks;
  }

  /**
   * The line a table is read under: its caption when it prints one, otherwise
   * its column headings.
   *
   * Most printed tables here carry no caption, and for those the first
   * column's heading is the only thing that says what the first cell means. It
   * has to be written out, because the header row does not survive onto the
   * card and nothing downstream can recover it. Past two columns only that
   * first heading is still unsaid, since {@link Catalog.#rowRuns} writes the
   * rest beside their cells.
   */
  static #tableHeading(table: EntryTable): string | undefined {
    if (table.caption !== undefined) {
      return table.caption;
    }

    const unsaid =
      table.header.length > LABELLED_COLUMN_THRESHOLD
        ? table.header.slice(0, 1)
        : table.header;
    const headings = unsaid
      .map((heading) => heading.trim())
      .filter((heading) => heading !== "");

    return headings.length > 0
      ? headings.join(HEADING_SEPARATOR)
      : undefined;
  }

  /** One row's cells paired with the headings above them. */
  static #cells(
    row: readonly string[],
    header: readonly string[],
  ): TableCell[] {
    return row.map((text, index) => ({
      text: text.trim(),
      heading: (header[index] ?? "").trim(),
    }));
  }

  /**
   * One row as a line of text: the first cell in strong, then the rest.
   *
   * A two column table reads as "key: value", and the heading line above
   * already names both columns, so a row does not repeat them. A wider one
   * does not read that way, so each cell is written out under its own heading.
   */
  static #rowRuns(
    cells: readonly TableCell[],
    columnCount: number,
  ): TextRuns {
    const [lead, ...rest] = cells;
    const spans: TextRuns[] = [];

    if (lead !== undefined && lead.text !== "") {
      spans.push(
        RichText.marked(runsFromMarkup(lead.text), TEXT_MARKS.strong),
      );
    }

    const labelled = columnCount > LABELLED_COLUMN_THRESHOLD;
    const values = rest
      .filter((cell) => cell.text !== "")
      .map((cell) =>
        labelled && cell.heading !== ""
          ? `${cell.heading} ${cell.text}`
          : cell.text,
      );

    if (values.length > 0) {
      const text = values.join(", ");
      spans.push(
        runsFromMarkup(spans.length > 0 ? `: ${text}` : text),
      );
    }

    return RichText.joined(...spans);
  }

  /** The short entries along the bottom rule. */
  static #footer(entry: CatalogEntry): TextRuns[] {
    const school =
      entry.level === 0
        ? `${entry.school} ${CANTRIP_WORD}`
        : entry.school;
    const line = entry.ritual
      ? `${school}${RITUAL_FOOTER_SUFFIX}`
      : school;

    return [RichText.of(line), RichText.of(entry.classes.join(", "))];
  }

  /** What the card is found by in the library. None of these render. */
  static #tags(entry: CatalogEntry): string[] {
    const tags = [
      entry.source,
      entry.school,
      Catalog.#levelName(entry.level),
      ...entry.classes,
    ];

    if (entry.concentration) {
      tags.push(CONCENTRATION_TAG);
    }

    if (entry.ritual) {
      tags.push(RITUAL_TAG);
    }

    return tags;
  }

  /** The catalog an entry id is prefixed with. */
  static #catalogIdOf(entryId: string): string {
    const separator = entryId.indexOf(":");

    return separator === -1 ? entryId : entryId.slice(0, separator);
  }

  /**
   * Where the content came from and the terms it carries.
   *
   * The card names the document and links the licensor's published source,
   * which is what CC BY 4.0 section 3(a) asks a small surface to carry. The
   * statement itself is too long for a card and is shown once, in full, from
   * the attribution constants.
   */
  static #cardSource(entry: CatalogEntry): CardSource | undefined {
    const attribution = attributionFor(
      Catalog.#catalogIdOf(entry.id),
    );

    if (attribution === undefined) {
      return undefined;
    }

    return {
      name: attribution.title,
      url: attribution.sourceUrl,
      license: attribution.license.name,
    };
  }

  /** The catalog's stable id, which every entry id is prefixed with. */
  get id(): string {
    return this.#source.id;
  }

  /** How the catalog names itself. */
  get title(): string {
    return this.#source.title;
  }

  /** The entries as they were extracted. */
  get entries(): readonly CatalogEntry[] {
    return this.#source.entries;
  }

  /** How many entries the catalog holds. */
  get entryCount(): number {
    return this.#source.entries.length;
  }

  /** What this catalog must show a reader, or undefined when it has none. */
  get attribution(): CatalogAttribution | undefined {
    return attributionFor(this.#source.id);
  }

  /**
   * Every entry as a card, mapped once and kept.
   *
   * @example
   * ```ts
   * const catalog = bundledCatalog("srd-5.1")!;
   *
   * catalog.cards === catalog.cards; // true, the mapping runs once
   * ```
   */
  get cards(): readonly Card[] {
    this.#cards ??= this.#source.entries.map((entry) =>
      Catalog.cardFrom(entry),
    );

    return this.#cards;
  }
}
