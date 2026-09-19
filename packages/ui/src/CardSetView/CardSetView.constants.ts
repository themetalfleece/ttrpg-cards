import type { CardPosition } from "@ttrpg-cards/card";

/**
 * The position a candidate is measured carrying.
 *
 * By the time candidates are being measured the entry is already going to be
 * a set, so every card in it will show an indicator. Which numbers it shows
 * does not matter: what the indicator costs is the width it takes from the
 * name, and every label is about as wide as every other.
 */
export const MEASURING_POSITION: CardPosition = {
  number: 1,
  total: 2,
  label: "1/2",
};

/**
 * Where the card being measured sits: laid out, so it has real dimensions to
 * read back, and out of the way of everything the reader can see.
 */
export const MEASURING_FRAME_STYLE = {
  position: "fixed",
  top: "0",
  left: "0",
  visibility: "hidden",
  pointerEvents: "none",
  zIndex: "-1",
} as const;
