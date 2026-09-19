import {
  Value,
  type ValidationIssue,
  describeIssues,
  issuesAgainst,
} from "@ttrpg-cards/validator";

import {
  CARD_LAYOUT_PRESETS,
  DEFAULT_CARD_LAYOUT_PRESET,
} from "./layout.constants";
import { CardLayoutSettingsSchema } from "./layout.schemas";
import type {
  CardFontSizeRange,
  CardLayoutOverrides,
  CardLayoutPresetName,
  CardLayoutSettings,
  CardMargins,
  CardSize,
} from "./layout.types";

/** What input has failed to be, for an error message. */
const LAYOUT_SUBJECT = "card layout";

/**
 * How close the fitting search gets before it stops halving, and the grid the
 * answer is rounded down to. Both in millimetres, and the same number: there is
 * no point searching finer than the precision the answer is given at.
 */
const FIT_PRECISION_MILLIMETRES = 0.01;

/**
 * The ceiling on halvings, so a predicate that misbehaves cannot spin. A
 * generous range needs about nine to reach the precision above, and each one
 * costs the caller a measurement.
 */
const FIT_MAXIMUM_STEPS = 20;

/**
 * The geometry a card is laid out at, and the values derived from it.
 *
 * Immutable: a different size is a new layout derived with
 * {@link CardLayout.with}, never a mutation. Every instance is valid, so a
 * consumer reading the geometry never has to check it. See README.md for why.
 */
export class CardLayout {
  readonly #settings: CardLayoutSettings;

  /**
   * Holds `settings` to its invariants and copies it, throwing a `TypeError`
   * when the geometry is not usable.
   */
  constructor(options: { settings: CardLayoutSettings }) {
    const issues = CardLayout.validate(options.settings);

    if (issues.length > 0) {
      throw new TypeError(
        describeIssues({
          issues,
          subject: LAYOUT_SUBJECT,
        }),
      );
    }

    this.#settings = structuredClone(options.settings);
  }

  /** The layout everything starts at, the standard card size. */
  static default(): CardLayout {
    return CardLayout.fromPreset({});
  }

