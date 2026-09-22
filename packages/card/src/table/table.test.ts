import { RichText } from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import { CARD_BLOCK_KINDS } from "../card";
import { tableBlocks } from "./table";
import type { TableCell } from "./table.types";

/** A row written the way a source prints one, empty cells included. */
function row(...cells: (string | undefined)[]): TableCell[] {
  return cells.map((cell) =>
    cell === undefined || cell === "" ? undefined : RichText.of(cell),
  );
}

/** What the blocks say, as plain lines a reader would see. */
function linesOf(blocks: ReturnType<typeof tableBlocks>): string[] {
  return blocks.flatMap((block) => {
    if (block.kind === CARD_BLOCK_KINDS.list) {
      return block.items.map((item) => RichText.plain(item));
    }

    return block.kind === CARD_BLOCK_KINDS.paragraph
      ? [RichText.plain(block.text)]
      : [];
  });
}

describe("tableBlocks", () => {
  // A card has no grid, so a table is read as a line naming it and then one
  // line per row.
  it("writes a two column table as a heading and a row apiece", () => {
    const blocks = tableBlocks({
      header: row("Roll", "Effect"),
      rows: [row("1", "The light fails"), row("2", "It holds")],
    });

    expect(blocks[0]?.kind).toBe(CARD_BLOCK_KINDS.paragraph);
    expect(blocks[1]?.kind).toBe(CARD_BLOCK_KINDS.list);
    expect(linesOf(blocks)).toEqual([
      "Roll / Effect",
      "1: The light fails",
      "2: It holds",
    ]);
  });

  it("reads a table under its caption where it printed one", () => {
    const blocks = tableBlocks({
      caption: RichText.of("What the lantern shows"),
      header: row("Roll", "Effect"),
      rows: [row("1", "The light fails")],
    });

    expect(linesOf(blocks)[0]).toBe("What the lantern shows");
  });

  // Past two columns a row no longer reads as a pair, so each cell is named
  // by its own column instead.
  it("names every cell of a wide row by its column", () => {
    const blocks = tableBlocks({
      header: row("Roll", "Effect", "Lasts"),
      rows: [row("1", "The light fails", "1 minute")],
    });

    expect(linesOf(blocks)).toEqual([
      "Roll",
      "1: Effect The light fails, Lasts 1 minute",
    ]);
  });

  it("leads a row in strong, so the rows can be scanned down", () => {
    const [, list] = tableBlocks({
      header: row("Roll", "Effect"),
      rows: [row("1", "The light fails")],
    });

    if (list?.kind !== CARD_BLOCK_KINDS.list) {
      throw new Error("The table wrote no rows");
    }

    expect(list.items[0]?.[0]).toEqual({
      text: "1",
      marks: ["strong"],
    });
  });

  // A cell is kept even when it says nothing, because the cells line up with
  // the columns and one dropped would move every cell after it.
  it("passes over an empty cell without moving the ones beside it", () => {
    const blocks = tableBlocks({
      header: row("Roll", "Effect", "Lasts"),
      rows: [row("1", "", "1 minute")],
    });

    expect(linesOf(blocks)[1]).toBe("1: Lasts 1 minute");
  });

  it("drops a row with nothing in it at all", () => {
    const blocks = tableBlocks({
      header: row("Roll", "Effect"),
      rows: [row("", ""), row("1", "The light fails")],
    });

    expect(linesOf(blocks)).toEqual([
      "Roll / Effect",
      "1: The light fails",
    ]);
  });

  it("writes nothing for a table with no rows worth writing", () => {
    expect(
      tableBlocks({ header: row("", ""), rows: [row("", "")] }),
    ).toEqual([]);
  });
});
