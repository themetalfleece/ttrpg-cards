import { RichText } from "@ttrpg-cards/text";
import { type TSchema, Value } from "@ttrpg-cards/validator";

import { CARD_BLOCK_KINDS } from "./card.constants";
import {
  CARD_BLOCK_SCHEMA_BY_KIND,
  CardSchema,
} from "./card.schemas";
import type {
  Card,
  CardBlock,
  CardCalloutBlock,
  CardMetaField,
  CardValidationIssue,
} from "./card.types";

/**
 * The same record the schemas declare, keyed by a plain string so an unknown
 * kind read off untrusted input is a lookup miss rather than a cast.
 */
const BLOCK_SCHEMA_BY_KIND = new Map<string, TSchema>(
  Object.entries(CARD_BLOCK_SCHEMA_BY_KIND),
);

const BLOCK_KIND_NAMES = [...BLOCK_SCHEMA_BY_KIND.keys()].join(", ");

const BODY_PATH_PREFIX = "/body/";

/** Every failure of `value` against `schema`, rooted at `pathPrefix`. */
function issuesAgainst(options: {
  schema: TSchema;
  value: unknown;
  pathPrefix: string;
}): CardValidationIssue[] {
  return Value.Errors(options.schema, options.value).map((error) => ({
    path: `${options.pathPrefix}${error.instancePath}`,
    message: error.message,
  }));
}

/** The `kind` a value declares, or undefined when it declares none. */
function kindOf(block: unknown): string | undefined {
  if (
    typeof block !== "object" ||
    block === null ||
    !("kind" in block) ||
    typeof block.kind !== "string"
  ) {
    return undefined;
  }

  return block.kind;
}

/** The body array of a value, or undefined when it has no usable one. */
function bodyOf(value: unknown): unknown[] | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("body" in value)
  ) {
    return undefined;
  }

  return Array.isArray(value.body) ? value.body : undefined;
}

/**
 * Failures of one block, held only to the schema its own `kind` names.
 *
 * Checking a block against the union instead reports the failures of all
 * three branches at once, most of which are untrue of the input: a paragraph
 * with empty text comes back also missing `items` and holding the wrong
 * `kind`. Reading the kind first turns that into the one real failure.
 */
function blockIssues(
  block: unknown,
  index: number,
): CardValidationIssue[] {
  const pathPrefix = `${BODY_PATH_PREFIX}${index}`;
  const kind = kindOf(block);
  const schema =
    kind === undefined ? undefined : BLOCK_SCHEMA_BY_KIND.get(kind);

  if (schema === undefined) {
    return [
      {
        path: `${pathPrefix}/kind`,
        message: `must be one of ${BLOCK_KIND_NAMES}`,
      },
    ];
  }

  return issuesAgainst({ schema, value: block, pathPrefix });
}

/** One block with every span of its text in canonical form. */
function canonicalBlock(block: CardBlock): CardBlock {
  if (block.kind === CARD_BLOCK_KINDS.list) {
    return {
      ...block,
      items: block.items.map(RichText.canonical),
    };
  }

  if (block.kind === CARD_BLOCK_KINDS.callout) {
    const canonical: CardCalloutBlock = {
      kind: block.kind,
      text: RichText.canonical(block.text),
    };

    if (block.label !== undefined) {
      canonical.label = RichText.canonical(block.label);
    }

    return canonical;
  }

  return { ...block, text: RichText.canonical(block.text) };
}

/** One stat block entry with both of its spans in canonical form. */
function canonicalMetaField(field: CardMetaField): CardMetaField {
  return {
    label: RichText.canonical(field.label),
    value: RichText.canonical(field.value),
  };
}

/**
 * Every span of text on a card in canonical form, so the same content is the
 * same card whatever runs a parser happened to emit. Identifiers, tags and
 * the attribution are plain strings and are left exactly as they came.
 */
function canonicalCard(card: Card): Card {
  const canonical: Card = {
    ...card,
    name: RichText.canonical(card.name),
    meta: card.meta.map(canonicalMetaField),
    body: card.body.map(canonicalBlock),
  };

  if (card.badge !== undefined) {
    canonical.badge = RichText.canonical(card.badge);
  }

  if (card.subtitle !== undefined) {
    canonical.subtitle = RichText.canonical(card.subtitle);
  }

  if (card.footer !== undefined) {
    canonical.footer = card.footer.map(RichText.canonical);
  }

  return canonical;
}

