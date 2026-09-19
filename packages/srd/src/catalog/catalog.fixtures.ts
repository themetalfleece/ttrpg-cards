import type { CatalogEntry, CatalogSource } from "./catalog.types";

/**
 * An entry that exercises every part of the mapping: markup in the body, a
 * list, a two column table with a caption, a two column table without one, a
 * wide table without one, an upgrade section, a material component, and a
 * casting time with a trigger.
 *
 * The two captionless tables are the shapes that decide how much of a header
 * row has to be written out, so both are here rather than only the wide one.
 *
 * Original material, not extracted content. The bundled catalogs are checked
 * as themselves in `bundled.test.ts`.
 */
export const FULL_ENTRY: CatalogEntry = {
  id: "test-catalog:lantern-ward",
  name: "Lantern Ward",
  level: 2,
  school: "Abjuration",
  ritual: true,
  castingTime:
    "1 reaction, which you take when a light source is snuffed",
  range: "Self",
  components: {
    verbal: true,
    somatic: false,
    material: true,
    materialText: "a wick soaked in oil",
  },
  duration: "Up to 1 hour",
  concentration: true,
  classes: ["Warden", "Lamplighter"],
  description: [
    {
      type: "paragraph",
      text: "A **steady** glow answers you, and _nothing_ unlit may cross it.",
    },
    {
      type: "list",
      items: ["It sheds light.", "It refuses the dark."],
    },
    {
      type: "table",
      caption: "Omens",
      header: ["Omen", "What It Means"],
      rows: [
        ["Guttering", "The ward is failing"],
        ["Steady", "The ward holds"],
      ],
    },
    {
      type: "table",
      header: ["1d4", "Where the Light Falls"],
      rows: [
        ["1", "North"],
        ["2", "East"],
      ],
    },
    {
      type: "table",
      header: ["Ability", "Score", "Mod"],
      rows: [
        ["Str", "16", "+3"],
        ["Dex", "10", "+0"],
      ],
    },
  ],
  upgrade: {
    label: "At Higher Levels",
    text: "The radius grows by 5 feet for each level above 2.",
  },
  source: "Test Catalog",
};

/** The smallest entry the schema accepts: no upgrade, no material, no trigger. */
export const PLAIN_ENTRY: CatalogEntry = {
  id: "test-catalog:candle-sign",
  name: "Candle Sign",
  level: 0,
  school: "Divination",
  ritual: false,
  castingTime: "1 action",
  range: "30 feet",
  components: { verbal: false, somatic: true, material: false },
  duration: "Instantaneous",
  concentration: false,
  classes: ["Warden"],
  description: [{ type: "paragraph", text: "You read the flame." }],
  source: "Test Catalog",
};

/** A catalog holding both fixtures, for the class's own behaviour. */
export const TEST_CATALOG: CatalogSource = {
  id: "test-catalog",
  title: "Test Catalog",
  entries: [FULL_ENTRY, PLAIN_ENTRY],
};
