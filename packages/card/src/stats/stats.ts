import { RichText } from "@ttrpg-cards/text";

import {
  CARD_BLOCK_KINDS,
  type Card,
  type CardBlock,
  type CardMetaField,
} from "../card";
import {
  HELD_DURATION_OPENING,
  HELD_DURATION_PREFIX,
  LIFTED_BLOCK_LABELS,
  MAXIMUM_PARENTHETICAL_WORDS,
  PROSE_BRACKET_LABELS,
  SHORTENED_VALUES,
  TRAILING_PARENTHETICAL,
} from "./stats.constants";
import type { LiftedParenthetical } from "./stats.types";

/**
 * A card with its stat block set as a card face can hold it.
 *
 * This is the one place the app decides how a stat block reads, and it runs
 * over a card rather than over whatever a source happened to be parsed from.
 * That is what lets the bundled catalog and a document a reader brought share
 * it: both of them build a card that says what their source says, in the
 * wording their source used, and hand it through here. Neither knows the
 * rules, and neither can drift from the other.
 *
 * Two things happen, and both are about a cell being a quarter of a card.
 * A value that is one word too long for its cell is set shorter, because a
 * word wider than its cell breaks in the middle of itself. Prose trailing a
 * value in brackets is lifted to the end of the body, because prose in a cell
 * pushes the strip down the card and spends on a header the room the body
 * wanted.
 *
 * Only a value that is a single unmarked run is touched. Someone who set part
 * of a value in bold meant something by it, and nothing here can carry that
 * through a rewrite.
 *
 * Doing nothing is the common case and gives the same card back, so a card
 * that goes through twice is the card that went through once.
 *
 * @example
 * ```ts
 * const card = cardWithFittedStats({
 *   ...entry,
 *   meta: [{ label: RichText.of("Components"), value: RichText.of("V, S, M (a twig struck by lightning)") }],
 *   body: [],
 * });
 *
 * card.meta[0].value; // [{ text: "V, S, M" }]
 * card.body.at(-1); // { kind: "callout", label: [{ text: "Material" }], text: [...] }
 * ```
 */
export function cardWithFittedStats(card: Card): Card {
  const meta: CardMetaField[] = [];
  const lifted: CardBlock[] = [];
  let rewritten = false;

  for (const field of card.meta) {
    const fitted = fittedField(field);

    meta.push(fitted.field);

    if (fitted.field !== field) {
      rewritten = true;
    }

    if (fitted.lifted !== undefined) {
      lifted.push(fitted.lifted);
    }
  }

  if (!rewritten && lifted.length === 0) {
    return card;
  }

  return { ...card, meta, body: [...card.body, ...lifted] };
}

/** One stat block entry as its cell can hold it, and what that lifted out. */
function fittedField(field: CardMetaField): {
  field: CardMetaField;
  lifted: CardBlock | undefined;
} {
  const written = plainValue(field);

  if (written === undefined) {
    return { field, lifted: undefined };
  }

  const label = RichText.plain(field.label);
  const split = liftedParenthetical(written, { label });
  const value = shortenedStatValue(split.value);

  // Nothing is left for the cell, so there is nothing for the lifted half to
  // qualify. The value stays as it was written.
  if (value === "") {
    return { field, lifted: undefined };
  }

  const fitted =
    value === written
      ? field
      : { label: field.label, value: RichText.of(value) };

  if (split.lifted === undefined) {
    return { field: fitted, lifted: undefined };
  }

  return {
    field: fitted,
    lifted: {
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of(liftedBlockLabel(label)),
      text: RichText.of(split.lifted),
    },
  };
}

/** A field's value as plain text, or nothing when it carries marks to keep. */
function plainValue(field: CardMetaField): string | undefined {
  const [run, ...rest] = field.value;

  if (
    run === undefined ||
    rest.length > 0 ||
    run.marks !== undefined
  ) {
    return undefined;
  }

  return run.text;
}

/**
 * A stat block value as a cell a quarter of a card wide can hold it.
 *
 * Two rewrites and nothing else. A value that is one long word is set shorter,
 * because a word wider than its cell breaks in the middle of itself and no
 * type size fixes that. A duration held rather than fixed is named once, in
 * place of the `up to` that says the same thing again.
 *
 * Everything else comes back exactly as it was written. This runs over a
 * reader's own document as well as over the bundled catalog, so it earns every
 * word it changes.
 *
 * @example
 * ```ts
 * shortenedStatValue("Instantaneous"); // "Instant"
 * shortenedStatValue("Concentration, up to 1 hour"); // "Conc. 1 hour"
 * shortenedStatValue("Until dispelled"); // "Until dispelled"
 * ```
 */
export function shortenedStatValue(value: string): string {
  const trimmed = value.trim();
  const shortened = SHORTENED_VALUES[trimmed];

  if (shortened !== undefined) {
    return shortened;
  }

  if (!HELD_DURATION_OPENING.test(trimmed)) {
    return trimmed;
  }

  const held = trimmed.replace(HELD_DURATION_OPENING, "");

  return `${HELD_DURATION_PREFIX}${held}`;
}

/**
 * A value split from the prose trailing it in brackets, where there is any.
 *
 * `V, S, M (a twig struck by lightning)` is two things written as one: the
 * letters belong in the cell and the twig is a sentence, and a sentence in a
 * cell a quarter of a card wide pushes the strip down the card and takes the
 * room off the body. A short bracket qualifies the value and stays where it
 * is, which is what keeps `(ritual)` beside the thing it describes.
 *
 * Told which field it is reading, it also knows the fields whose bracket names
 * a thing rather than qualifying a value. A material is prose however few
 * words it runs to, so `(a silver pin)` goes to the body with the longer ones.
 *
 * Returns nothing to lift when the value has no bracket, or has one short
 * enough to read as part of the value.
 *
 * @example
 * ```ts
 * liftedParenthetical("V, S, M (a twig struck by lightning)");
 * // { value: "V, S, M", lifted: "A twig struck by lightning." }
 *
 * liftedParenthetical("1 action (ritual)");
 * // { value: "1 action (ritual)", lifted: undefined }
 *
 * liftedParenthetical("S, M (a silver pin)", { label: "Components" });
 * // { value: "S, M", lifted: "A silver pin." }
 * ```
 */
export function liftedParenthetical(
  value: string,
  options: { label?: string } = {},
): LiftedParenthetical {
  const trimmed = value.trim();
  const match = TRAILING_PARENTHETICAL.exec(trimmed);
  const [, head = "", inside = ""] = match ?? [];

  if (match === null || head === "" || inside === "") {
    return { value: trimmed, lifted: undefined };
  }

  const words = inside.split(/\s+/).filter((word) => word !== "");

  if (
    words.length <= MAXIMUM_PARENTHETICAL_WORDS &&
    !bracketIsProse(options.label)
  ) {
    return { value: trimmed, lifted: undefined };
  }

  return { value: head.trim(), lifted: asSentence(inside) };
}

/** Whether a field's bracket names a thing, which is prose at any length. */
function bracketIsProse(label: string | undefined): boolean {
  if (label === undefined) {
    return false;
  }

  return PROSE_BRACKET_LABELS.includes(label.trim().toLowerCase());
}

/** What a block lifted out of a field is called, where that is not the field. */
function liftedBlockLabel(label: string): string {
  return LIFTED_BLOCK_LABELS[label.trim().toLowerCase()] ?? label;
}

/** A lifted bracket as its own sentence, since it is one once it is a block. */
function asSentence(text: string): string {
  const trimmed = text.trim();
  const opened = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

  return /[.!?]$/.test(opened) ? opened : `${opened}.`;
}
