import { CardModel } from "@ttrpg-cards/card";
import { describe, expect, it } from "vitest";

import { Catalog } from "./Catalog";
import {
  FULL_ENTRY,
  PLAIN_ENTRY,
  TEST_CATALOG,
} from "./catalog.fixtures";
import type { CatalogEntry } from "./catalog.types";

/** The fixture with one field changed, for a case that turns on that field. */
function entryWith(changes: Partial<CatalogEntry>): CatalogEntry {
  return { ...FULL_ENTRY, ...changes };
}

/** The bare fixture with one field changed, so the body holds only that. */
function plainWith(changes: Partial<CatalogEntry>): CatalogEntry {
  return { ...PLAIN_ENTRY, ...changes };
}

/** The plain text of each of a card's body blocks, in order, marks dropped. */
function bodyTexts(entry: CatalogEntry): string[] {
  return Catalog.cardFrom(entry).body.map((block) =>
    CardModel.blockText(block),
  );
}

describe("Catalog.cardFrom", () => {
  it("produces a card the model accepts", () => {
    expect(CardModel.isCard(Catalog.cardFrom(FULL_ENTRY))).toBe(true);
    expect(CardModel.isCard(Catalog.cardFrom(PLAIN_ENTRY))).toBe(
      true,
    );
  });

  it("keeps the entry's id", () => {
    expect(Catalog.cardFrom(FULL_ENTRY).id).toBe(
      "test-catalog:lantern-ward",
    );
  });

  it("badges the level, and marks level 0 with a letter", () => {
    expect(Catalog.cardFrom(FULL_ENTRY).badge).toEqual([
      { text: "2" },
    ]);
    expect(Catalog.cardFrom(PLAIN_ENTRY).badge).toEqual([
      { text: "C" },
    ]);
  });

  it("writes the stat block as labels and values, in a fixed order", () => {
    const card = Catalog.cardFrom(FULL_ENTRY);

    expect(
      card.meta.map((field) => [
        field.label.map((run) => run.text).join(""),
        field.value.map((run) => run.text).join(""),
      ]),
    ).toEqual([
      ["Range", "Self"],
      ["Components", "V, M"],
      ["Duration", "Conc. 1 hour"],
      ["Casting Time", "1 reaction"],
    ]);
  });

  it("writes the components the entry needs, or says none", () => {
    const value = (entry: CatalogEntry) =>
      Catalog.cardFrom(entry)
        .meta[1]?.value.map((run) => run.text)
        .join("");

    expect(
      value(
        entryWith({
          components: { verbal: true, somatic: true, material: true },
        }),
      ),
    ).toBe("V, S, M");
    expect(
      value(
        entryWith({
          components: {
            verbal: false,
            somatic: false,
            material: false,
          },
        }),
      ),
    ).toBe("None");
  });

  // The mapping writes the material into the value the way the document
  // writes it, and the card model lifts it straight back out, so the cell
  // holds letters whether or not there is a material to hold.
  it("keeps a material out of the cell that names the letters", () => {
    expect(
      Catalog.cardFrom(
        entryWith({
          components: {
            verbal: true,
            somatic: false,
            material: true,
            materialText: "a wick soaked in oil",
          },
        }),
      )
        .meta[1]?.value.map((run) => run.text)
        .join(""),
    ).toBe("V, M");
  });

  describe("the duration it writes", () => {
    const duration = (entry: CatalogEntry) =>
      Catalog.cardFrom(entry)
        .meta[2]?.value.map((run) => run.text)
        .join("");

    it("prints a duration the cell can hold exactly as the document does", () => {
      expect(
        duration(
          entryWith({ concentration: false, duration: "8 hours" }),
        ),
      ).toBe("8 hours");
      expect(
        duration(
          entryWith({
            concentration: false,
            duration: "Until dispelled",
          }),
        ),
      ).toBe("Until dispelled");
    });

    // Thirteen letters with nowhere to wrap, in a cell a quarter of a card
    // wide. Left whole it breaks in the middle of the word.
    it("shortens the one word too long for a cell to hold", () => {
      expect(
        duration(
          entryWith({
            concentration: false,
            duration: "Instantaneous",
          }),
        ),
      ).toBe("Instant");
    });

    // Concentration is what makes a duration a maximum, so a card carrying
    // both says the same thing twice in its narrowest cell.
    it("names concentration once, in place of the up to it implies", () => {
      expect(
        duration(
          entryWith({
            concentration: true,
            duration: "Up to 1 hour",
          }),
        ),
      ).toBe("Conc. 1 hour");
      expect(
        duration(
          entryWith({
            concentration: true,
            duration: "Up to 10 minutes",
          }),
        ),
      ).toBe("Conc. 10 minutes");
    });

    // One entry in the bundled catalog spells its number as a word, and the
    // prefix comes off the front rather than the first word being rewritten.
    it("leaves the duration it kept alone otherwise", () => {
      expect(
        duration(
          entryWith({
            concentration: true,
            duration: "Up to one minute",
          }),
        ),
      ).toBe("Conc. one minute");
    });
  });

  it("lays the body out in reading order", () => {
    expect(bodyTexts(FULL_ENTRY)).toEqual([
      "1 reaction, which you take when a light source is snuffed",
      "A steady glow answers you, and nothing unlit may cross it.",
      "It sheds light.\nIt refuses the dark.",
      "Omens",
      "Guttering: The ward is failing\nSteady: The ward holds",
      "1d4 / Where the Light Falls",
      "1: North\n2: East",
      "Ability",
      "Str: Score 16, Mod +3\nDex: Score 10, Mod +0",
      "At Higher Levels\nThe radius grows by 5 feet for each level above 2.",
      "Material\nA wick soaked in oil.",
    ]);
  });

  it("opens the body with the trigger a casting time names", () => {
    expect(bodyTexts(FULL_ENTRY)[0]).toBe(
      "1 reaction, which you take when a light source is snuffed",
    );
  });

  it("leaves out the trigger paragraph when there is no trigger", () => {
    expect(bodyTexts(entryWith({ castingTime: "1 action" }))[0]).toBe(
      "A steady glow answers you, and nothing unlit may cross it.",
    );
  });

  it("turns inline markup into marked runs", () => {
    const card = Catalog.cardFrom(FULL_ENTRY);

    expect(card.body[1]).toEqual({
      kind: "paragraph",
      text: [
        { text: "A " },
        { text: "steady", marks: ["strong"] },
        { text: " glow answers you, and " },
        { text: "nothing", marks: ["emphasis"] },
        { text: " unlit may cross it." },
      ],
    });
  });

  it("keeps a list a list", () => {
    expect(bodyTexts(FULL_ENTRY)).toContain(
      "It sheds light.\nIt refuses the dark.",
    );
  });

  it("writes a two column table as key and value", () => {
    expect(bodyTexts(FULL_ENTRY)).toContain(
      "Guttering: The ward is failing\nSteady: The ward holds",
    );
  });

  it("labels the cells of a table too wide to read as key and value", () => {
    expect(bodyTexts(FULL_ENTRY)).toContain(
      "Str: Score 16, Mod +3\nDex: Score 10, Mod +0",
    );
  });

  it("reads a table under its caption when it prints one", () => {
    const texts = bodyTexts(FULL_ENTRY);

    expect(texts).toContain("Omens");
    expect(texts).not.toContain("Omen / What It Means");
  });

  it("reads a captionless table under its column headings", () => {
    // Without them the first cell is a bare number and the card never says
    // what to roll.
    expect(bodyTexts(FULL_ENTRY)).toContain(
      "1d4 / Where the Light Falls",
    );
  });

  it("keeps only the first heading of a captionless wide table", () => {
    // The rest are already written out beside their own cells.
    const texts = bodyTexts(FULL_ENTRY);

    expect(texts).toContain("Ability");
    expect(texts).not.toContain("Ability / Score / Mod");
  });

  it("leaves out a heading line a table has nothing to fill with", () => {
    expect(
      bodyTexts(
        plainWith({
          description: [
            {
              type: "table",
              header: [" "],
              rows: [["Alone"]],
            },
          ],
        }),
      ),
    ).toEqual(["Alone"]);
  });

  it("drops a table row whose cells are all empty", () => {
    const card = Catalog.cardFrom(
      plainWith({
        description: [
          {
            type: "table",
            header: ["Roll", "Result"],
            rows: [
              ["", ""],
              ["1", "Something"],
            ],
          },
        ],
      }),
    );

    expect(card.body).toEqual([
      {
        kind: "paragraph",
        text: [{ text: "Roll / Result", marks: ["strong"] }],
      },
      {
        kind: "list",
        items: [
          [{ text: "1", marks: ["strong"] }, { text: ": Something" }],
        ],
      },
    ]);
  });

  it("leaves out a table whose every row is empty", () => {
    const card = Catalog.cardFrom(
      plainWith({
        description: [
          {
            type: "table",
            caption: "Nothing",
            header: ["Roll", "Result"],
            rows: [["", ""]],
          },
        ],
      }),
    );

    expect(card.body).toEqual([
      {
        kind: "paragraph",
        text: [{ text: "Nothing", marks: ["strong"] }],
      },
    ]);
  });

  it("sets the upgrade section apart as a callout", () => {
    const card = Catalog.cardFrom(FULL_ENTRY);

    expect(card.body.at(-2)).toEqual({
      kind: "callout",
      label: [{ text: "At Higher Levels" }],
      text: [
        {
          text: "The radius grows by 5 feet for each level above 2.",
        },
      ],
    });
  });

  it("sets the material component apart, read back as a sentence", () => {
    expect(Catalog.cardFrom(FULL_ENTRY).body.at(-1)).toEqual({
      kind: "callout",
      label: [{ text: "Material" }],
      text: [{ text: "A wick soaked in oil." }],
    });
  });

  it("leaves a material component that already ends a sentence alone", () => {
    const card = Catalog.cardFrom(
      entryWith({
        components: {
          verbal: true,
          somatic: false,
          material: true,
          materialText: "a pinch of dust, which the spell consumes.",
        },
      }),
    );

    expect(card.body.at(-1)).toEqual({
      kind: "callout",
      label: [{ text: "Material" }],
      text: [{ text: "A pinch of dust, which the spell consumes." }],
    });
  });

  it("footers the school and the classes, naming a ritual", () => {
    expect(Catalog.cardFrom(FULL_ENTRY).footer).toEqual([
      [{ text: "Abjuration (ritual)" }],
      [{ text: "Warden, Lamplighter" }],
    ]);
  });

  it("names level 0 in the footer, where the badge cannot", () => {
    expect(Catalog.cardFrom(PLAIN_ENTRY).footer).toEqual([
      [{ text: "Divination cantrip" }],
      [{ text: "Warden" }],
    ]);
  });

  it("tags the card for the library without rendering any of it", () => {
    expect(Catalog.cardFrom(FULL_ENTRY).tags).toEqual([
      "Test Catalog",
      "Abjuration",
      "Level 2",
      "Warden",
      "Lamplighter",
      "Concentration",
      "Ritual",
    ]);
  });

  it("leaves off a source for a catalog with no attribution", () => {
    expect(Catalog.cardFrom(FULL_ENTRY).source).toBeUndefined();
  });

  it("records the source and terms of a catalog that has them", () => {
    const card = Catalog.cardFrom(
      entryWith({ id: "srd-5.1:lantern-ward" }),
    );

    expect(card.source).toEqual({
      name: "SRD 5.1",
      url: "https://dnd.wizards.com/resources/systems-reference-document",
      license: "CC BY 4.0",
    });
  });
});

