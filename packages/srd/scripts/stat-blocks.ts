import type { EntryBlock } from "../src/catalog/catalog.types.ts";
import type { Dehyphenator } from "./Dehyphenator.ts";
import type { RoledLine } from "./entries.ts";
import { InlineTextBuilder } from "./InlineTextBuilder.ts";
import type { TextRun } from "./pdf-text.ts";
import { normalizeText } from "./text.ts";

export interface StatBlock {
  /** Creature name, e.g. "Animated Object". */
  readonly name: string;
  readonly blocks: readonly EntryBlock[];
}

/** Line spacing within a stat block entry; larger gaps separate entries. */
const STAT_BLOCK_LEADING = 12;

/**
 * Renders a creature stat block (5.2.1 summoning spells) as description blocks: bold name,
 * italic type line, one paragraph per property or feature, and the ability scores as a table.
 */
export function buildStatBlock(
  lines: readonly RoledLine[],
  dehyphenator: Dehyphenator,
): StatBlock {
  const name = lines[0]!.text;
  const blocks: EntryBlock[] = [
    { type: "paragraph", text: `**${name}**` },
  ];
  const abilityRows: string[][] = [];
  let paragraph: InlineTextBuilder | undefined;

  const flush = () => {
    if (paragraph !== undefined && !paragraph.isEmpty) {
      blocks.push({ type: "paragraph", text: paragraph.toMarkup() });
    }
    paragraph = undefined;
  };

  // The slice drops the name line, so the index still points at the line
  // before `line` in the unsliced list.
  lines.slice(1).forEach((line, previousIndex) => {
    const previous = lines[previousIndex]!;
    const first = line.runs[0]!;

    if (first.font.startsWith("GillSans") && first.size < 7) return; // "MOD SAVE" column labels
    if (first.font.includes("-SC700")) {
      flush();
      abilityRows.push(...abilityScores(line.runs));
      return;
    }
    if (
      abilityRows.length > 0 &&
      !blocks.some((block) => block.type === "table")
    ) {
      blocks.push({
        type: "table",
        header: ["Ability", "Score", "Mod", "Save"],
        rows: abilityRows,
      });
    }
    if (first.font.startsWith("GillSans")) {
      // Section heading such as "Actions" or "Bonus Actions".
      flush();
      blocks.push({ type: "paragraph", text: `**${line.text}**` });
      return;
    }
    const spaced = previous.y - line.y > STAT_BLOCK_LEADING * 1.2;
    const property = first.font === "Optima-Bold";
    if (paragraph === undefined || spaced || property) {
      flush();
      paragraph = new InlineTextBuilder(dehyphenator);
    }
    paragraph.appendRuns(line.runs);
  });
  flush();
  return { name, blocks };
}

/** "Str 16 +3 +3 Dex 10 +0 +0 ..." where ability names are drawn as small-caps fragments. */
function abilityScores(runs: readonly TextRun[]): string[][] {
  const rows: string[][] = [];
  for (const run of runs) {
    const text = normalizeText(run.text).trim();
    if (text === "") continue;
    const last = rows.at(-1);
    if (run.font.includes("-SC700")) {
      if (last !== undefined && last.length === 1) last[0] += text;
      else rows.push([text]);
    } else if (last !== undefined) {
      last.push(text);
    }
  }
  return rows.map(([ability = "", ...values]) => [
    ability.charAt(0).toUpperCase() + ability.slice(1).toLowerCase(),
    ...values,
  ]);
}
