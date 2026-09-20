import type {
  Card,
  CardLayout,
  CardSet,
  CardThemeId,
} from "@ttrpg-cards/card";
import type { Root } from "react-dom/client";

/**
 * One entry, laid out across as many cards as its content needs.
 *
 * `card` and `layout` want to be referentially stable, for the same reason a
 * card face does and rather more so: a new identity for either is a fresh
 * round of measurement, and working out a split costs several of them.
 */
export interface CardSetViewProps {
  /** What the entry says, whole. */
  card: Card;
  /** The geometry to lay it out at. Every measurement is read from here. */
  layout: CardLayout;
  /**
   * The colour theme every card of the set is drawn in. One entry is one
   * theme: a continuation in another colour would not read as the same card.
   */
  theme?: CardThemeId | undefined;
  /**
   * The set to draw, for a caller that has already worked one out, such as a
   * sheet deciding how many entries fit on it. Left off, the entry measures
   * itself.
   *
   * This is the same escape hatch a card face keeps for its font size, and it
   * exists for the same reason: the alternative is measuring the entry twice,
   * once to be told what it costs and once to draw it.
   */
  set?: CardSet | undefined;
  /** Passed through for a consumer that positions the set. */
  className?: string | undefined;
}

/** What working out a card's set needs. */
export interface UseCardSetOptions {
  /** What the entry says, whole. */
  card: Card;
  /** The geometry the split is measured against. */
  layout: CardLayout;
  /** A set decided elsewhere. Given one, this measures nothing. */
  set?: CardSet | undefined;
}

/**
 * The off-page card measurements are made in: the node and the React root
 * that renders into it, which are made together and never used apart.
 */
export interface MeasuringSurface {
  /** The node, kept in the page so what is rendered into it has a layout. */
  readonly frame: HTMLElement;
  /** What renders a candidate into that node. */
  readonly root: Root;
}

/**
 * A set together with what it was measured for, so a card or a geometry that
 * has since changed is recognised as an answer to the wrong question.
 */
export interface MeasuredCardSet {
  /** The card the measurement was made for. */
  readonly card: Card;
  /** The geometry it was measured against. */
  readonly layout: CardLayout;
  /** What it came out as. */
  readonly set: CardSet;
}
