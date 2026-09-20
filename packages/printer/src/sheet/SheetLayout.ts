import type { CardLayout } from "@ttrpg-cards/card";

import {
  CARD_GAP_MILLIMETRES,
  DEFAULT_PAGE_ORIENTATION,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_PRESETS,
} from "./sheet.constants";
import type {
  PageOrientation,
  PageSizeName,
  SheetFillOptions,
  SheetItem,
  SheetLayoutOverrides,
  SheetLayoutSettings,
} from "./sheet.types";

/**
 * The sheet cards are laid out on: the paper, the way round it goes, and the
 * margin kept inside its edges.
 *
 * Immutable, like the card layout it sits beside: a different paper is a new
 * sheet derived with {@link SheetLayout.with}, never a mutation. Several
 * consumers lay out against the same sheet at once, and a renderer needs the
 * new identity to re-run anyway.
 *
 * Every field is a name from a closed set, so unlike a card layout there is
 * nothing here to validate: a sheet cannot be built out of measurements a
 * caller made up. `SheetLayout.test.ts` holds every combination the records
 * allow to a content area a card could sit in.
 *
 * @example
 * ```ts
 * const sheet = SheetLayout.default().with({ orientation: "landscape" });
 *
 * sheet.widthMillimetres; // 297
 * sheet.capacityFor({ layout: CardLayout.default() }); // 8
 * ```
 */
export class SheetLayout {
  readonly #settings: SheetLayoutSettings;

  constructor(options: { settings: SheetLayoutSettings }) {
    this.#settings = { ...options.settings };
  }

  /** The sheet everything starts on: A4, portrait. */
  static default(): SheetLayout {
    return new SheetLayout({
      settings: {
        size: DEFAULT_PAGE_SIZE,
        orientation: DEFAULT_PAGE_ORIENTATION,
      },
    });
  }

