import { RichText, type TextRuns } from "@ttrpg-cards/text";

import {
  CARD_BLOCK_KINDS,
  type Card,
  type CardBlock,
  type CardCalloutBlock,
  CardModel,
} from "../card";
import {
  CONTINUATION_ID_SEPARATOR,
  MAXIMUM_CARDS_PER_SET,
} from "./set.constants";
import type {
  CardBodyPiece,
  CardPosition,
  CardSetFace,
  CardSetSplitOptions,
} from "./set.types";

/** Why an empty set is refused. */
const EMPTY_SET_MESSAGE =
  "A card set holds at least one card, because a set is what one card's content became.";

/**
 * The end of a sentence and the space after it, where a block is cut when no
 * block boundary will do. Closing brackets and quotes travel with the sentence
 * they end.
 */
const SENTENCE_END = /[.!?][)\]"'”’]*\s+/g;

/** The space between two words, the last boundary before cutting one. */
const WORD_END = /\s+/g;

/**
 * One entry laid out across as many cards as its content needs.
 *
 * A card gives up type size first and a second card only when the bottom of
 * the range was not enough, so most sets hold one card and show no position at
 * all. When a set does split, the first card is the whole card and every card
 * after it is a continuation: the name, a position indicator and the rest of
 * the body, with no second copy of the stat block.
 *
 * The set is the unit the print pipeline keeps together, and it is addressed
 * by the id of the card it was made from.
 */
export class CardSet {
  readonly #cards: readonly [Card, ...Card[]];

  /** Holds `cards` to being a set at all: one card, at the least. */
  constructor(options: { cards: readonly Card[] }) {
    const [first, ...rest] = options.cards;

    if (first === undefined) {
      throw new TypeError(EMPTY_SET_MESSAGE);
    }

    this.#cards = [first, ...rest];
  }

  /** The set a card that fits makes on its own, showing no position. */
  static of(card: Card): CardSet {
    return new CardSet({ cards: [card] });
  }

  /**
   * `card` laid out across continuations, cut where `fits` says it has to be.
   *
   * Each card takes as much as it will hold before the next one starts, so a
   * set is as short as the content allows rather than cut to a fixed length.
   * Cuts land between blocks, and between the items of a list, which is what
   * "block boundary" means here. A single block too tall for a card of its own
   * is cut at a sentence end, and only at a word end when no sentence end is
   * early enough. A word is never cut: a block with no usable boundary left
   * goes on whole and overflows, which is at least visible.
   *
   * Nothing is dropped. The halves of every cut laid end to end are the text
   * that came in, character for character.
   *
   * @example
   * ```ts
   * const set = CardSet.split({ card, fits: (candidate) => measure(candidate) });
   *
   * set.length; // 2
   * set.positionAt(1)?.label; // "2/2"
   * ```
   */
  static split({ card, fits }: CardSetSplitOptions): CardSet {
    if (fits(card)) {
      return CardSet.of(card);
    }

    const remaining = CardSet.#pieces(card.body);
    const bodies: CardBodyPiece[][] = [];

    while (remaining.length > 0) {
      const index = bodies.length;

      if (index === MAXIMUM_CARDS_PER_SET - 1) {
        bodies.push(remaining.splice(0));
        break;
      }

      const fitsOnCard = (pieces: readonly CardBodyPiece[]) =>
        fits(CardSet.#face({ card, pieces, index }));

      let held = CardSet.#largestPassing({
        count: remaining.length,
        passes: (taken) => fitsOnCard(remaining.slice(0, taken)),
      });

      if (held === 0) {
        CardSet.#divideFirst({ pieces: remaining, fits: fitsOnCard });
        held = 1;
      }

      bodies.push(remaining.splice(0, held));
    }

    if (bodies.length === 0) {
      return CardSet.of(card);
    }

    CardSet.#pullOrphanForward({ card, bodies, fits });

