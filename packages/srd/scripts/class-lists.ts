import { lineText, slugify } from "./text.ts";
import type { RoledLine } from "./entries.ts";

/** One row of a class spell list as printed in the document. */
export interface ClassListEntry {
  readonly className: string;
  readonly level: number;
  readonly name: string;
  readonly slug: string;
  /** 5.2.1 only: school and the "Special" column (C = Concentration, R = Ritual, M = costly Material). */
  readonly school?: string;
  readonly special?: string;
}

/**
 * SRD 5.1 "Spell Lists" section: a "Bard Spells" heading, level headings ("Cantrips (0 Level)",
 * "1st Level", ...) and one spell name per line.
 */
export function parseClassLists51(
  lines: readonly RoledLine[],
): ClassListEntry[] {
  const start = lines.findIndex(
    (line) =>
      line.role === "chapter-heading" && line.text === "Spell Lists",
  );
  if (start < 0) throw new Error('"Spell Lists" section not found');
  const entries: ClassListEntry[] = [];
  let className: string | undefined;
  let level: number | undefined;
  for (const line of lines.slice(start + 1)) {
    if (line.role === "chapter-heading") break;
    const classHeading = /^(\p{L}+) Spells$/u.exec(line.text);
    if (classHeading !== null && line.size > 13) {
      className = classHeading[1]!;
      level = undefined;
      continue;
    }
    const levelHeading =
      /^(?:Cantrips \((0) Level\)|(\d)(?:st|nd|rd|th) Level)$/.exec(
        line.text,
      );
    if (levelHeading !== null && line.role === "entry-name") {
      level = Number(levelHeading[1] ?? levelHeading[2]);
      continue;
    }
    if (className === undefined || level === undefined) {
      throw new Error(
        `Unexpected line in "Spell Lists": "${line.text}"`,
      );
    }
    entries.push({
      className,
      level,
      name: line.text,
      slug: slugify(line.text),
    });
  }
  return entries;
}

/**
 * SRD 5.2.1 class chapters: a "Bard Spell List" heading followed by per-level tables
 * ("Cantrips (Level 0 Bard Spells)", "Level 1 Bard Spells") whose rows start with an italic
 * spell name.
 */
export function parseClassLists521(
  lines: readonly RoledLine[],
): ClassListEntry[] {
  const entries: ClassListEntry[] = [];
  let className: string | undefined;
  let level: number | undefined;
  for (const line of lines) {
    const listHeading = /^(\p{L}+) Spell List$/u.exec(line.text);
    if (listHeading !== null && line.size > 13) {
      className = listHeading[1]!;
      level = undefined;
      continue;
    }
    if (line.size > 13) {
      className = undefined;
      continue;
    }
    if (className === undefined) continue;
    const levelHeading =
      /^(?:Cantrips \(Level (0)|Level (\d)) \p{L}+ Spells\)?$/u.exec(
        line.text,
      );
    if (levelHeading !== null) {
      level = Number(levelHeading[1] ?? levelHeading[2]);
      continue;
    }
    const first = line.runs[0]!;
    if (level === undefined || first.font !== "GillSans-Italic")
      continue;
    const nameRuns = line.runs.filter(
      (run) => run.font === "GillSans-Italic",
    );
    const otherRuns = line.runs.filter(
      (run) => run.font !== "GillSans-Italic",
    );
    const [school, ...special] = otherRuns.map((run) =>
      lineText([run]),
    );
    const name = lineText(nameRuns);
    entries.push({
      className,
      level,
      name,
      slug: slugify(name),
      school: school ?? "",
      special: special.join(" "),
    });
  }
  return entries;
}

export function classesBySlug(
  entries: readonly ClassListEntry[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const entry of entries) {
    const classes = map.get(entry.slug) ?? new Set<string>();
    classes.add(entry.className);
    map.set(entry.slug, classes);
  }
  return map;
}
