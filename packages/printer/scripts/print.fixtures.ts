/**
 * The entry written to overrun one card, which is the one the mirror is
 * checked on.
 *
 * Named here as well as in the document, because the harness has to find its
 * two halves on two different pages, and a split that stops happening has to
 * fail the run rather than quietly check nothing.
 */
export const CONTINUED_ENTRY_NAME = "Harbour Vigil";

/** The card of that entry that prints on the front of its slot. */
export const CONTINUED_FIRST_POSITION = "1/2";

/** The one that prints on the back of the same slot. */
export const CONTINUED_SECOND_POSITION = "2/2";

/**
 * The long entry, written to run past the bottom of one card at the largest
 * text band and to stop well short of a third.
 *
 * Two paragraphs rather than one, because a cut lands at a block boundary: a
 * single block with nowhere to break goes on whole and overflows instead of
 * splitting, which would check the wrong thing. Each of them is comfortably a
 * card on its own, and the two together comfortably are not, so the split is
 * not a line either side of the edge.
 */
const CONTINUED_ENTRY = [
  `## ${CONTINUED_ENTRY_NAME} [4]`,
  "",
  "*Level 4 warding*",
  "",
  "**Range:** The harbour wall",
  "**Duration:** Until the tide turns twice",
  "",
  "The watchers along the sea wall take up the old count, and the water answers it. For as long as the vigil holds, every boat that comes in past the lamps is seen and named aloud, and nothing that was not named may set a foot on the stones.",
  "",
  "A vigil is kept by four or more, standing where they can see one another. Should any one of them look away from the water for longer than a breath, the count falters and has to be begun again from the first lamp, which costs the watch a full turn of the glass.",
].join("\n");

/**
 * The short entries, which each fit on one card and fill the sheets around the
 * long one.
 *
 * Twelve of them, with the long one making thirteen slots. Nine slots to an A4
 * sheet at the standard card size, so the first sheet is full and the second
 * holds four, and the second sheet's back carries nothing at all. That blank
 * back is a third of what this harness exists to check, so the count is load
 * bearing rather than arbitrary.
 */
const SHORT_ENTRIES: readonly string[] = [
  [
    "## Lamp of the Second Watch [1]",
    "",
    "*Level 1 warding*",
    "",
    "**Range:** Touch",
    "**Duration:** One night",
    "",
    "The wick burns without fuel until dawn, and will not be put out by weather.",
  ].join("\n"),
  [
    "## Rope That Knows Its Knot [1]",
    "",
    "*Level 1 shaping*",
    "",
    "**Range:** Touch",
    "**Duration:** One day",
    "",
    "Tie it once and it holds. Ask it aloud and it unties itself, whoever tied it.",
  ].join("\n"),
  [
    "## Quiet Passage [2]",
    "",
    "*Level 2 shaping*",
    "",
    "**Range:** Self",
    "**Duration:** Ten minutes",
    "",
    "Your footfalls land on the stone without sound, and so does anything you carry.",
  ].join("\n"),
  [
    "## Salt Line [1]",
    "",
    "*Level 1 warding*",
    "",
    "**Range:** Thirty paces",
    "**Duration:** Until swept",
    "",
    "Nothing that was called up by name crosses the line while it stays unbroken.",
  ].join("\n"),
  [
    "## Reading of the Hull [2]",
    "",
    "*Level 2 knowing*",
    "",
    "**Range:** Touch",
    "**Duration:** Instant",
    "",
    "You learn where a boat has been since it was last out of the water, and what it carried.",
  ].join("\n"),
  [
    "## Gull Sent Ahead [1]",
    "",
    "*Level 1 knowing*",
    "",
    "**Range:** One day of flying",
    "**Duration:** Until it returns",
    "",
    "A bird carries a spoken message and brings back the one it is given in answer.",
  ].join("\n"),
  [
    "## Ballast of Stillness [3]",
    "",
    "*Level 3 shaping*",
    "",
    "**Range:** One vessel",
    "**Duration:** One hour",
    "",
    "The deck stays level however the sea beneath it behaves.",
  ].join("\n"),
  [
    "## Cold Store [1]",
    "",
    "*Level 1 shaping*",
    "",
    "**Range:** One chest",
    "**Duration:** One week",
    "",
    "What is put inside is as fresh coming out as it was going in.",
  ].join("\n"),
  [
    "## Word Against the Fog [2]",
    "",
    "*Level 2 warding*",
    "",
    "**Range:** The length of a pier",
    "**Duration:** While spoken",
    "",
    "The fog thins to arm's reach on either side of the speaker and closes again behind them.",
  ].join("\n"),
  [
    "## Mark of the Harbour Master [1]",
    "",
    "*Level 1 knowing*",
    "",
    "**Range:** Touch",
    "**Duration:** One season",
    "",
    "A cargo marked this way cannot be sworn to by anyone but the one who marked it.",
  ].join("\n"),
  [
    "## Tide Told Early [2]",
    "",
    "*Level 2 knowing*",
    "",
    "**Range:** Self",
    "**Duration:** Instant",
    "",
    "You know to the quarter hour when the water will turn, and how far it will come.",
  ].join("\n"),
  [
    "## Anchor Not Yet Dropped [3]",
    "",
    "*Level 3 warding*",
    "",
    "**Range:** One vessel",
    "**Duration:** One hour",
    "",
    "The boat holds its place against wind and current with nothing under it but water.",
  ].join("\n"),
];

/**
 * The document the harness brings to the page, in the order it is laid out.
 *
 * The long entry first, which is also where the two sided layout puts it:
 * entries needing more than one card are laid out first, so its first card
 * takes the first slot of the first sheet and its continuation the mirror of
 * that slot. A mirror of the first slot is the clearest one to measure,
 * because the slot it lands in is a different one at either flip setting.
 *
 * @example
 * ```ts
 * PRINT_FIXTURE_DOCUMENT.startsWith("## Harbour Vigil"); // true
 * ```
 */
export const PRINT_FIXTURE_DOCUMENT = [
  CONTINUED_ENTRY,
  ...SHORT_ENTRIES,
].join("\n\n");