  /** The underlying record, as it is stored and serialised. */
  get settings(): SheetLayoutSettings {
    return { ...this.#settings };
  }

  /** The paper this sheet is printed on. */
  get size(): PageSizeName {
    return this.#settings.size;
  }

  /** Which way round that paper goes. */
  get orientation(): PageOrientation {
    return this.#settings.orientation;
  }

  /** How wide the sheet is, the way round it is. */
  get widthMillimetres(): number {
    const { widthMillimetres, heightMillimetres } =
      PAGE_SIZE_PRESETS[this.#settings.size];

    return this.#isPortrait ? widthMillimetres : heightMillimetres;
  }

  /** How tall the sheet is, the way round it is. */
  get heightMillimetres(): number {
    const { widthMillimetres, heightMillimetres } =
      PAGE_SIZE_PRESETS[this.#settings.size];

    return this.#isPortrait ? heightMillimetres : widthMillimetres;
  }

  /**
   * How much blank is kept inside each edge.
   *
   * A property of the paper rather than a preference, because it is whatever
   * the grid does not need and the two papers have different amounts spare.
   */
  get marginMillimetres(): number {
    return PAGE_SIZE_PRESETS[this.#settings.size].marginMillimetres;
  }

  /** The blank between two cards on this sheet. */
  get cardGapMillimetres(): number {
    return CARD_GAP_MILLIMETRES;
  }

  /** How wide the area inside the margins is, which is what cards fill. */
  get contentWidthMillimetres(): number {
    return this.widthMillimetres - 2 * this.marginMillimetres;
  }

  /** How tall the area inside the margins is, which is what cards fill. */
  get contentHeightMillimetres(): number {
    return this.heightMillimetres - 2 * this.marginMillimetres;
  }

  /** Whether the paper is the way round it is published. */
  get #isPortrait(): boolean {
    return this.#settings.orientation === "portrait";
  }

  /**
   * How many cards of `layout` this sheet holds.
   *
   * Zero for a card too large to be cut from the paper at all. The answer
   * moves on its own when the paper, the way round it goes or the card size
   * does, which is what makes a sheet reflow rather than spill.
   *
   * @example
   * ```ts
   * SheetLayout.default().capacityFor({ layout: CardLayout.default() }); // 9
   * ```
   */
  capacityFor(options: { layout: CardLayout }): number {
    const rows = SheetLayout.#countAcross({
      availableMillimetres: this.contentHeightMillimetres,
      cardMillimetres: options.layout.heightMillimetres,
    });

    return this.columnsFor(options) * rows;
  }

  /** How many cards of `layout` fit across this sheet. */
  columnsFor(options: { layout: CardLayout }): number {
    return SheetLayout.#countAcross({
      availableMillimetres: this.contentWidthMillimetres,
      cardMillimetres: options.layout.widthMillimetres,
    });
  }

  /**
   * How far in from the margin the grid of `layout` starts, so that the blank
   * the last column does not use is split between the two edges.
   *
   * A grid is columns wide, not content wide: at the standard size on A4 the
   * three columns come to 193mm inside 194mm of content, and that leftover
   * millimetre has to go somewhere. Inset the whole grid rather than centring
   * each row, because a row centred on its own no longer lines up with the one
   * above it, and the sheet is going to be cut along those columns.
   *
   * Zero when nothing fits across, which is the only honest answer for a grid
   * that does not exist.
   *
   * @example
   * ```ts
   * SheetLayout.default().gridInsetMillimetres({
   *   layout: CardLayout.default(),
   * }); // 0.5
   * ```
   */
  gridInsetMillimetres(options: { layout: CardLayout }): number {
    const columns = this.columnsFor(options);

    if (columns === 0) {
      return 0;
    }

    const gridWidth =
      columns * options.layout.widthMillimetres +
      (columns - 1) * CARD_GAP_MILLIMETRES;

    return (this.contentWidthMillimetres - gridWidth) / 2;
  }

  /**
   * The entries from `items` that this sheet holds, in reading order.
   *
   * Counted in cards rather than in entries, because an entry whose text will
   * not fit runs onto a continuation and takes a second slot with it. How many
   * cards an entry became is only known once something has measured it, so an
   * entry nothing has measured yet is counted as the one card it is at least.
   * A count only ever grows from there, which means the run that fits only
   * ever gets shorter and a consumer filling a sheet settles rather than
   * flickering between two answers.
   *
   * Stops at the first entry that will not fit rather than stepping over it
   * for a smaller one behind, so the sheet keeps the order it was given.
   *
   * @example
   * ```ts
   * SheetLayout.default().fill({
   *   items: cards,
   *   layout: CardLayout.default(),
   *   faceCounts: new Map([["alter-self", 2]]),
   * }); // the eight entries that make nine cards
   * ```
   */
  fill<Item extends SheetItem>(
    options: SheetFillOptions<Item>,
  ): readonly Item[] {
    const capacity = this.capacityFor({ layout: options.layout });
    const fitting: Item[] = [];
    let used = 0;

    for (const item of options.items) {
      const faces = options.faceCounts.get(item.id) ?? 1;

      if (used + faces > capacity) {
        break;
      }

      used += faces;
      fitting.push(item);
    }

    return fitting;
  }

  /**
   * How many cards of a given width fit across a given run of paper.
   *
   * `count` cards carry `count - 1` gaps between them, so a gap is added to
   * both sides of the division and the one the last card does not need falls
   * away.
   */
  static #countAcross(options: {
    availableMillimetres: number;
    cardMillimetres: number;
  }): number {
    const fits = Math.floor(
      (options.availableMillimetres + CARD_GAP_MILLIMETRES) /
        (options.cardMillimetres + CARD_GAP_MILLIMETRES),
    );

    return Math.max(0, fits);
  }

  /**
   * The sheet this one becomes when `overrides` are applied. Anything left out
   * keeps the value it had.
   */
  with(overrides: SheetLayoutOverrides): SheetLayout {
    return new SheetLayout({
      settings: { ...this.#settings, ...overrides },
    });
  }
}
