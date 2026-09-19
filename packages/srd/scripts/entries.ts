import { sameColumn, type Line } from "./layout.ts";
import {
  FIELD_LABEL,
  type EditionProfile,
  type LineRole,
} from "./sources.ts";
import { lineText } from "./text.ts";

export interface RoledLine extends Line {
  readonly role: LineRole;
  readonly text: string;
  /** Position in the document's reading order; consecutive values mean nothing was drawn between. */
  readonly index: number;
}

export type FieldName =
  "Casting Time" | "Range" | "Components" | "Duration";

/** The raw lines belonging to one spell, split into its structural parts. */
export interface SourceEntry {
  readonly nameLine: RoledLine;
  readonly levelLines: readonly RoledLine[];
  /** Each header field's lines: the label line followed by any wrapped continuation lines. */
  readonly fields: ReadonlyMap<FieldName, readonly RoledLine[]>;
  /** Description lines (body text and tables) in reading order. */
  readonly bodyLines: readonly RoledLine[];
  /** Creature stat blocks drawn inside this spell's flow, each as its own run of lines. */
  readonly statBlocks: readonly (readonly RoledLine[])[];
}

export interface Chapter {
  readonly lines: readonly RoledLine[];
  readonly columnLeft: readonly [number, number];
}

export function assignRoles(
  lines: readonly Line[],
  profile: EditionProfile,
): RoledLine[] {
  return lines.map((line, index) => {
    let role: LineRole = "body";
    for (const run of line.runs) {
      const runRole = profile.runRole(run);
      if (runRole !== undefined) {
        role = runRole;
        break;
      }
    }
    return { ...line, role, text: lineText(line), index };
  });
}

/** Lines between the "Spell Descriptions" heading and the next chapter-level heading. */
export function sliceChapter(
  lines: readonly RoledLine[],
  heading: string,
): RoledLine[] {
  const start = lines.findIndex(
    (line) =>
      line.role === "chapter-heading" && line.text === heading,
  );
  if (start < 0)
    throw new Error(`Chapter heading "${heading}" not found`);
  const end = lines.findIndex(
    (line, index) => index > start && line.role === "chapter-heading",
  );
  if (end < 0)
    throw new Error(`No chapter heading follows "${heading}"`);
  return lines.slice(start + 1, end);
}

const LEVEL_LINE_START = {
  "5.1": /^(\d(st|nd|rd|th)-level \p{L}+|\p{L}+ cantrip)\b/iu,
  "5.2.1": /^(Level \d \p{L}+|\p{L}+ Cantrip)\b/u,
} as const;

export function splitEntries(
  chapter: Chapter,
  profile: EditionProfile,
  anomalies: string[],
): SourceEntry[] {
  const { lines, columnLeft } = chapter;
  const levelStart = LEVEL_LINE_START[profile.edition];
  const startsAnEntry = (index: number) =>
    lines[index]!.role === "entry-name" &&
    lines[index + 1] !== undefined &&
    levelStart.test(lines[index + 1]!.text);

  const starts: number[] = [];
  for (let index = 0; index < lines.length; index++)
    if (startsAnEntry(index)) starts.push(index);
  if (starts[0] !== 0) {
    anomalies.push(
      `Text before the first spell heading: "${lines[0]?.text}"`,
    );
  }

  return starts.map((start, position) => {
    const end = starts[position + 1] ?? lines.length;
    const entryLines = lines.slice(start, end);
    const nameLine = entryLines[0]!;
    // Walks the entry's lines once: the level line, then the header fields,
    // then whatever is left is the description.
    let cursor = 1;

    const levelLines: RoledLine[] = [];
    while (
      cursor < entryLines.length &&
      !FIELD_LABEL.test(entryLines[cursor]!.text)
    ) {
      levelLines.push(entryLines[cursor]!);
      cursor++;
    }

    const fields = new Map<FieldName, RoledLine[]>();
    let current: RoledLine[] | undefined;
    while (cursor < entryLines.length) {
      const line = entryLines[cursor]!;
      const label = FIELD_LABEL.exec(line.text);
      if (label !== null && line.role === "label") {
        current = [line];
        fields.set(
          label[1] === "Component"
            ? "Components"
            : (label[1] as FieldName),
          current,
        );
        cursor++;
        continue;
      }
      if (
        current === undefined ||
        !continuesHeaderField(
          fields,
          current,
          line,
          profile,
          columnLeft,
        )
      ) {
        break;
      }
      current.push(line);
      cursor++;
    }

    const bodyLines: RoledLine[] = [];
    const statBlocks: RoledLine[][] = [];
    for (const line of entryLines.slice(cursor)) {
      if (line.role !== "stat-block") {
        bodyLines.push(line);
        continue;
      }
      const block = statBlocks.at(-1);
      // A stat block starts at its (large) name line; everything until the next name belongs to it.
      if (block === undefined || line.size > 14)
        statBlocks.push([line]);
      else block.push(line);
    }

    return { nameLine, levelLines, fields, bodyLines, statBlocks };
  });
}

function continuesHeaderField(
  fields: ReadonlyMap<FieldName, readonly RoledLine[]>,
  current: readonly RoledLine[],
  line: RoledLine,
  profile: EditionProfile,
  columnLeft: readonly [number, number],
): boolean {
  // Lines between two labels always continue the earlier label.
  if (!fields.has("Duration")) return true;
  const previous = current.at(-1)!;
  if (profile.edition === "5.2.1") return line.role === "table-cell";
  const indented = line.x - columnLeft[line.column]! > 4;
  const tight =
    !sameColumn(previous, line) ||
    previous.y - line.y < profile.leading * 1.2;
  return line.role === "body" && indented && tight;
}
