import { RichText } from "@ttrpg-cards/text";

import {
  CARD_BLOCK_KINDS,
  type Card,
  type CardBlock,
  CardModel,
} from "../card";
import type { CardLayout } from "../layout";

/**
 * Original sample cards for the splitting tests, and the stand-in measurement
 * they are split against.
 *
 * The long ones carry the same prose in different shapes, so a test can say
 * which shape changed the answer rather than which words did.
 */

/**
 * How wide a character is as a fraction of the type size, and how far apart
 * the lines sit. Both are about right for the serif a card is set in, which is
 * all {@link fitsByTextCapacity} needs them to be.
 */
const CHARACTER_WIDTH_RATIO = 0.5;
const LINE_HEIGHT_RATIO = 1.5;

/**
 * A stand-in for measuring a card in a browser.
 *
 * A real card is measured by rendering it and reading back where its content
 * lands, and a test runner has no layout to read. This answers the same
 * question from the geometry instead: how many characters the content area
 * holds at the smallest type the layout allows, against how many the face
 * carries. Rough on purpose, and monotonic, which is what the routine asks
 * for.
 *
 * The point is that the answer comes from the layout. A card cut to another
 * size moves the split with nothing else changed, the same way a real
 * measurement would.
 *
 * @example
 * ```ts
 * const fits = fitsByTextCapacity(CardLayout.default());
 *
 * fits(minimalCard); // true
 * ```
 */
export function fitsByTextCapacity(
  layout: CardLayout,
): (card: Card) => boolean {
  const { minimumMillimetres } = layout.fontSizeRange;
  const characterWidth = minimumMillimetres * CHARACTER_WIDTH_RATIO;
  const lineHeight = minimumMillimetres * LINE_HEIGHT_RATIO;
  const capacity = Math.floor(
    (layout.contentWidthMillimetres *
      layout.contentHeightMillimetres) /
      (characterWidth * lineHeight),
  );

  return (card) =>
    new CardModel({ card }).faceText.length <= capacity;
}

/** The prose the long fixtures are built from, in the order it reads. */
const tideClockProse = [
  "A tide clock cut from a single piece of driftwood, still wet at the grain. It keeps the hour of the water rather than the hour of the town, and the two agree twice a day and quarrel the rest of it. Wind the clock and it runs until the next slack water, then stops and waits to be wound by someone who was there to see it.",
  "Hold the clock and you know, without looking, how far the water is from where it wants to be. That is the whole of it: no reading, no dial, nothing to interpret. The knowledge arrives the way hunger does, and it goes when you set the clock down on anything that is not moving.",
  "The hour it keeps belongs to the nearest water large enough to have one, which in a dry country is a long way off and arrives late. Carried inland far enough, the clock slows and then stops, and nothing winds it again until it hears water. A carrier who does not know this will think it broken and leave it.",
  "Lent to another hand, it keeps the hour of whoever wound it last and not of whoever holds it now. Two people winding it turn about will find it telling neither of their hours, which is a fault of the arrangement rather than of the clock. Let one of them wind it and the other read it, and it behaves.",
  "Salt water and fresh water keep different hours, and the clock will not hold both at once. Carried from one to the other it goes quiet for a full turn of the tide before it takes up the new hour, and anyone relying on it in that gap is relying on nothing at all. Give it the turn and it comes back.",
  "The wood remembers being a tree and, given long enough on dry land, tries to be one again. A clock left a season in a loft puts out a green shoot from the winding end and thereafter keeps the hour of the rain instead, which is a poorer hour but an honest one, and it will not be persuaded back.",
] as const;

/** Each entry as a paragraph of its own, which is what a body usually is. */
function proseParagraphs(count: number): CardBlock[] {
  return tideClockProse.slice(0, count).map((text) => ({
    kind: CARD_BLOCK_KINDS.paragraph,
    text: RichText.of(text),
  }));
}

/** Everything a card carries apart from its body, shared by the long ones. */
const tideClockFace = {
  name: RichText.of("Driftwood Tide Clock"),
  badge: RichText.of("3"),
  subtitle: RichText.of("Salt-bleached, wound at slack water"),
  meta: [
    { label: RichText.of("Type"), value: RichText.of("Carried") },
    { label: RichText.of("Rarity"), value: RichText.of("Rare") },
    {
      label: RichText.of("Attunement"),
      value: RichText.of("Required"),
    },
    { label: RichText.of("Weight"), value: RichText.of("0.4 kg") },
  ],
  footer: [RichText.of("Carried"), RichText.of("Tidal")],
  tags: ["water", "time"],
} satisfies Omit<Card, "id" | "body">;

/** More prose than one card holds, and enough for the second to read fully. */
export const longBodyCard: Card = {
  id: "driftwood-tide-clock",
  ...tideClockFace,
  body: proseParagraphs(6),
};

/** One paragraph short, so the last card would carry a single block alone. */
export const orphanLastBlockCard: Card = {
  id: "driftwood-tide-clock-short",
  ...tideClockFace,
  body: proseParagraphs(5),
};

/** The same prose as one unbroken block, so no block boundary can be used. */
export const oneLongBlockCard: Card = {
  id: "driftwood-tide-clock-unbroken",
  ...tideClockFace,
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(tideClockProse.join(" ")),
    },
  ],
};

/** The same prose as one list, which splits between its items. */
export const longListCard: Card = {
  id: "driftwood-tide-clock-listed",
  ...tideClockFace,
  body: [
    {
      kind: CARD_BLOCK_KINDS.list,
      items: tideClockProse.map((text) => RichText.of(text)),
    },
  ],
};

/**
 * A list whose first item is taller than a small card, so the item is cut and
 * the two items after it land on the same card as its trailing half.
 *
 * The item is two sentences, the first long and the second short, so one cut
 * is enough and what carries over leaves room for the rest of the list.
 */
export const longFirstItemCard: Card = {
  id: "slack-water-listed",
  name: RichText.of("Slack Water"),
  meta: [],
  body: [
    {
      kind: CARD_BLOCK_KINDS.list,
      items: [
        RichText.of(
          "A tide clock cut from a single piece of driftwood keeps the hour of the water rather than the hour of the town, and the two quarrel most of the day. Wind it at slack water.",
        ),
        RichText.of("Wound at noon, it keeps noon."),
        RichText.of("Wound at dusk, it keeps dusk."),
      ],
    },
  ],
};

/** An aside long enough to be cut, so the label has to stay on the first half. */
export const longCalloutCard: Card = {
  id: "driftwood-tide-clock-aside",
  ...tideClockFace,
  body: [
    {
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of("Wound inland"),
      text: RichText.of(tideClockProse.join(" ")),
    },
  ],
};

/** One sentence and no punctuation inside it, so only word ends are left. */
export const oneSentenceCard: Card = {
  id: "slack-water",
  name: RichText.of("Slack Water"),
  meta: [],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(
        "The water stands still for as long as it takes a wound clock to forget which way it was running and to remember again, which is longer than anyone waiting on the bank would care to be told and shorter than the clock itself seems to think it is",
      ),
    },
  ],
};

/** A word with nowhere to break, so there is no cut to make at all. */
export const unbreakableWordCard: Card = {
  id: "tideclockwinding",
  name: RichText.of("Tideclockwinding"),
  meta: [],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of("tideclockwinding".repeat(16)),
    },
  ],
};

/** The least a card can carry, which fits anywhere and is never split. */
export const minimalCard: Card = {
  id: "quiet-hour",
  name: RichText.of("Quiet Hour"),
  meta: [],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of("Nothing happens, and nothing is meant to."),
    },
  ],
};
