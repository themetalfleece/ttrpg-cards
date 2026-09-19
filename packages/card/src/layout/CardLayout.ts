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
