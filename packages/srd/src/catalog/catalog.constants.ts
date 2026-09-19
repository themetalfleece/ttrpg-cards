/**
 * The block types an extracted entry's description is built from. A plain
 * object rather than an enum, so it survives type stripping.
 */
export const ENTRY_BLOCK_TYPES = {
  paragraph: "paragraph",
  list: "list",
  table: "table",
} as const;

/**
 * The labels the mapping writes into a card's stat block, in the order they
 * are laid out. This is where the source document's vocabulary stops: the card
 * model carries them as data, so nothing downstream is named for them.
 */
export const META_LABELS = {
  castingTime: "Casting Time",
  range: "Range",
  components: "Components",
  duration: "Duration",
  material: "Material",
} as const;

/** The letters the source prints for the components an entry needs. */
export const COMPONENT_LETTERS = {
  verbal: "V",
  somatic: "S",
  material: "M",
} as const;

/** What the components field says when an entry needs none of them. */
export const NO_COMPONENTS = "None";

/** The badge a level 0 entry carries, where a numeral would say nothing. */
export const CANTRIP_BADGE = "C";

/** How the footer names an entry that can also be cast as a ritual. */
export const RITUAL_FOOTER_SUFFIX = " (ritual)";

/** The word the footer adds to a level 0 entry's school. */
export const CANTRIP_WORD = "cantrip";

/** How the tags name level 0, where a bare numeral would not read. */
export const CANTRIP_LEVEL_NAME = "Cantrip";

/** How the tags name every other level. */
export const LEVEL_NAME_PREFIX = "Level";

/**
 * Put back in front of a duration the extraction lifted it out of, so the stat
 * block reads the way the source document prints it.
 */
export const CONCENTRATION_PREFIX = "Concentration, ";

/** A tag carried by entries that hold their caster's concentration. */
export const CONCENTRATION_TAG = "Concentration";

/** A tag carried by entries that can also be cast as a ritual. */
export const RITUAL_TAG = "Ritual";
