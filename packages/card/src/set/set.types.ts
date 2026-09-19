import type { Card, CardBlock } from "../card";

/**
 * Where one card sits in the set it belongs to, as it reads on the face.
 *
 * A card that was never split has no position: there is nothing to count it
 * against, so it shows no indicator at all.
 */
export interface CardPosition {
  /** Which card this is, counting from one. */
  readonly number: number;
  /** How many cards the set holds. */
  readonly total: number;
  /** How it reads on the card, such as `1/2`. */
  readonly label: string;
}

/** One card of a set, with the position it shows. */
export interface CardSetFace {
  /** What this card says. */
  readonly card: Card;
  /** Where it sits, absent when the set holds one card. */
  readonly position: CardPosition | undefined;
}

/**
 * The smallest piece of a body that may move between cards, and the block it
 * came from.
 *
 * A list arrives as one block and splits between its items, so the pieces have
 * to remember which list they belong to: only pieces of the same original
 * block are set back out as one list when they land on the same card.
 */
export interface CardBodyPiece {
  /** The block this piece renders as on its own. */
  readonly block: CardBlock;
  /** Which block of the source body it came from. */
  readonly origin: number;
  /**
   * True when the piece is half of a block that had to be cut, so it is never
   * gathered back together with its other half.
   */
  readonly fragment: boolean;
}

/** What splitting a card across continuations needs. */
export interface CardSetSplitOptions {
  /** The card to lay out, whole. */
  card: Card;
  /**
   * Whether `candidate` fits on one card.
   *
   * The routine knows how a card may be divided and nothing about how tall
   * anything is, so the caller answers that one question about one candidate,
   * measured as the card will actually be rendered. Has to be monotonic:
   * content that fits implies less of the same content fits.
   */
  fits: (candidate: Card) => boolean;
}
