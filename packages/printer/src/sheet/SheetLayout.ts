import type { CardLayout } from "@ttrpg-cards/card";
import { snapToRange, type Dimensions } from "@ttrpg-cards/core";

import {
  CARD_GAP_MILLIMETRES,
  CUSTOM_PAGE_SIDE_RANGE,
  CUSTOM_PAGE_SIZE,
  DEFAULT_CUSTOM_PAGE_SIZE,
  DEFAULT_CUT_GUIDES,
  DEFAULT_FLIP_EDGE,
  DEFAULT_PAGE_ORIENTATION,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PRINT_SIDES,
  PAGE_SIZE_PRESETS,
  PRINTER_SAFE_MARGIN_MILLIMETRES,
} from "./sheet.constants";
import type {
  CutGuidesName,
  DuplexSlot,
  FlipEdgeName,
  MirrorAxis,
  PageOrientation,
  PagePreset,
  PageSizeName,
  PrintSidesName,
  SheetItem,
  SheetLayoutOverrides,
  SheetLayoutSettings,
  SheetPackingOptions,
  SheetPage,
  SheetSlot,
} from "./sheet.types";

/**
 * The sheet cards are laid out on: the paper, the way round it goes, the margin
 * kept inside its edges, and how the job is printed on it.
 *
 * Immutable, like the card layout it sits beside: a different paper is a new
 * sheet derived with {@link SheetLayout.with}, never a mutation. Several
 * consumers lay out against the same sheet at once, and a renderer needs the
 * new identity to re-run anyway.
 *
 * Every choice is a name from a closed set, with one exception: the custom
 * paper's dimensions, which the reader types. Those are the only thing here
 * that can be wrong, so they are the only thing checked, and they are checked
 * once, on the way in. Everything past the constructor reads a resolved paper
 * and never learns which kind it got. `SheetLayout.test.ts` holds every
 * combination the records allow to a content area a card could sit in.
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
  /**
   * The paper as measurements, whichever kind was named.
   *
   * Resolved once here so that nothing below has to ask again, which is what
   * keeps the custom paper from reaching the layout as a special case.
   */
  readonly #paper: PagePreset;

  constructor(options: { settings: SheetLayoutSettings }) {
    const custom = SheetLayout.#usableCustomPaper(
      options.settings.custom,
    );

    this.#settings = { ...options.settings, custom };
    this.#paper = SheetLayout.#paperFor({
      size: options.settings.size,
      custom,
    });
  }

  /** The sheet everything starts on: A4, portrait, printed one side. */
  static default(): SheetLayout {
    return new SheetLayout({
      settings: {
        size: DEFAULT_PAGE_SIZE,
        custom: DEFAULT_CUSTOM_PAGE_SIZE,
        orientation: DEFAULT_PAGE_ORIENTATION,
        sides: DEFAULT_PRINT_SIDES,
        flipEdge: DEFAULT_FLIP_EDGE,
        cutGuides: DEFAULT_CUT_GUIDES,
      },
    });
  }

  /**
   * The reader's paper held to what a sheet can be, so a measurement nobody
   * checked never reaches a layout or a `@page` rule.
   *
   * Snapped as well as clamped, because the number comes from a field rather
   * than a slider: a paper stated to more places than the range is set at
   * would print as text no printer needs and no reader typed.
   */
  static #usableCustomPaper(custom: Dimensions): Dimensions {
    return {
      widthMillimetres: snapToRange({
        value: custom.widthMillimetres,
        range: CUSTOM_PAGE_SIDE_RANGE,
      }),
      heightMillimetres: snapToRange({
        value: custom.heightMillimetres,
        range: CUSTOM_PAGE_SIDE_RANGE,
      }),
    };
  }

  /**
   * The named paper as a preset: a published one straight from the record, the
   * reader's own with the margin no printer can print inside.
   */
  static #paperFor(options: {
    size: PageSizeName;
    custom: Dimensions;
  }): PagePreset {
    if (options.size === CUSTOM_PAGE_SIZE) {
      return {
        ...options.custom,
        marginMillimetres: PRINTER_SAFE_MARGIN_MILLIMETRES,
      };
    }

    return PAGE_SIZE_PRESETS[options.size];
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

  /** How many sides of it the job prints on. */
  get sides(): PrintSidesName {
    return this.#settings.sides;
  }

  /** The edge the printer turns it about between one side and the other. */
  get flipEdge(): FlipEdgeName {
    return this.#settings.flipEdge;
  }

  /**
   * Whether a continuation prints on the back of the slot its first card is
   * on, which is what makes an entry one double sided card.
   */
  get duplex(): boolean {
    return this.#settings.sides === "double";
  }

  /** The measurements the reader gave the custom paper, whichever is picked. */
  get customMillimetres(): Dimensions {
    return { ...this.#settings.custom };
  }

  /** How wide the sheet is, the way round it is. */
  get widthMillimetres(): number {
    const { widthMillimetres, heightMillimetres } = this.#paper;

    return this.#isPortrait ? widthMillimetres : heightMillimetres;
  }

  /** How tall the sheet is, the way round it is. */
  get heightMillimetres(): number {
    const { widthMillimetres, heightMillimetres } = this.#paper;

    return this.#isPortrait ? heightMillimetres : widthMillimetres;
  }

  /**
   * How much blank is kept inside each edge.
   *
   * A property of the paper rather than a preference, because it is whatever
   * the grid does not need and no two papers have the same amount spare. A
   * published one carries the number that arithmetic came to; a custom one
   * gets the printer's unprintable edge, which is all that can be known about
   * a paper nobody worked a grid out for.
   */
  get marginMillimetres(): number {
    return this.#paper.marginMillimetres;
  }

  /** The blank between two cards on this sheet. */
  get cardGapMillimetres(): number {
    return CARD_GAP_MILLIMETRES;
  }

  /** Whether the sheet carries the marks a blade is lined up against. */
  get cutGuides(): CutGuidesName {
    return this.#settings.cutGuides;
  }

  /**
   * How far a cut guide reaches out from the edge of a card, or zero when the
   * sheet carries none.
   *
   * A measurement rather than a flag, so nothing drawing a sheet has to ask
   * whether the guides are on: it lays them out at whatever reach it is given
   * and a reach of nothing draws nothing. The same trick as the row inset,
   * which is zero on a sheet printed one side.
   *
   * On, it is the gap between two cards exactly, so two neighbours' marks
   * meet and the cut line runs unbroken across the blank between them. At the
   * edge of the grid the same reach goes into the margin, which every paper
   * keeps wider than the gap, so a mark is never put where a printer cannot
   * draw one.
   *
   * @example
   * ```ts
   * SheetLayout.default().cutGuideReachMillimetres; // 0
   * SheetLayout.default().with({ cutGuides: "on" })
   *   .cutGuideReachMillimetres; // 2
   * ```
   */
  get cutGuideReachMillimetres(): number {
    return this.#settings.cutGuides === "on"
      ? CARD_GAP_MILLIMETRES
      : 0;
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
    return this.columnsFor(options) * this.rowsFor(options);
  }

  /** How many cards of `layout` fit across this sheet. */
  columnsFor(options: { layout: CardLayout }): number {
    return SheetLayout.#countAcross({
      availableMillimetres: this.contentWidthMillimetres,
      cardMillimetres: options.layout.widthMillimetres,
    });
  }

  /** How many rows of `layout` fit down this sheet. */
  rowsFor(options: { layout: CardLayout }): number {
    return SheetLayout.#countAcross({
      availableMillimetres: this.contentHeightMillimetres,
      cardMillimetres: options.layout.heightMillimetres,
    });
  }

  /**
   * The grid axis a back page reverses.
   *
   * A sheet turns about the axis its flip edge runs along, so a long edge flip
   * reverses the columns on portrait paper and the rows on landscape. Read off
   * the paper the way round it actually is, rather than assumed, because which
   * edge is the long one is the reader's to change.
   *
   * @example
   * ```ts
   * SheetLayout.default().mirrorAxis; // "columns"
   * SheetLayout.default().with({ orientation: "landscape" }).mirrorAxis; // "rows"
   * ```
   */
  get mirrorAxis(): MirrorAxis {
    const longEdgeIsVertical =
      this.heightMillimetres >= this.widthMillimetres;
    const turnsAboutVerticalAxis =
      this.#settings.flipEdge === "long-edge"
        ? longEdgeIsVertical
        : !longEdgeIsVertical;

    return turnsAboutVerticalAxis ? "columns" : "rows";
  }

  /**
   * The slot on the back of the sheet that lands behind `slot` on the front.
   *
   * Its own inverse, because turning the sheet back over is the same turn, so
   * the mirror of the mirror is where you started.
   *
   * A sheet with no room for a card has no slot to mirror into, so it hands
   * back what it was given.
   *
   * @example
   * ```ts
   * SheetLayout.default().mirrorSlot({
   *   slot: 0,
   *   layout: CardLayout.default(),
   * }); // 2
   * ```
   */
  mirrorSlot(options: { slot: number; layout: CardLayout }): number {
    const columns = this.columnsFor(options);
    const rows = this.rowsFor(options);

    if (columns === 0 || rows === 0) {
      return options.slot;
    }

    const row = Math.floor(options.slot / columns);
    const column = options.slot % columns;

    if (this.mirrorAxis === "columns") {
      return row * columns + (columns - 1 - column);
    }

    return (rows - 1 - row) * columns + column;
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
   * How far down from the margin the grid of `layout` starts, so that the
   * blank the last row does not use is split between the two edges.
   *
   * The same arithmetic as {@link SheetLayout.gridInsetMillimetres}, down the
   * sheet rather than across it, and it exists for a stronger reason than
   * tidiness: {@link SheetLayout.mirrorSlot} maps a front slot to a back one
   * by grid index, and that index is the physically right place only if the
   * grid is centred on the axis being reversed. Left to trail under the last
   * row, the whole vertical leftover offsets every back from its front, which
   * on A4 landscape at the standard size is 16mm on an 88mm card.
   *
   * Plain geometry rather than a mode: whether a sheet wants the row centred
   * is the consumer's question, and printing on one side has nothing to
   * register against.
   *
   * Zero when no row fits, which is the only honest answer for a grid that
   * does not exist.
   *
   * @example
   * ```ts
   * SheetLayout.default().gridRowInsetMillimetres({
   *   layout: CardLayout.default(),
   * }); // 6.5
   * ```
   */
  gridRowInsetMillimetres(options: { layout: CardLayout }): number {
    const rows = this.rowsFor(options);

    if (rows === 0) {
      return 0;
    }

    const gridHeight =
      rows * options.layout.heightMillimetres +
      (rows - 1) * CARD_GAP_MILLIMETRES;

    return (this.contentHeightMillimetres - gridHeight) / 2;
  }

  /**
   * Every card laid out across as many sheets as they need, in reading order.
   *
   * Counted in cards rather than in entries, because an entry whose text will
   * not fit runs onto a continuation and takes a second slot with it. How many
   * cards an entry became is only known once something has measured it, so an
   * entry nothing has measured yet is counted as the one card it is at least.
   *
   * A sheet is only left before it is full when the cards run out. An entry
   * whose cards will not all fit in what is left puts as many as do there and
   * carries the rest to the next sheet, so no slot is ever held open for a
   * card that could not use it. The alternative keeps an entry's cards
   * together and pays a hole in the sheet for it, which is paper spent to
   * preserve an adjacency that does not survive the scissors: the cards are
   * cut apart before anybody reads them.
   *
   * An entry needing more cards than a whole sheet holds simply runs across as
   * many as it needs, filling each.
   *
   * A sheet with no room for a card at all paginates to nothing, so a caller
   * that gets no sheets back for cards it handed over knows the paper and the
   * card size cannot be reconciled.
   *
   * Printed on both sides this all changes, because the question changes: a
   * continuation goes on the back of its first card's own slot rather than in
   * the next slot along, so one cut gives a card carrying the whole entry.
   * Pages then come in front and back pairs, every card sits at a stated slot
   * rather than wherever the flow puts it, and entries needing more than one
   * card are laid out first. See `#paginateBothSides`.
   *
   * @example
   * ```ts
   * SheetLayout.default().paginate({
   *   items: cards,
   *   layout: CardLayout.default(),
   *   faceCounts: new Map([["alter-self", 2]]),
   * }); // [{ number: 1, side: undefined, slots: [...] }, ...]
   * ```
   */
  paginate<Item extends SheetItem>(
    options: SheetPackingOptions<Item>,
  ): readonly SheetPage<Item>[] {
    const capacity = this.capacityFor({ layout: options.layout });

    // No room for a single card means there is no arrangement of these cards
    // on this paper at all. Walking anyway would hand back one overflowing
    // sheet per entry, which is a worse answer than none: a consumer can say
    // the one thing that is true and name what to change.
    if (capacity === 0) {
      return [];
    }

    if (this.duplex) {
      return this.#paginateBothSides({ packing: options, capacity });
    }

    return SheetLayout.#paginateOneSide({
      packing: options,
      capacity,
    });
  }

  /**
   * The pages of a job printed on one side: one page per sheet, cards in
   * reading order, each sheet left short only when the cards run out.
   */
  static #paginateOneSide<Item extends SheetItem>(options: {
    packing: SheetPackingOptions<Item>;
    capacity: number;
  }): readonly SheetPage<Item>[] {
    const pages: SheetPage<Item>[] = [];
    let slots: SheetSlot<Item>[] = [];
    let used = 0;

    const finish = () => {
      pages.push({
        number: pages.length + 1,
        side: undefined,
        slots,
      });
      slots = [];
      used = 0;
    };

    for (const item of options.packing.items) {
      const faces = options.packing.faceCounts.get(item.id) ?? 1;
      let placed = 0;

      while (placed < faces) {
        if (used === options.capacity) {
          finish();
        }

        const taken = Math.min(
          options.capacity - used,
          faces - placed,
        );

        slots.push({ item, from: placed, count: taken, index: used });
        placed += taken;
        used += taken;
      }
    }

    if (slots.length > 0) {
      finish();
    }

    return pages;
  }

  /**
   * The pages of a job printed on both sides, always in front and back pairs.
   *
   * Every front page is followed by exactly one back page, even when that back
   * carries nothing. A page a driver never puts out shifts every pairing after
   * it, which ruins a whole print run rather than one card, so the blank one is
   * emitted and the reader is told to stop their driver skipping it.
   */
  #paginateBothSides<Item extends SheetItem>(options: {
    packing: SheetPackingOptions<Item>;
    capacity: number;
  }): readonly SheetPage<Item>[] {
    const slots = SheetLayout.#slotsFor(options.packing);
    const pages: SheetPage<Item>[] = [];

    for (
      let start = 0;
      start < slots.length;
      start += options.capacity
    ) {
      const sheet = slots.slice(start, start + options.capacity);
      const number = start / options.capacity + 1;
      const fronts: SheetSlot<Item>[] = [];
      const backs: SheetSlot<Item>[] = [];

      for (const [index, slot] of sheet.entries()) {
        fronts.push({ ...slot.front, index });

        if (slot.back !== undefined) {
          backs.push({
            ...slot.back,
            index: this.mirrorSlot({
              slot: index,
              layout: options.packing.layout,
            }),
          });
        }
      }

      // The mirror is not reading order, so the backs are put back into it.
      backs.sort((one, other) => one.index - other.index);

      pages.push({ number, side: "front", slots: fronts });
      pages.push({ number, side: "back", slots: backs });
    }

    return pages;
  }

  /**
   * The slots a two sided job fills, in the order it fills them.
   *
   * Odd numbered cards take a front and even numbered ones the back of the
   * slot the card before them is on, so a two card entry is one slot and a
   * three card entry is two with the second back left blank.
   *
   * Entries needing more than one card are laid out first, which gathers every
   * blank back at the tail of the run rather than scattering them through it.
   * That is worth having because a driver still set to skip blank pages then
   * drops only trailing pages, with nothing filled after them to be shifted
   * onto the wrong front, so the run comes out correct instead of ruined. It
   * saves no paper: how many pages a job takes is the sum of the slots however
   * they are ordered. The order on the page changes; the order the reader put
   * the entries in does not.
   *
   * The partition is redone as counts arrive, so each entry that turns out to
   * need a second card jumps ahead of the ones before it and they are laid out
   * again, which remounts and re-measures them.
   */
  static #slotsFor<Item extends SheetItem>(
    packing: SheetPackingOptions<Item>,
  ): readonly DuplexSlot<Item>[] {
    const faceCountOf = (item: Item) =>
      packing.faceCounts.get(item.id) ?? 1;
    const continued = packing.items.filter(
      (item) => faceCountOf(item) > 1,
    );
    const rest = packing.items.filter(
      (item) => faceCountOf(item) <= 1,
    );
    const slots: DuplexSlot<Item>[] = [];

    for (const item of [...continued, ...rest]) {
      const faces = faceCountOf(item);

      for (let from = 0; from < faces; from += 2) {
        const continuation = from + 1;

        slots.push({
          front: { item, from, count: 1 },
          back:
            continuation < faces
              ? { item, from: continuation, count: 1 }
              : undefined,
        });
      }
    }

    return slots;
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
