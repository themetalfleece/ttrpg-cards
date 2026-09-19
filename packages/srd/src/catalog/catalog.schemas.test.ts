import { Value } from "@ttrpg-cards/validator";
import { describe, expect, it } from "vitest";

import { ENTRY_BLOCK_TYPES } from "./catalog.constants";
import { FULL_ENTRY } from "./catalog.fixtures";
import {
  CatalogEntrySchema,
  ENTRY_BLOCK_SCHEMA_BY_TYPE,
  EntryBlockSchema,
  EntryComponentsSchema,
  EntryTableSchema,
} from "./catalog.schemas";

describe("EntryBlockSchema", () => {
  it("accepts exactly the types the per-type record holds", () => {
    expect(Object.keys(ENTRY_BLOCK_SCHEMA_BY_TYPE).sort()).toEqual(
      Object.values(ENTRY_BLOCK_TYPES).sort(),
    );
    expect(Object.values(ENTRY_BLOCK_SCHEMA_BY_TYPE)).toEqual(
      EntryBlockSchema.anyOf,
    );
  });

  it("rejects a type the extraction does not emit", () => {
    expect(
      Value.Check(EntryBlockSchema, {
        type: "callout",
        text: "aside",
      }),
    ).toBe(false);
  });
});

describe("EntryTableSchema", () => {
  it("accepts an empty cell, because a printed table leaves cells blank", () => {
    expect(
      Value.Check(EntryTableSchema, {
        type: ENTRY_BLOCK_TYPES.table,
        header: ["Roll", "Result"],
        rows: [["1", ""]],
      }),
    ).toBe(true);
  });

  it("rejects an unlabelled column, which means the parse went wrong", () => {
    expect(
      Value.Check(EntryTableSchema, {
        type: ENTRY_BLOCK_TYPES.table,
        header: ["Roll", ""],
        rows: [["1", "Something"]],
      }),
    ).toBe(false);
  });

  it("rejects a table with no rows", () => {
    expect(
      Value.Check(EntryTableSchema, {
        type: ENTRY_BLOCK_TYPES.table,
        header: ["Roll"],
        rows: [],
      }),
    ).toBe(false);
  });
});

describe("EntryComponentsSchema", () => {
  it("accepts the three flags on their own", () => {
    expect(
      Value.Check(EntryComponentsSchema, {
        verbal: true,
        somatic: false,
        material: false,
      }),
    ).toBe(true);
  });

  it("rejects an empty material component, since absence says none", () => {
    expect(
      Value.Check(EntryComponentsSchema, {
        verbal: true,
        somatic: false,
        material: true,
        materialText: "",
      }),
    ).toBe(false);
  });
});

describe("CatalogEntrySchema", () => {
  it("accepts the fixture", () => {
    expect(Value.Check(CatalogEntrySchema, FULL_ENTRY)).toBe(true);
  });

  it("rejects an entry on no class list", () => {
    expect(
      Value.Check(CatalogEntrySchema, { ...FULL_ENTRY, classes: [] }),
    ).toBe(false);
  });

  it("rejects an entry with nothing to say", () => {
    expect(
      Value.Check(CatalogEntrySchema, {
        ...FULL_ENTRY,
        description: [],
      }),
    ).toBe(false);
  });

  it("rejects a level the documents cannot print", () => {
    for (const level of [-1, 10, 1.5]) {
      expect(
        Value.Check(CatalogEntrySchema, { ...FULL_ENTRY, level }),
      ).toBe(false);
    }
  });

  it("rejects a field the extraction does not write", () => {
    expect(
      Value.Check(CatalogEntrySchema, {
        ...FULL_ENTRY,
        damage: "4d6",
      }),
    ).toBe(false);
  });
});