/** One line naming every failure, for an error message. */
function describeIssues(issues: CardValidationIssue[]): string {
  const described = issues
    .map((issue) => {
      const location =
        issue.path.length > 0 ? issue.path : "the card";
      return `${location}: ${issue.message}`;
    })
    .join(", ");

  return described.length > 0
    ? `Not a card. ${described}`
    : "Not a card.";
}

/**
 * A card and the values derived from it.
 *
 * Everything that reads a card as a whole (counting its blocks, measuring the
 * text that has to fit on the face, checking untrusted input) hangs off this
 * class, so those derivations stay with the data instead of spreading into
 * helpers that each take the card apart again.
 *
 * The constructor takes the caller's card as given, for content that is
 * already trusted. {@link CardModel.from} copies what it validates, so a
 * model built from untrusted input shares nothing with it.
 */
export class CardModel {
  readonly #card: Card;

  constructor(options: { card: Card }) {
    this.#card = options.card;
  }

  /** Narrows untrusted input, for a boundary that needs only a yes or no. */
  static isCard(value: unknown): value is Card {
    return Value.Check(CardSchema, value);
  }

  /** Every structural failure in `value`, empty when it is a card. */
  static validate(value: unknown): CardValidationIssue[] {
    const cardIssues = issuesAgainst({
      schema: CardSchema,
      value,
      pathPrefix: "",
    }).filter((issue) => !issue.path.startsWith(BODY_PATH_PREFIX));

    const body = bodyOf(value) ?? [];

    return [...cardIssues, ...body.flatMap(blockIssues)];
  }

  /**
   * Builds a model from untrusted input, throwing when it is not a card.
   *
   * Every span comes back canonical, so two imports of the same content give
   * the same card whatever runs the parser happened to emit.
   */
  static from(value: unknown): CardModel {
    if (CardModel.isCard(value)) {
      return new CardModel({
        card: canonicalCard(structuredClone(value)),
      });
    }

    throw new TypeError(describeIssues(CardModel.validate(value)));
  }

  /** The text of one block, with a list's items on their own lines. */
  static blockText(block: CardBlock): string {
    if (block.kind === CARD_BLOCK_KINDS.list) {
      return block.items.map(RichText.plain).join("\n");
    }

    const text = RichText.plain(block.text);

    if (
      block.kind === CARD_BLOCK_KINDS.callout &&
      block.label !== undefined
    ) {
      return `${RichText.plain(block.label)}\n${text}`;
    }

    return text;
  }

  /** The underlying record, as it is stored and serialised. */
  get card(): Card {
    return this.#card;
  }

  /** How many entries the stat block has. */
  get metaFieldCount(): number {
    return this.#card.meta.length;
  }

  /** How many blocks the body has. */
  get blockCount(): number {
    return this.#card.body.length;
  }

  /** True when the card carries nothing beyond its identity. */
  get isEmpty(): boolean {
    return this.metaFieldCount === 0 && this.blockCount === 0;
  }

  /** The card's tags, empty when it declares none. */
  get tags(): readonly string[] {
    return this.#card.tags ?? [];
  }

  /** The body text alone, which is what splitting and fitting work on. */
  get bodyText(): string {
    return this.#card.body
      .map((block) => CardModel.blockText(block))
      .join("\n");
  }

  /**
   * The text laid out on the face, in reading order: name, badge, subtitle,
   * stat block, body, footer. Tags are for finding a card in the library
   * rather than reading it, so they are not part of this text.
   */
  get faceText(): string {
    const card = this.#card;
    const regions: string[] = [RichText.plain(card.name)];

    if (card.badge !== undefined) {
      regions.push(RichText.plain(card.badge));
    }

    if (card.subtitle !== undefined) {
      regions.push(RichText.plain(card.subtitle));
    }

    for (const field of card.meta) {
      const label = RichText.plain(field.label);
      regions.push(`${label}: ${RichText.plain(field.value)}`);
    }

    if (this.blockCount > 0) {
      regions.push(this.bodyText);
    }

    if (card.footer !== undefined) {
      regions.push(card.footer.map(RichText.plain).join(" "));
    }

    return regions.join("\n");
  }
}
