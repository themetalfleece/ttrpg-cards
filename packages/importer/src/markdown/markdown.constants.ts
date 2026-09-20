/**
 * A heading at any level, with a closing run of hashes taken off.
 *
 * Every level, because which one a writer reaches for says nothing: one
 * document gives each card an `h1`, the next nests them three deep under a
 * title, and both mean the same thing.
 */
export const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;

/** A rule drawn across the page, in any of the three ways it is written. */
export const DIVIDER = /^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/;

/** The line a note's front matter opens and closes with. */
export const FRONT_MATTER_FENCE = /^---\s*$/;

/**
 * A key and its value inside front matter. One of these has to be there before
 * an opening rule is read as front matter rather than as a rule.
 */
export const FRONT_MATTER_ENTRY = /^[^\s:#][^:]*:/;

/** How far in a closing front matter rule is still looked for. */
export const FRONT_MATTER_LIMIT = 100;

/** Line endings, normalised so a line number means the same on every platform. */
export const LINE_ENDINGS = /\r\n?/g;

/**
 * A backslash in front of punctuation, which some editors put in front of
 * every marker when text is copied out of them.
 *
 * Resolved away before anything else is read, so a document that arrived
 * escaped is the document it was before it travelled. Only punctuation, which
 * is what an escape may precede, and which is what keeps a layout directive
 * (`\column`) and a hard line break (a backslash at the end of a line) whole.
 *
 * The cost is a document that meant a literal marker and escaped it on
 * purpose, which then reads as a marker. That is much the rarer of the two,
 * and the other way round costs the reader the whole card.
 */
export const ESCAPED_PUNCTUATION = /\\([!-/:-@[-`{-~])/g;

/** A bullet or a number at the start of a line, in any of its spellings. */
export const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/;

/** The marker a quoted aside carries on each of its lines. */
export const QUOTE = /^\s*>\s?/;

/**
 * A directive some editors write to move what follows onto a new page or
 * column. It lays nothing out here, so it is read as the noise it is.
 */
export const LAYOUT_DIRECTIVE = /^\s*\\[a-z]+\s*$/i;

/** A hard line break, which means nothing once a run of lines is joined up. */
export const LINE_BREAK = /(?:\\|\s{2,})$/;

/**
 * A short glyph in square brackets at the end of a heading, which becomes the
 * badge in the corner of the title bar.
 *
 * Nothing in Markdown says "this is a badge", so this is the app's own
 * spelling rather than a convention read off other documents. It is purely
 * additive: a heading without it is a card without a badge.
 */
export const HEADING_BADGE = /^(.*?)\s*\[([^[\]]{1,4})\]$/;

/** A label wrapped in markers, and whatever follows it on the line. */
export const MARKED_LABEL =
  /^(?<marker>\*{1,3}|_{1,3})(?<label>\S[\s\S]*?)(?<=\S)\k<marker>\s*(?<rest>[\s\S]*)$/;

/**
 * A label written with no markers at all, which is read as one only in a
 * card's opening lines. Kept short and free of sentence punctuation, so a line
 * of prose holding a colon is not mistaken for a field.
 */
export const BARE_LABEL =
  /^(?<label>[^:*_`[\]]{1,32}):[ \t]+(?<value>\S[\s\S]*)$/;

/** A colon at the end of a label, which may be written inside the markers. */
export const TRAILING_COLON = /\s*:\s*$/;

/** A colon at the start of a value, which is where the other half write it. */
export const LEADING_COLON = /^\s*:\s*/;

/** Punctuation that ends a sentence, which a field's label never does. */
export const SENTENCE_END = /[.!?,;]$/;

/**
 * A label written as a title: every word opens with a capital or a digit,
 * apart from a short particle standing between two that do.
 *
 * This is one of the two signals that tell an unmarked field from a line of
 * prose holding a colon. A stat block label is `Casting Time` or `Area of
 * Effect`; a wrapped sentence opens on whatever word it wrapped onto, `The
 * light dims`.
 *
 * The lookahead is what keeps a particle from being the last word, which is
 * the whole of the difference between `Area of Effect` and `It is so`. The
 * cost is a clause that happens to close on a capital, `It was a Test`, which
 * reads as a title.
 */
export const TITLE_CASE_LABEL =
  /^[\p{Lu}\p{N}]\S*(?:\s+(?:[\p{Lu}\p{N}]\S*|\p{Ll}{1,3}(?=\s)))*$/u;

/** What separates a bold lead-in from the text it introduces. */
export const LEAD_IN_PUNCTUATION = /[.:]+$/;

/**
 * Sentence punctuation anywhere in a span, which a classification never has.
 *
 * A classification lists things (`Sentinel, Lampwright`); it does not say
 * anything. That is what keeps a card closing on `**Failed Save:** the target
 * drops.` out of the entries along the bottom rule.
 */
export const SENTENCE_PUNCTUATION = /[.!?]/;

/** The number in a word, wherever in it the word puts it. */
export const RANK_NUMBER = /\d+/;

/**
 * How many words an opening line may hold and still read as a rank.
 *
 * A line that states a rank and a category is short (`Level 3 Abjuration`,
 * `3rd-level abjuration`). Anything longer is a sentence about the card, and a
 * number in it is part of what it is saying rather than a rank.
 */
export const RANK_LINE_MAX_WORDS = 4;

/** How far into the line the number may be and still be the rank. */
export const RANK_NUMBER_WITHIN = 2;

/**
 * A word that closes a list item, so whatever follows it is a second thing
 * rather than a continuation of the first.
 *
 * A rank line runs rank then category, `Level 3 Abjuration`. A line that opens
 * on a category and then measures something, `Rare, 500 coins`, is the same
 * length and has its number in the same place, and the comma is what tells
 * the two apart.
 */
export const LIST_BREAK = /[,;]$/;

/** Whitespace between words, for reading a line a word at a time. */
export const WORD_GAP = /\s+/;

/** What a trailing classification line is divided into entries on. */
export const FOOTER_SEPARATOR = /\s*[·|]\s*/;

/** Anything that is not part of an identifier, for building one from a name. */
export const NON_SLUG = /[^a-z0-9]+/g;

/** Leading and trailing separators left behind once a name is slugged. */
export const SLUG_EDGES = /^-+|-+$/g;

/**
 * The headings an aside is commonly written under.
 *
 * A quoted block is the general way to mark one, and the way this app writes
 * one back out. These are the phrases people write instead, and a document
 * using them is far more common than one that quotes. Matching is
 * case-insensitive and ignores the punctuation a lead-in ends with.
 *
 * This is the reader's vocabulary rather than the app's: nothing downstream
 * sees these words, and a card built from one is an aside like any other.
 */
export const ASIDE_HEADINGS: readonly string[] = [
  "at higher levels",
  "cantrip upgrade",
  "using a higher-level spell slot",
  "material",
  "variant",
];

/** The prefix every imported card's identifier carries. */
export const IMPORTED_ID_PREFIX = "imported:";

/** What an identifier is built from when a name slugs away to nothing. */
export const FALLBACK_SLUG = "card";

/** What the reader is told about a stretch that did not become a card. */
export const IMPORT_MESSAGES = {
  beforeFirstCard:
    "This text is not under a heading, so there is no card to put it on. Give it a heading.",
  namelessCard: "This heading is empty, so the card has no name.",
  emptyCard:
    "This heading has nothing under it, so there is no card to make.",
  unusableCard: "This card could not be built from what is under it.",
} as const;
