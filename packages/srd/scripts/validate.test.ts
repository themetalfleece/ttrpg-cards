import { describe, expect, it } from "vitest";

import type {
  CatalogEntry,
  CatalogSource,
} from "../src/catalog/catalog.types.ts";
import { validateCatalog } from "./validate.ts";

const ENTRY: CatalogEntry = {
  id: "test-catalog:lantern-ward",
  name: "Lantern Ward",
  level: 2,
  school: "Abjuration",
  ritual: false,
  castingTime: "1 action",
  range: "Self",
  components: { verbal: true, somatic: false, material: false },
  duration: "Instantaneous",
  concentration: false,
  classes: ["Warden"],
  description: [{ type: "paragraph", text: "A steady glow." }],
  source: "Test Catalog",
};

/** A catalog holding one entry, changed in whatever way the case is about. */
function catalogWith(changes: Partial<CatalogEntry>): CatalogSource {
  return {
    id: "test-catalog",
    title: "Test Catalog",
    entries: [{ ...ENTRY, ...changes }],
  };
}

describe("validateCatalog", () => {
  it("accepts a sound catalog", () => {
    expect(() => validateCatalog(catalogWith({}))).not.toThrow();
  });

  it("rejects an entry on no class list", () => {
    // The extraction reads 5.1 classes off the printed lists, so a name that
    // does not match one leaves this empty. Catching it here is what keeps a
    // catalog the run has already decided is bad from reaching a file.
    expect(() =>
      validateCatalog(catalogWith({ classes: [] })),
    ).toThrow(/no classes/);
  });

  it("rejects an entry with nothing to say", () => {
    expect(() =>
      validateCatalog(catalogWith({ description: [] })),
    ).toThrow(/empty description/);
  });

  it("rejects a school the documents do not print", () => {
    expect(() =>
      validateCatalog(catalogWith({ school: "Thaumaturgy" })),
    ).toThrow(/unknown school/);
  });

  it("rejects a level out of range", () => {
    expect(() => validateCatalog(catalogWith({ level: 10 }))).toThrow(
      /out of range/,
    );
  });

  it("rejects an id that is not prefixed with its catalog", () => {
    expect(() =>
      validateCatalog(catalogWith({ id: "other:lantern-ward" })),
    ).toThrow(/id prefix/);
  });

  it("rejects a duplicate id", () => {
    expect(() =>
      validateCatalog({
        id: "test-catalog",
        title: "Test Catalog",
        entries: [ENTRY, ENTRY],
      }),
    ).toThrow(/duplicate id/);
  });

  it("rejects markup the parser would have to guess at", () => {
    expect(() =>
      validateCatalog(
        catalogWith({
          description: [
            { type: "paragraph", text: "A **steady glow." },
          ],
        }),
      ),
    ).toThrow(/unbalanced \*\* markers/);
  });

  it("rejects a page footer that leaked into the text", () => {
    expect(() =>
      validateCatalog(
        catalogWith({
          description: [
            {
              type: "paragraph",
              text: "System Reference Document 5.1 42",
            },
          ],
        }),
      ),
    ).toThrow(/page footer text/);
  });

  it("rejects a table row that does not match its header", () => {
    expect(() =>
      validateCatalog(
        catalogWith({
          description: [
            {
              type: "table",
              header: ["Roll", "Result"],
              rows: [["1"]],
            },
          ],
        }),
      ),
    ).toThrow(/table row width differs from header/);
  });

  it("names every problem it found, not just the first", () => {
    expect(() =>
      validateCatalog(
        catalogWith({ classes: [], school: "Thaumaturgy" }),
      ),
    ).toThrow(/unknown school[\s\S]*no classes/);
  });
});
