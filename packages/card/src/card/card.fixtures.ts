import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";

import { CARD_BLOCK_KINDS } from "./card.constants";
import type { Card } from "./card.types";

/**
 * Original sample cards shared by the tests in this directory. The pair exists
 * to prove the point of the model: two very different kinds of reference card
 * in one shape, differing only in the labels their meta fields carry.
 */

/** A spell-shaped card: the stat block reads as time, range, cost, duration. */
export const emberwakeSigil: Card = {
  id: "emberwake-sigil",
  name: RichText.of("Emberwake Sigil"),
  badge: RichText.of("2"),
  subtitle: RichText.of("Second circle, kindling"),
  meta: [
    {
      label: RichText.of("Casting Time"),
      value: RichText.of("1 action"),
    },
    { label: RichText.of("Range"), value: RichText.of("18 metres") },
    {
      label: RichText.of("Components"),
      value: RichText.of("Spoken, gesture, a pinch of cold ash"),
    },
    {
      label: RichText.of("Duration"),
      // A stat value carrying emphasis, which is why every field takes runs.
      value: [
        { text: "Up to 1 minute", marks: [TEXT_MARKS.emphasis] },
        { text: ", held" },
      ],
    },
  ],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: [
        {
          text: "Trace a sigil on any surface within reach. It wakes into a low ring of embers and anything crossing the line is ",
        },
        { text: "scorched", marks: [TEXT_MARKS.emphasis] },
        { text: "." },
      ],
    },
    {
      kind: CARD_BLOCK_KINDS.list,
      items: [
        RichText.of("The ring sheds dim light out to three metres."),
        RichText.of("Dousing the surface ends the effect early."),
      ],
    },
    {
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of("Stoked"),
      text: RichText.of(
        "Feed the sigil dry tinder and the ring burns twice as hot until your hold on it lapses.",
      ),
    },
  ],
  footer: [RichText.of("Kindling"), RichText.of("Ashcaller")],
  tags: ["fire", "zone"],
  source: {
    name: "Ember and Ledger",
    url: "https://example.com/ember-and-ledger",
    license: "CC BY 4.0",
  },
};

/** A gear-shaped card: the same shape, with entirely different meta labels. */
export const tidewalkerBoots: Card = {
  id: "tidewalker-boots",
  name: RichText.of("Tidewalker Boots"),
  subtitle: RichText.of("Salt-stained, stitched with kelp fibre"),
  meta: [
    { label: RichText.of("Type"), value: RichText.of("Worn, feet") },
    { label: RichText.of("Rarity"), value: RichText.of("Uncommon") },
    {
      label: RichText.of("Attunement"),
      value: RichText.of("Required"),
    },
    { label: RichText.of("Weight"), value: RichText.of("0.5 kg") },
  ],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.of(
        "The soles never quite touch the water. Standing water and calm swells hold your weight as though they were packed sand.",
      ),
    },
    {
      kind: CARD_BLOCK_KINDS.list,
      items: [
        [
          { text: "Rough water", marks: [TEXT_MARKS.strong] },
          {
            text: " gives way underfoot and the boots offer nothing.",
          },
        ],
        RichText.of(
          "Removing them while standing on open water is unwise.",
        ),
      ],
    },
  ],
  footer: [
    RichText.of("Worn gear"),
    RichText.of("Coastal"),
    RichText.of("Salvaged"),
  ],
  tags: ["worn", "water"],
};
