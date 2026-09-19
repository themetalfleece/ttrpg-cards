import { CARD_BLOCK_KINDS, type Card } from "@ttrpg-cards/card";
import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";

/**
 * Original sample cards for the set view's stories and tests.
 *
 * The long one carries more than a card holds at the smallest type the default
 * layout allows, which is the only way to see a split at all.
 */

/** Prose for the long card, one entry per paragraph, in the order it reads. */
const nightWatchProse = [
  "Light the wick at dusk and the lantern shows you the last hour of the place you are standing in, laid over the one you are in now. The two do not blend. You see both, one behind the other, and you learn quickly to trust whichever of them is holding a door open.",
  "What the lantern shows is what happened, not what anyone meant by it. A quarrel reads as two people standing too close; a theft reads as a hand and a pocket. Nobody's reasons are in the light, and a watch that forgets this arrests the wrong half of a street.",
  "It shows the hour of the ground, so carrying it upstairs shows you the stair and not the room above. A lantern held out of a window shows the street below as the street was, which is the usual way it is used and the reason the watch carries poles.",
  "Rain is the difficulty. Water that fell in the last hour is still falling in the light, and a heavy night fills the lantern with weather until nothing else can be made out. Wait for it to pass or shutter the lantern and go by ear, which is what the old hands do.",
  "Two lanterns lit within sight of one another show each other lighting, and then show that showing, and so on until both wicks gutter and go out. The effect is harmless and the loss of a wick is not, so a watch works in a line with one lantern at the front.",
  "Anyone who looks directly into the flame for longer than a breath keeps the doubled sight for the rest of the night without the lantern. They will tell you it is useful. It is not, and they sleep badly, and by morning they cannot say which hour they are remembering.",
  "Snuffing the lantern ends everything it was showing at once, which is disorienting enough that the watch is drilled to close their eyes first. Relighting it starts the hour again from the moment of the light rather than from where it left off.",
] as const;

/** More than the default card holds at the smallest type, by some way. */
export const overflowingCard: Card = {
  id: "watchmans-lantern",
  name: RichText.of("Watchman's Lantern"),
  badge: RichText.of("5"),
  subtitle: RichText.of("Hooded, burns a cold blue"),
  meta: [
    { label: RichText.of("Type"), value: RichText.of("Carried") },
    { label: RichText.of("Rarity"), value: RichText.of("Rare") },
    {
      label: RichText.of("Attunement"),
      value: RichText.of("Not required"),
    },
    {
      label: RichText.of("Fuel"),
      value: [
        { text: "One night", marks: [TEXT_MARKS.emphasis] },
        { text: " a wick" },
      ],
    },
  ],
  body: nightWatchProse.map((text) => ({
    kind: CARD_BLOCK_KINDS.paragraph,
    text: RichText.of(text),
  })),
  footer: [RichText.of("Carried"), RichText.of("Night watch")],
  tags: ["light", "memory"],
};

/** Little enough that it never needs a second card. */
export const settledCard: Card = {
  id: "shuttered-wick",
  name: RichText.of("Shuttered Wick"),
  subtitle: RichText.of("Lit once, kept for the walk home"),
  meta: [
    { label: RichText.of("Type"), value: RichText.of("Carried") },
    { label: RichText.of("Rarity"), value: RichText.of("Common") },
  ],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(
        "A wick that keeps its flame through wind and rain and goes out the moment it is put down indoors.",
      ),
    },
  ],
  footer: [RichText.of("Carried")],
};
