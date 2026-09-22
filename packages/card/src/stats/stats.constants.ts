/**
 * Whole values the stat block sets shorter than a document writes them.
 *
 * A strip cell is a quarter of a card. A value of several words wraps between
 * them and reads fine; one long word has nowhere to wrap, so it breaks in the
 * middle of itself, and no type size the app is willing to set fixes that.
 * Shortening the word is the only thing that does.
 *
 * Keyed on the whole value rather than matched inside one, so a longer value
 * that happens to contain the word is left exactly as it was written.
 */
export const SHORTENED_VALUES: Readonly<Record<string, string>> = {
  Instantaneous: "Instant",
};

/**
 * The opening a value carries when its duration is held rather than fixed, and
 * what it is set as instead.
 *
 * `up to` comes off with it. A held duration is a maximum by definition, which
 * is the whole of what `up to` says, so carrying both spends the narrowest
 * cell on the card saying one thing twice.
 */
export const HELD_DURATION_OPENING =
  /^concentration\s*,?\s*(?:up\s+to\s+)?/i;

/** What a held duration is named by once it has been shortened. */
export const HELD_DURATION_PREFIX = "Conc. ";

/**
 * A trailing parenthetical, and whatever it qualifies ahead of it.
 *
 * Captured rather than stripped, because what is inside it may be prose that
 * belongs in the body while what is outside it is the value the cell is for.
 *
 * Nested brackets are not matched, so a value holding one keeps its whole
 * bracket in the cell rather than being split in the wrong place.
 */
export const TRAILING_PARENTHETICAL = /^(.*?)\s*\(([^()]*)\)\s*$/s;

/**
 * The labels whose bracket names a thing rather than qualifying a value.
 *
 * A components list is letters and then, in brackets, whatever the caster has
 * to be holding. That is an object, not a qualification of the letters, and it
 * reads as prose at any length: `(a silver pin)` is as much a sentence as
 * `(a twig struck by lightning and kept dry since)` and belongs in the same
 * place.
 */
export const PROSE_BRACKET_LABELS: readonly string[] = [
  "components",
  "component",
  "material",
  "materials",
];

/**
 * What a lifted bracket is labelled by, where the field it came from is not
 * what a reader would call it.
 *
 * A bracket lifted out of a components list is the material, and naming it
 * that is how a reader finds it: `Components` is already printed in the cell
 * above, so repeating it over the block says nothing the card does not say.
 * Any other field labels its block with its own label.
 */
export const LIFTED_BLOCK_LABELS: Readonly<Record<string, string>> = {
  components: "Material",
  component: "Material",
};

/**
 * How many words a parenthetical may hold and still sit in a cell.
 *
 * A cell is a few words wide. `(ritual)` or `(30-foot cone)` qualifies the
 * value and belongs beside it; a sentence describing a component is prose,
 * and prose in a cell a quarter of a card wide pushes the strip down the card
 * and takes the room off the body.
 */
export const MAXIMUM_PARENTHETICAL_WORDS = 3;
