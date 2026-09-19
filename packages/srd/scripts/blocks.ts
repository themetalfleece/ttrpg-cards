import type { EntryBlock } from "../src/catalog/catalog.types.ts";
import type { Dehyphenator } from "./Dehyphenator.ts";
import type { RoledLine } from "./entries.ts";
import { InlineTextBuilder } from "./InlineTextBuilder.ts";
import { sameColumn } from "./layout.ts";
import type { EditionProfile } from "./sources.ts";
import { buildTables } from "./tables.ts";
import { normalizeText, styleOfFont } from "./text.ts";

export interface BlockContext {
  readonly profile: EditionProfile;
  readonly columnLeft: readonly [number, number];
  readonly dehyphenator: Dehyphenator;
  readonly anomalies: string[];
  readonly entryName: string;
}

const TABLE_ROLES = new Set([
  "table-caption",
  "table-header",
  "table-cell",
]);

/** Converts a spell's description lines into paragraph, list and table blocks. */
export function buildBlocks(
  lines: readonly RoledLine[],
  context: BlockContext,
): EntryBlock[] {
  const blocks: EntryBlock[] = [];
  let start = 0;
  while (start < lines.length) {
    const isTable = TABLE_ROLES.has(lines[start]!.role);
    let end = start;
    while (
      end < lines.length &&
      TABLE_ROLES.has(lines[end]!.role) === isTable
    )
      end++;
    const chunk = lines.slice(start, end);

    if (isTable) {
      blocks.push(...buildTables(chunk, context));
    } else {
      blocks.push(...buildTextBlocks(chunk, context));
    }

    start = end;
  }
  return blocks;
}

interface OpenParagraph {
  readonly kind: "paragraph";
  readonly text: InlineTextBuilder;
  /** Started flush left with a bold run-in, so wrapped lines may use a hanging indent. */
  readonly mayHang: boolean;
  hanging: boolean;
  lineCount: number;
}

interface OpenList {
  readonly kind: "list";
  readonly items: InlineTextBuilder[];
  /** Indent of the text after the bullet, where wrapped item lines start. */
  readonly itemIndent: number;
}

const BULLET = "\u2022";

function buildTextBlocks(
  lines: readonly RoledLine[],
  context: BlockContext,
): EntryBlock[] {
  const blocks: EntryBlock[] = [];
  let open: OpenParagraph | OpenList | undefined;

  const close = () => {
    if (open?.kind === "paragraph" && !open.text.isEmpty) {
      blocks.push({ type: "paragraph", text: open.text.toMarkup() });
    } else if (open?.kind === "list") {
      blocks.push({
        type: "list",
        items: open.items.map((item) => item.toMarkup()),
      });
    }
    open = undefined;
  };

  const indentOf = (line: RoledLine) =>
    line.x - context.columnLeft[line.column]!;
  const nearly = (first: number, second: number) =>
    Math.abs(first - second) < 2;

  lines.forEach((line, index) => {
    const previous = lines[index - 1];
    const adjacent =
      previous !== undefined &&
      previous.index + 1 === line.index &&
      sameColumn(previous, line);
    // Extra space above a line always separates blocks (lists, hanging entries, following text).
    const spaced =
      adjacent && previous.y - line.y > context.profile.leading * 1.2;
    const indent = indentOf(line);
    const runs = line.runs;

    if (normalizeText(runs[0]!.text).trimStart().startsWith(BULLET)) {
      const itemRuns = runs
        .map((run, runIndex) =>
          runIndex === 0
            ? {
                ...run,
                text: normalizeText(run.text).replace(BULLET, ""),
              }
            : run,
        )
        .filter((run) => run.text.trim() !== "");
      const itemIndent =
        (itemRuns[0]?.x ?? line.x) - context.columnLeft[line.column]!;
      if (open?.kind !== "list" || spaced) {
        close();
        open = { kind: "list", items: [], itemIndent };
      }
      const item = new InlineTextBuilder(context.dehyphenator);
      item.appendRuns(itemRuns);
      open.items.push(item);
      return;
    }

    if (open?.kind === "list") {
      if (!spaced && nearly(indent, open.itemIndent)) {
        open.items.at(-1)!.appendRuns(runs);
        return;
      }
      close();
    }

    if (open?.kind === "paragraph") {
      const firstStyle = styleOfFont(runs[0]!.font);
      const previousEndsBold =
        previous !== undefined &&
        styleOfFont(previous.runs.at(-1)!.font) === "bold";
      const runIn =
        firstStyle === "bold" &&
        /[.:]$/.test(normalizeText(runs[0]!.text).trim()) &&
        !previousEndsBold;
      let startsNew = spaced || runIn;
      if (!startsNew && indent > 4) {
        if (open.mayHang && (open.lineCount === 1 || open.hanging))
          open.hanging = true;
        else startsNew = true;
      }
      if (!startsNew && nearly(indent, 0) && open.hanging)
        startsNew = true;
      if (!startsNew) {
        open.text.appendRuns(runs);
        open.lineCount++;
        return;
      }
      close();
    }

    const text = new InlineTextBuilder(context.dehyphenator);
    text.appendRuns(runs);
    open = {
      kind: "paragraph",
      text,
      mayHang:
        nearly(indent, 0) && styleOfFont(runs[0]!.font) === "bold",
      hanging: false,
      lineCount: 1,
    };
  });
  close();
  return blocks;
}
