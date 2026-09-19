/**
 * What separates a card's id from the number of the continuation carrying the
 * rest of it, so `hollow-lantern` overflows onto `hollow-lantern~2`. An
 * unreserved URL character, so every card of a set stays addressable.
 */
export const CONTINUATION_ID_SEPARATOR = "~";

/**
 * The most cards one entry may be split across.
 *
 * A predicate that answers "no" to everything would otherwise divide a card
 * down to single words and produce a set nobody asked for. Past this the rest
 * of the text goes on the last card and overflows it, which is at least
 * visible to whoever is looking at it.
 */
export const MAXIMUM_CARDS_PER_SET = 12;
