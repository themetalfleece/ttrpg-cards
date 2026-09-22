/** What the panel is for, and what each of its controls does. */
export const PANEL_TITLE = "Your own cards";
export const PASTE_LABEL = "Paste Markdown";
export const IMPORT_LABEL = "Add cards";
export const UPLOAD_LABEL = "Upload a file";
export const CLEAR_LABEL = "Clear and show the bundled cards";

/** How many lines of the pasted document are shown at once. */
export const PASTE_ROWS = 6;

/**
 * A card written the plainest way the parser accepts, so a reader can see the
 * shape without being told it. Many other spellings read just as well.
 *
 * Two stat block fields rather than one, because that is what the parser reads
 * as a stat block: a single line holding a colon is a sentence far more often
 * than it is a field, so it stays in the prose. This is the only format
 * guidance on the screen, and a test reads it through the parser so it cannot
 * quietly come to advertise a shape that no longer parses.
 */
export const PASTE_PLACEHOLDER = [
  "## Lantern Ward",
  "",
  "*Level 3 abjuration*",
  "",
  "**Range:** Self",
  "**Duration:** 1 minute",
  "",
  "A ward of steady light closes over you.",
].join("\n");

/**
 * Which files the picker offers first. A reader can choose anything, so this
 * is a convenience rather than a guarantee, and the parser is handed whatever
 * comes back.
 */
export const DOCUMENT_FILE_TYPES = ".md,.markdown,.mdx,.txt";

/** What the reader is told when a file cannot be read off their disk. */
export const UNREADABLE_FILE =
  "That file could not be read. Try opening it and pasting it in instead.";

/** What the reader is told when a document held no cards at all. */
export const NOTHING_READ =
  "Nothing in this document read as a card. A card starts with a heading.";

/** How the panel says how many cards the reader has brought so far. */
export function cardsReadSummary(count: number): string {
  const cards = count === 1 ? "card" : "cards";

  return `Showing ${count} ${cards} you brought. Add another document to keep building the set.`;
}

/**
 * How the panel says the bundled cards are a sample.
 *
 * Named so the reader knows the page is not everything the app ships and that
 * bringing their own is what fills it with what they want.
 */
export function bundledSampleSummary(options: {
  shown: number;
  total: number;
}): string {
  return `Showing ${options.shown} of ${options.total} bundled cards as a sample. Add a document of your own to lay out a set instead.`;
}

/** How the panel introduces the parts it could not read. */
export function unreadSummary(count: number): string {
  const parts = count === 1 ? "part" : "parts";

  return `${count} ${parts} did not read as a card:`;
}

/** How one unread part names where it starts. */
export function unreadLine(line: number): string {
  return `Line ${line}:`;
}