    return new CardSet({
      cards: bodies.map((pieces, index) =>
        CardSet.#face({ card, pieces, index }),
      ),
    });
  }

  /**
   * The largest `n` from 1 to `count` that `passes`, or 0 when none does.
   *
   * Halves the range rather than stepping down it, because every answer costs
   * the caller a measurement. `passes` has to be monotonic: `n` passing means
   * every smaller `n` passes.
   */
  static #largestPassing(options: {
    count: number;
    passes: (value: number) => boolean;
  }): number {
    let smallest = 1;
    let largest = options.count;
    let best = 0;

    while (smallest <= largest) {
      const middle = Math.floor((smallest + largest) / 2);

      if (options.passes(middle)) {
        best = middle;
        smallest = middle + 1;
        continue;
      }

      largest = middle - 1;
    }

    return best;
  }

  /**
   * A body as the smallest pieces that may move between cards: one per block,
   * except a list, which comes apart into its items.
   */
  static #pieces(body: readonly CardBlock[]): CardBodyPiece[] {
    return body.flatMap((block, origin): CardBodyPiece[] => {
      if (block.kind !== CARD_BLOCK_KINDS.list) {
        return [{ block, origin, fragment: false }];
      }

      return block.items.map((item) => ({
        block: { kind: block.kind, items: [item] },
        origin,
        fragment: false,
      }));
    });
  }

  /**
   * Pieces set back out as blocks, with items of the same list that landed on
   * the same card gathered back into it.
   *
   * The one pair that is never gathered is the two halves of a single cut,
   * which are one item's text rather than two entries. A trailing half
   * followed by the next whole item is an ordinary item boundary and gathers
   * like any other, so a cut item does not leave the rest of its list
   * rendering as a second list.
   */
  static #blocks(pieces: readonly CardBodyPiece[]): CardBlock[] {
    const blocks: CardBlock[] = [];
    let previous: CardBodyPiece | undefined;

    for (const piece of pieces) {
      const open = blocks.at(-1);

      if (
        open !== undefined &&
        open.kind === CARD_BLOCK_KINDS.list &&
        piece.block.kind === CARD_BLOCK_KINDS.list &&
        CardSet.#gathers({ previous, piece })
      ) {
        blocks[blocks.length - 1] = {
          kind: open.kind,
          items: [...open.items, ...piece.block.items],
        };
      } else {
        blocks.push(piece.block);
      }

      previous = piece;
    }

    return blocks;
  }

  /**
   * Whether two pieces in a row came out of the same block of the body, and
   * are two entries of it rather than the two halves of one cut entry.
   */
  static #gathers(options: {
    previous: CardBodyPiece | undefined;
    piece: CardBodyPiece;
  }): boolean {
    const { previous, piece } = options;

    return (
      previous !== undefined &&
      previous.origin === piece.origin &&
      !(previous.fragment && piece.fragment)
    );
  }

  /**
   * Cuts the first piece so the most of it that fits stays on this card and
   * the rest moves to the next. Leaves the pieces alone when there is no
   * boundary inside the block to cut at.
   */
  static #divideFirst(options: {
    pieces: CardBodyPiece[];
    fits: (pieces: readonly CardBodyPiece[]) => boolean;
  }): void {
    const first = options.pieces[0];

    if (first === undefined) {
      return;
    }

    const span = CardSet.#divisibleSpan(first.block);

    if (span === undefined) {
      return;
    }

    const at = CardSet.#cut({
      piece: first,
      span,
      fits: options.fits,
    });

    if (at === undefined) {
      return;
    }

    options.pieces.splice(
      0,
      1,
      ...CardSet.#divided({ piece: first, span, at }),
    );
  }

  /** The span of a block a cut may fall inside, absent when it has none. */
  static #divisibleSpan(block: CardBlock): TextRuns | undefined {
    if (block.kind !== CARD_BLOCK_KINDS.list) {
      return block.text;
    }

    return block.items.length === 1 ? block.items[0] : undefined;
  }

  /**
   * Where to cut a piece so its opening half fits, counted in characters.
   *
   * Sentence ends are tried first and word ends only when no sentence end is
   * early enough, so a card is never cut mid-sentence while a sentence
   * boundary would have done. Undefined when neither offers a half that fits,
   * which leaves the block whole rather than cutting a word.
   */
  static #cut(options: {
    piece: CardBodyPiece;
    span: TextRuns;
    fits: (pieces: readonly CardBodyPiece[]) => boolean;
  }): number | undefined {
    const { piece, span } = options;
    const text = RichText.plain(span);
    const openingFits = (at: number) =>
      options.fits([CardSet.#divided({ piece, span, at })[0]]);

    const atSentenceEnd = CardSet.#largestOffset({
      offsets: CardSet.#offsets(text, SENTENCE_END),
      passes: openingFits,
    });

    if (atSentenceEnd !== undefined) {
      return atSentenceEnd;
    }

    return CardSet.#largestOffset({
      offsets: CardSet.#offsets(text, WORD_END),
      passes: openingFits,
    });
  }

  /** The largest of `offsets` that `passes`, or nothing when none does. */
  static #largestOffset(options: {
    offsets: readonly number[];
    passes: (offset: number) => boolean;
  }): number | undefined {
    const taken = CardSet.#largestPassing({
      count: options.offsets.length,
      passes: (count) => {
        const offset = options.offsets[count - 1];

        return offset !== undefined && options.passes(offset);
      },
    });

    if (taken === 0) {
      return undefined;
    }

    return options.offsets[taken - 1];
  }

  /**
   * Every offset inside `text` that `boundary` allows a cut at, ascending.
   *
   * The whitespace at the boundary stays with the opening half, so the two
   * halves laid end to end are the text that came in. Nothing is trimmed away
   * to make the seam look tidy.
   */
  static #offsets(text: string, boundary: RegExp): number[] {
    const offsets: number[] = [];

    for (const match of text.matchAll(boundary)) {
      const matched = match[0];

      // A match always carries its own text; the check is what lets the
      // compiler see that.
      if (matched === undefined) {
        continue;
      }

      const offset = match.index + matched.length;

      if (offset > 0 && offset < text.length) {
        offsets.push(offset);
      }
    }

    return offsets;
  }

  /** A piece cut in two at `at`, both halves the same kind of block. */
  static #divided(options: {
    piece: CardBodyPiece;
    span: TextRuns;
    at: number;
  }): [CardBodyPiece, CardBodyPiece] {
    const { piece, span, at } = options;
    const [opening, rest] = RichText.split({ text: span, at });
    const [first, second] = CardSet.#dividedBlocks({
      block: piece.block,
      opening,
      rest,
    });

    return [
      { block: first, origin: piece.origin, fragment: true },
      { block: second, origin: piece.origin, fragment: true },
    ];
  }

  /**
   * The two blocks a cut block becomes. A callout's label names the whole
   * aside, so it stays on the opening half rather than being announced twice.
   */
  static #dividedBlocks(options: {
    block: CardBlock;
    opening: TextRuns;
    rest: TextRuns;
  }): [CardBlock, CardBlock] {
    const { block, opening, rest } = options;

    if (block.kind === CARD_BLOCK_KINDS.list) {
      return [
        { kind: block.kind, items: [opening] },
        { kind: block.kind, items: [rest] },
      ];
    }

    if (block.kind === CARD_BLOCK_KINDS.callout) {
      const head: CardCalloutBlock = {
        kind: block.kind,
        text: opening,
      };

      if (block.label !== undefined) {
        head.label = block.label;
      }

      return [head, { kind: block.kind, text: rest }];
    }

    return [
      { kind: block.kind, text: opening },
      { kind: block.kind, text: rest },
    ];
  }

  /**
   * One card of the set: the whole card at `index` 0, a continuation after it.
   *
   * A continuation carries the name, the badge, the rest of the body, and
   * nothing else. Repeating the stat block would spend the room the split
   * exists to reclaim, and the subtitle and footer would spend it on a second
   * copy of what the first card already says.
   *
   * The badge is the exception because it is what the card is, not a repeat of
   * something said elsewhere: somebody holding the second card of an entry
   * still has to be able to read its rank off it, and a glyph in the corner of
   * the title bar costs no height at all. The source travels with the content,
   * because the content is what carries its terms.
   */
  static #face(options: {
    card: Card;
    pieces: readonly CardBodyPiece[];
    index: number;
  }): Card {
    const { card, pieces, index } = options;
    const body = CardSet.#blocks(pieces);

    if (index === 0) {
      return { ...card, body };
    }

    const continuation: Card = {
      id: `${card.id}${CONTINUATION_ID_SEPARATOR}${index + 1}`,
      name: card.name,
      meta: [],
      body,
    };

    if (card.badge !== undefined) {
      continuation.badge = card.badge;
    }

    if (card.source !== undefined) {
      continuation.source = card.source;
    }

    return continuation;
  }

  /**
   * Moves one block forward onto the last card when it would otherwise carry a
   * single block on its own, and only while the move still fits.
   *
   * Block count stands in for the orphan line the rule is about: nothing here
   * measures lines, and a last card carrying one block is the case that reads
   * as an accident. A block that had to be cut stays where it is, because
   * pulling its opening half forward would only undo the cut.
   */
  static #pullOrphanForward(options: {
    card: Card;
    bodies: CardBodyPiece[][];
    fits: (candidate: Card) => boolean;
  }): void {
    const { bodies } = options;
    const last = bodies.at(-1);
    const previous = bodies.at(-2);

    if (last === undefined || previous === undefined) {
      return;
    }

    const orphan = last[0];
    const pulled = previous.at(-1);

    if (
      last.length !== 1 ||
      previous.length < 2 ||
      orphan === undefined ||
      pulled === undefined ||
      orphan.fragment
    ) {
      return;
    }

    const candidate = CardSet.#face({
      card: options.card,
      pieces: [pulled, orphan],
      index: bodies.length - 1,
    });

    if (!options.fits(candidate)) {
      return;
    }

    previous.pop();
    last.unshift(pulled);
  }

  /**
   * What the set is addressed by: the id of the card it was made from. Every
   * continuation's id is built from it, so the set stays one unit.
   */
  get id(): string {
    return this.#cards[0].id;
  }

  /** Every card of the set, in reading order. */
  get cards(): readonly Card[] {
    return this.#cards;
  }

  /** How many cards the set holds. */
  get length(): number {
    return this.#cards.length;
  }

  /** True when the content needed more than one card. */
  get isSplit(): boolean {
    return this.#cards.length > 1;
  }

  /** Every card with the position it shows, which is what a renderer wants. */
  get faces(): readonly CardSetFace[] {
    return this.#cards.map((card, index) => ({
      card,
      position: this.positionAt(index),
    }));
  }

  /**
   * The body text of every card in order, for checking that a split kept all
   * of it. A set of one reads back exactly as the card it was made from.
   */
  get bodyText(): string {
    return this.#cards
      .map((card) => new CardModel({ card }).bodyText)
      .join("\n");
  }

  /**
   * Where the card at `index` sits, or nothing when it shows no indicator.
   *
   * A set of one has no position: there is nothing to count it against.
   *
   * @example
   * ```ts
   * set.positionAt(1); // { number: 2, total: 2, label: "2/2" }
   * CardSet.of(card).positionAt(0); // undefined
   * ```
   */
  positionAt(index: number): CardPosition | undefined {
    const total = this.#cards.length;

    if (total < 2 || index < 0 || index >= total) {
      return undefined;
    }

    const number = index + 1;

    return { number, total, label: `${number}/${total}` };
  }
}