describe("Catalog", () => {
  it("reads its own identity off the source", () => {
    const catalog = new Catalog({ source: TEST_CATALOG });

    expect(catalog.id).toBe("test-catalog");
    expect(catalog.title).toBe("Test Catalog");
    expect(catalog.entryCount).toBe(2);
    expect(catalog.entries).toEqual(TEST_CATALOG.entries);
  });

  it("maps its entries once and hands back the same cards", () => {
    const catalog = new Catalog({ source: TEST_CATALOG });

    expect(catalog.cards).toBe(catalog.cards);
    expect(catalog.cards.map((card) => card.id)).toEqual([
      "test-catalog:lantern-ward",
      "test-catalog:candle-sign",
    ]);
  });

  it("has no attribution when nothing covers its id", () => {
    expect(
      new Catalog({ source: TEST_CATALOG }).attribution,
    ).toBeUndefined();
  });
});

describe("Catalog.from", () => {
  it("accepts a well formed source", () => {
    expect(Catalog.from(TEST_CATALOG).entryCount).toBe(2);
  });

  it("refuses a source that is not an object", () => {
    expect(() => Catalog.from(null)).toThrow(TypeError);
  });

  it("refuses a source with no entries", () => {
    expect(() =>
      Catalog.from({ ...TEST_CATALOG, entries: [] }),
    ).toThrow(/entries/);
  });

  it("refuses an entry with a level the documents cannot print", () => {
    expect(() =>
      Catalog.from({
        ...TEST_CATALOG,
        entries: [entryWith({ level: 10 })],
      }),
    ).toThrow(TypeError);
  });

  it("refuses an unknown field rather than ignoring it", () => {
    expect(Catalog.isSource({ ...TEST_CATALOG, extra: "no" })).toBe(
      false,
    );
  });

  it("reports where a failure is", () => {
    const issues = Catalog.validate({
      ...TEST_CATALOG,
      entries: [entryWith({ name: "" })],
    });

    expect(issues.some((issue) => issue.path.includes("/name"))).toBe(
      true,
    );
  });
});