  /** A named size, with any part of it overridden. */
  static fromPreset(options: {
    preset?: CardLayoutPresetName;
    overrides?: CardLayoutOverrides;
  }): CardLayout {
    const preset =
      CARD_LAYOUT_PRESETS[
        options.preset ?? DEFAULT_CARD_LAYOUT_PRESET
      ];

    return new CardLayout({
      settings: CardLayout.#merged({
        base: preset,
        overrides: options.overrides,
      }),
    });
  }

  /**
   * Builds a layout from untrusted input, such as a stored preference read
   * back, throwing when it is not a usable geometry.
   */
  static from(value: unknown): CardLayout {
    if (CardLayout.isCardLayoutSettings(value)) {
      return new CardLayout({ settings: value });
    }

    throw new TypeError(
      describeIssues({
        issues: CardLayout.validate(value),
        subject: LAYOUT_SUBJECT,
      }),
    );
  }

  /** Narrows untrusted input, for a boundary that needs only a yes or no. */
  static isCardLayoutSettings(
    value: unknown,
  ): value is CardLayoutSettings {
    return CardLayout.validate(value).length === 0;
  }

  /** Every failure in `value`, empty when it is a usable geometry. */
  static validate(value: unknown): ValidationIssue[] {
    if (!CardLayout.#hasLayoutShape(value)) {
      return issuesAgainst({
        schema: CardLayoutSettingsSchema,
        value,
        pathPrefix: "",
      });
    }

    return CardLayout.#geometryIssues(value);
  }

  /** Whether a value has the shape of a layout, before its geometry is read. */
  static #hasLayoutShape(
    value: unknown,
  ): value is CardLayoutSettings {
    return Value.Check(CardLayoutSettingsSchema, value);
  }

  /**
   * Failures that are relations between fields rather than properties of one,
   * which is why a structural schema cannot state them: a margin is only too
   * wide relative to the card it is on.
   */
  static #geometryIssues(
    settings: CardLayoutSettings,
  ): ValidationIssue[] {
    const { size, margins, fontSizeRange } = settings;
    const issues: ValidationIssue[] = [];

    const sideMargins =
      margins.leftMillimetres + margins.rightMillimetres;
    if (sideMargins >= size.widthMillimetres) {
      issues.push({
        path: "/margins",
        message: `must leave room across the card: ${CardLayout.#millimetres(sideMargins)} of left and right margin on a card ${CardLayout.#millimetres(size.widthMillimetres)} wide`,
      });
    }

    const endMargins =
      margins.topMillimetres + margins.bottomMillimetres;
    if (endMargins >= size.heightMillimetres) {
      issues.push({
        path: "/margins",
        message: `must leave room down the card: ${CardLayout.#millimetres(endMargins)} of top and bottom margin on a card ${CardLayout.#millimetres(size.heightMillimetres)} tall`,
      });
    }

    if (
      fontSizeRange.minimumMillimetres >
      fontSizeRange.maximumMillimetres
    ) {
      issues.push({
        path: "/fontSizeRange",
        message: `must run from the smallest size upwards: a minimum of ${CardLayout.#millimetres(fontSizeRange.minimumMillimetres)} is above the maximum of ${CardLayout.#millimetres(fontSizeRange.maximumMillimetres)}`,
      });
    }

    return issues;
  }

  /** A layout with `overrides` applied over `base`, field by field. */
  static #merged(options: {
    base: CardLayoutSettings;
    overrides: CardLayoutOverrides | undefined;
  }): CardLayoutSettings {
    const overrides = options.overrides ?? {};

    return {
      size: { ...options.base.size, ...overrides.size },
      margins: { ...options.base.margins, ...overrides.margins },
      fontSizeRange: {
        ...options.base.fontSizeRange,
        ...overrides.fontSizeRange,
      },
    };
  }

  /** A measurement as it reads in an error message. */
  static #millimetres(value: number): string {
    return `${value} mm`;
  }

  /**
   * The underlying record, as it is stored and serialised. A copy, so a
   * consumer that keeps it cannot change the layout others are reading.
   */
  get settings(): CardLayoutSettings {
    return structuredClone(this.#settings);
  }

  /** The card's own dimensions. */
  get size(): Readonly<CardSize> {
    return this.#settings.size;
  }

  /** The blank kept inside each edge. */
  get margins(): Readonly<CardMargins> {
    return this.#settings.margins;
  }

  /** The band body text may be scaled within. */
  get fontSizeRange(): Readonly<CardFontSizeRange> {
    return this.#settings.fontSizeRange;
  }

  /** How wide the card is. */
  get widthMillimetres(): number {
    return this.#settings.size.widthMillimetres;
  }

  /** How tall the card is. */
  get heightMillimetres(): number {
    return this.#settings.size.heightMillimetres;
  }

  /** How wide the area inside the margins is, which is what content fills. */
  get contentWidthMillimetres(): number {
    const { leftMillimetres, rightMillimetres } =
      this.#settings.margins;

    return this.widthMillimetres - leftMillimetres - rightMillimetres;
  }

  /** How tall the area inside the margins is, which is what content fills. */
  get contentHeightMillimetres(): number {
    const { topMillimetres, bottomMillimetres } =
      this.#settings.margins;

    return (
      this.heightMillimetres - topMillimetres - bottomMillimetres
    );
  }

  /**
   * The largest size in this layout's range that `fits` accepts.
   *
   * The fitting routine, and deliberately not a rendering concern: it knows
   * the range and nothing about what is being measured, so a caller decides
   * what fitting means by answering one question about one candidate size.
   *
   * `fits` has to be monotonic, meaning a size that fits implies every smaller
   * size fits. That holds for text in a fixed box, which is what this is for.
   * The search halves the range rather than stepping through it, so a caller
   * that measures the browser pays about nine measurements instead of one per
   * step on the way down.
   *
   * Returns the minimum when nothing in the range fits. Below it the answer is
   * a second card rather than smaller text, which is not this routine's call.
   *
   * @example
   * ```ts
   * const layout = CardLayout.default().with({
   *   fontSizeRange: { minimumMillimetres: 2, maximumMillimetres: 4 },
   * });
   *
   * layout.fittedFontSize({ fits: () => true }); // 4
   * layout.fittedFontSize({ fits: () => false }); // 2
   * layout.fittedFontSize({ fits: (size) => size <= 3 }); // 3
   * ```
   */
  fittedFontSize(options: {
    fits: (fontSizeMillimetres: number) => boolean;
  }): number {
    const { minimumMillimetres, maximumMillimetres } =
      this.#settings.fontSizeRange;

    if (options.fits(maximumMillimetres)) {
      return maximumMillimetres;
    }

    let smallest = minimumMillimetres;
    let largest = maximumMillimetres;
    let best = minimumMillimetres;

    for (let step = 0; step < FIT_MAXIMUM_STEPS; step += 1) {
      if (largest - smallest <= FIT_PRECISION_MILLIMETRES) {
        break;
      }

      const candidate = (smallest + largest) / 2;

      if (options.fits(candidate)) {
        best = candidate;
        smallest = candidate;
        continue;
      }

      largest = candidate;
    }

    return CardLayout.#roundedDownToPrecision(best);
  }

  /**
   * A size on the precision grid, rounded down so the answer still fits. The
   * search bisects, so without this it reports sizes to fifteen decimal places.
   */
  static #roundedDownToPrecision(value: number): number {
    // 1.13 / 0.01 is 112.99999999999999 in binary floating point, and flooring
    // that drops a whole step, so the quotient is settled before it is floored.
    const steps = Math.floor(
      Number((value / FIT_PRECISION_MILLIMETRES).toFixed(6)),
    );

    return Math.round(steps * FIT_PRECISION_MILLIMETRES * 100) / 100;
  }

  /**
   * The layout this one becomes when `overrides` are applied, validated the
   * same way as any other. Anything left out keeps the value it had.
   */
  with(overrides: CardLayoutOverrides): CardLayout {
    return new CardLayout({
      settings: CardLayout.#merged({
        base: this.#settings,
        overrides,
      }),
    });
  }
}
