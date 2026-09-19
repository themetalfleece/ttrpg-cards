import type {
  CatalogEntry,
  EntryBlock,
  EntryComponents,
  EntryUpgrade,
} from "../src/catalog/catalog.types.ts";
import { buildBlocks } from "./blocks.ts";
import type { Dehyphenator } from "./Dehyphenator.ts";
import type { FieldName, RoledLine, SourceEntry } from "./entries.ts";
import { InlineTextBuilder } from "./InlineTextBuilder.ts";
import { FIELD_LABEL, type EditionProfile } from "./sources.ts";
import { buildStatBlock, type StatBlock } from "./stat-blocks.ts";
import { collapseSpaces, normalizeText, slugify } from "./text.ts";

export interface BuildContext {
  readonly catalogId: string;
  readonly source: string;
  readonly profile: EditionProfile;
  readonly columnLeft: readonly [number, number];
  readonly dehyphenator: Dehyphenator;
  readonly anomalies: string[];
  /** Class lists keyed by entry slug, for documents whose level line does not name classes. */
  readonly classesBySlug: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface BuiltEntry {
  readonly entry: CatalogEntry;
  readonly statBlocks: readonly StatBlock[];
}

interface LevelInfo {
  readonly level: number;
  readonly school: string;
  readonly ritual: boolean;
  readonly classes: readonly string[] | undefined;
}

/** The run-in headings that introduce casting an entry at a higher level. */
const UPGRADE_LABELS = [
  "At Higher Levels",
  "Using a Higher-Level Spell Slot",
  "Cantrip Upgrade",
];

export function buildEntry(
  source: SourceEntry,
  context: BuildContext,
): BuiltEntry {
  const name = nameOf(source.nameLine);
  const levelText = collapseSpaces(
    source.levelLines.map((line) => line.text).join(" "),
  );
  const levelInfo = parseLevelLine(levelText, context.profile);
  if (levelInfo === undefined) {
    throw new Error(
      `${name}: unrecognized level line "${levelText}"`,
    );
  }

  const field = (label: FieldName) => {
    const lines = source.fields.get(label);
    if (lines === undefined)
      throw new Error(`${name}: missing "${label}"`);
    const builder = new InlineTextBuilder(context.dehyphenator);
    for (const line of lines) builder.appendRuns(line.runs);
    return builder.toPlainText().replace(FIELD_LABEL, "").trim();
  };

  let castingTime = field("Casting Time");
  let ritual = levelInfo.ritual;
  if (/ or Ritual$/.test(castingTime)) {
    castingTime = castingTime.replace(/ or Ritual$/, "");
    ritual = true;
  }

  const { duration, concentration } = parseDuration(
    field("Duration"),
  );
  const description = buildBlocks(source.bodyLines, {
    ...context,
    entryName: name,
  });
  const upgrade = extractUpgrade(
    description,
    name,
    context.anomalies,
  );
  const statBlocks = source.statBlocks.map((lines) =>
    buildStatBlock(lines, context.dehyphenator),
  );

  const slug = slugify(name);

  const entry: CatalogEntry = {
    id: `${context.catalogId}:${slug}`,
    name,
    level: levelInfo.level,
    school: levelInfo.school,
    ritual,
    castingTime,
    range: field("Range"),
    components: parseComponents(field("Components"), name),
    duration,
    concentration,
    classes: classesOf(levelInfo, context.classesBySlug.get(slug)),
    description,
    source: context.source,
  };
  if (upgrade !== undefined) entry.upgrade = upgrade;

  return { entry, statBlocks };
}

/**
 * The classes an entry belongs to, sorted.
 *
 * 5.2.1 prints them on the level line. 5.1 does not, so they come from the class lists printed
 * elsewhere in the document, which the caller has already looked up by slug. An entry on neither
 * has none, and `validateCatalog` rejects the catalog before anything is written.
 */
function classesOf(
  levelInfo: LevelInfo,
  listed: ReadonlySet<string> | undefined,
): string[] {
  if (levelInfo.classes !== undefined) {
    return levelInfo.classes.toSorted();
  }

  if (listed === undefined) {
    return [];
  }

  return [...listed].toSorted();
}

/**
 * Some 5.2.1 names use a small-caps font whose lowercase letters are drawn as smaller capitals
 * ("Acid Spl" + "AS" + "h"), so reduced-size fragments are lowercased.
 */
function nameOf(line: RoledLine): string {
  const fullSize = Math.max(...line.runs.map((run) => run.size));
  const text = line.runs
    .map((run) =>
      run.size < fullSize * 0.85 ? run.text.toLowerCase() : run.text,
    )
    .join("");
  return collapseSpaces(normalizeText(text));
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

function parseLevelLine(
  text: string,
  profile: EditionProfile,
): LevelInfo | undefined {
  if (profile.edition === "5.1") {
    const leveled =
      /^(\d)(?:st|nd|rd|th)-level (\p{L}+)( \(ritual\))?$/iu.exec(
        text,
      );
    if (leveled !== null) {
      return {
        level: Number(leveled[1]),
        school: capitalize(leveled[2]!.toLowerCase()),
        ritual: leveled[3] !== undefined,
        classes: undefined,
      };
    }
    const cantrip = /^(\p{L}+) cantrip$/iu.exec(text);
    if (cantrip !== null) {
      return {
        level: 0,
        school: capitalize(cantrip[1]!.toLowerCase()),
        ritual: false,
        classes: undefined,
      };
    }
    return undefined;
  }
  const leveled = /^Level (\d) (\p{L}+) \((.+)\)$/u.exec(text);
  const cantrip = /^(\p{L}+) Cantrip \((.+)\)$/u.exec(text);
  const classList = (list: string) =>
    list.split(",").map((className) => className.trim());
  if (leveled !== null) {
    return {
      level: Number(leveled[1]),
      school: leveled[2]!,
      ritual: false,
      classes: classList(leveled[3]!),
    };
  }
  if (cantrip !== null) {
    return {
      level: 0,
      school: cantrip[1]!,
      ritual: false,
      classes: classList(cantrip[2]!),
    };
  }
  return undefined;
}

function parseDuration(text: string): {
  duration: string;
  concentration: boolean;
} {
  // One 5.2.1 entry omits the comma ("Concentration up to 10 minutes").
  const match = /^Concentration,?\s+(.+)$/i.exec(text);
  if (match === null) return { duration: text, concentration: false };
  return { duration: capitalize(match[1]!), concentration: true };
}

function parseComponents(
  text: string,
  name: string,
): EntryComponents {
  const open = text.indexOf("(");
  const head = open < 0 ? text : text.slice(0, open);
  const codes = head
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code !== "");
  if (codes.some((code) => !["V", "S", "M"].includes(code))) {
    throw new Error(`${name}: unrecognized components "${text}"`);
  }
  const components: EntryComponents = {
    verbal: codes.includes("V"),
    somatic: codes.includes("S"),
    material: codes.includes("M"),
  };
  if (open < 0) return components;
  const close = text.lastIndexOf(")");
  if (close < open || close !== text.length - 1) {
    throw new Error(
      `${name}: malformed material component "${text}"`,
    );
  }
  components.materialText = text.slice(open + 1, close).trim();
  return components;
}

/**
 * Removes the run-in upgrade paragraph (e.g. "**At Higher Levels.** ...") from the description
 * and returns it without the heading.
 */
function extractUpgrade(
  description: EntryBlock[],
  name: string,
  anomalies: string[],
): EntryUpgrade | undefined {
  const found: { index: number; label: string; text: string }[] = [];
  description.forEach((block, index) => {
    if (block.type !== "paragraph") return;
    for (const label of UPGRADE_LABELS) {
      // A few 5.1 entries set the period after the heading in regular type: "**At Higher Levels**."
      const heading = new RegExp(
        `^\\*\\*${label}(?:\\.\\*\\*|\\*\\*\\.)\\s*`,
      );
      const match = heading.exec(block.text);
      if (match !== null) {
        found.push({
          index,
          label,
          text: block.text.slice(match[0].length),
        });
      }
    }
  });
  const [first] = found;
  if (first === undefined) return undefined;
  if (found.length > 1) {
    anomalies.push(
      `${name}: ${found.length} upgrade sections; kept the first in the description`,
    );
  }
  const trailing = description
    .slice(first.index + 1)
    .filter((block) => block.type !== "table");
  if (trailing.length > 0) {
    anomalies.push(
      `${name}: text follows the "${first.label}" section`,
    );
  }
  description.splice(first.index, 1);
  return { label: first.label, text: first.text };
}
