import { CARD_BLOCK_KINDS, type Card } from "@ttrpg-cards/card";
import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";

/**
 * Original sample cards for the stories and the tests in this directory.
 *
 * The first two are the point of the renderer: two kinds of reference card
 * that differ only in the labels their meta fields carry, so anything that
 * renders one renders the other.
 */

/** A spell-shaped card: the stat block reads as time, range, cost, duration. */
export const spellShapedCard: Card = {
  id: "hollow-lantern",
  name: RichText.of("Hollow Lantern"),
  badge: RichText.of("3"),
  subtitle: RichText.of("Third circle, warding"),
  meta: [
    {
      label: RichText.of("Casting Time"),
      value: RichText.of("1 action"),
    },
    { label: RichText.of("Range"), value: RichText.of("Touch") },
    {
      label: RichText.of("Components"),
      value: RichText.of("Spoken, a cold wick"),
    },
    {
      label: RichText.of("Duration"),
      value: [
        { text: "Up to 10 minutes", marks: [TEXT_MARKS.emphasis] },
        { text: ", held" },
      ],
    },
  ],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: [
        {
          text: "The lantern you touch burns without fuel and casts no shadow. Anything that moves toward it is ",
        },
        { text: "seen", marks: [TEXT_MARKS.strong] },
        { text: ", however quietly it comes." },
      ],
    },
    {
      kind: CARD_BLOCK_KINDS.list,
      items: [
        RichText.of("Light reaches four metres and no further."),
        RichText.of("Covering the lantern ends the effect early."),
      ],
    },
    {
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of("Banked"),
      text: RichText.of(
        "Leave the wick unlit and the warding holds through the night, though nothing is lit by it.",
      ),
    },
  ],
  footer: [RichText.of("Warding"), RichText.of("Lantern-keeper")],
  tags: ["light", "ward"],
};

/** A gear-shaped card: the same shape, with entirely different meta labels. */
export const gearShapedCard: Card = {
  id: "ferrymans-tally",
  name: RichText.of("Ferryman's Tally"),
  subtitle: RichText.of("A notched stick, worn smooth at one end"),
  meta: [
    { label: RichText.of("Type"), value: RichText.of("Carried") },
    { label: RichText.of("Rarity"), value: RichText.of("Uncommon") },
    {
      label: RichText.of("Attunement"),
      value: RichText.of("Not required"),
    },
    { label: RichText.of("Weight"), value: RichText.of("0.2 kg") },
  ],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(
        "A notch appears on the tally for every crossing you have been carried over and never for one you paid for yourself.",
      ),
    },
    {
      kind: CARD_BLOCK_KINDS.list,
      items: [
        [
          { text: "Still water", marks: [TEXT_MARKS.strong] },
          { text: " reads the tally back as a count of debts." },
        ],
        RichText.of("Snapping it clears them, once."),
      ],
    },
  ],
  footer: [RichText.of("Carried"), RichText.of("Salvaged")],
  tags: ["water", "debt"],
};

/**
 * Far more text than the others carry, so the fitting routine has to set it
 * near the bottom of the range. Content that will not fit even there is a
 * second card, which is a different routine's decision.
 */
export const longBodyCard: Card = {
  id: "tide-of-hours",
  name: RichText.of("Tide of Hours"),
  badge: RichText.of("9"),
  subtitle: RichText.of("Ninth circle, reckoning"),
  meta: spellShapedCard.meta,
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(
        "Choose a stretch of water you can see and name an hour that has already passed. The water runs backwards to it, and everything it touched in between is touched again in reverse: the silt it carried settles where it was lifted from, the reeds it bent stand as they stood, and anything it drowned is left on the bank with the water still running off it. Nothing that walked away under its own power is returned, and nothing that was taken out of the water by a hand is put back. The hour you named is the one the water keeps, so a second casting on the same stretch does nothing until the tide has run forward through that hour again.",
      ),
    },
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(
        "Anyone standing in the water as it turns is carried with it and remembers both ways round, which is not a comfortable thing to carry. They know what the hour held and what it holds now, and they cannot say which of the two everyone else is living in.",
      ),
    },
    {
      kind: CARD_BLOCK_KINDS.list,
      items: [
        RichText.of(
          "Standing water has no hours to run back through and is unaffected.",
        ),
        RichText.of(
          "A stretch that has been turned once resists a second turning until the named hour has passed again.",
        ),
        RichText.of(
          "Anything carried back is left where the water first took it, not where you would like it.",
        ),
      ],
    },
  ],
  footer: [RichText.of("Reckoning"), RichText.of("Tidecaller")],
  tags: ["water", "time"],
};

/** A stat block long enough to run onto several lines. */
export const manyStatFieldsCard: Card = {
  ...gearShapedCard,
  id: "harbour-ledger",
  name: RichText.of("Harbour Ledger"),
  meta: [
    ...gearShapedCard.meta,
    { label: RichText.of("Origin"), value: RichText.of("Dockside") },
    { label: RichText.of("Condition"), value: RichText.of("Worn") },
    { label: RichText.of("Bulk"), value: RichText.of("Light") },
  ],
};

/**
 * Words with nowhere to break, longer than the card is wide. They have to
 * break anyway: fitting measures height, so a word left whole would run out of
 * the side of the card where nothing is watching.
 */
export const unbreakableWordCard: Card = {
  id: "the-long-word",
  name: RichText.of("Thunderunderthewaterandoverthehill"),
  subtitle: RichText.of("Unhyphenated, unrepentant"),
  meta: [
    {
      label: RichText.of("Pronunciation"),
      value: RichText.of("Thunderunderthewaterandoverthehillwise"),
    },
  ],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(
        "Spoken in one breath: Thunderunderthewaterandoverthehillandbackagainbeforesupper.",
      ),
    },
  ],
  footer: [RichText.of("Unpronounceable")],
};

/** The least a card can carry: a name and one block, and nothing optional. */
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
