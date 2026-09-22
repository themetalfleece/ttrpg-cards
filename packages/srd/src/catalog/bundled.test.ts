import { CARD_BLOCK_KINDS, CardModel } from "@ttrpg-cards/card";
import { RichText } from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import { BUNDLED_CATALOGS, bundledCatalog } from "./bundled";
import { Catalog } from "./Catalog";
import { META_LABELS } from "./catalog.constants";
import srd51 from "./data/srd-5.1.json";
import srd521 from "./data/srd-5.2.1.json";

/** What each extracted file must still contain. A change here is a content change. */
const EXPECTED_ENTRY_COUNTS = [
  { id: "srd-5.2.1", title: "SRD 5.2.1", entryCount: 339 },
  { id: "srd-5.1", title: "SRD 5.1", entryCount: 319 },
];

/**
 * The files as they are on disk. `bundled.ts` asserts their shape instead of
 * checking it on every load, so something has to check it, and this is it.
 */
const RAW_SOURCES: Record<string, unknown> = {
  "srd-5.2.1": srd521,
  "srd-5.1": srd51,
};

describe("BUNDLED_CATALOGS", () => {
  it("ships both releases, newest first", () => {
    expect(
      BUNDLED_CATALOGS.map((catalog) => ({
        id: catalog.id,
        title: catalog.title,
        entryCount: catalog.entryCount,
      })),
    ).toEqual(EXPECTED_ENTRY_COUNTS);
  });

  it.each(EXPECTED_ENTRY_COUNTS)(
    "$id is a file the schema accepts",
    ({ id }) => {
      expect(Catalog.validate(RAW_SOURCES[id])).toEqual([]);
    },
  );

  it.each(EXPECTED_ENTRY_COUNTS)(
    "$id carries its attribution",
    ({ id }) => {
      expect(bundledCatalog(id)?.attribution?.catalogId).toBe(id);
    },
  );

  it("prefixes every entry id with its own catalog, and repeats none", () => {
    const seen = new Set<string>();

    for (const catalog of BUNDLED_CATALOGS) {
      for (const entry of catalog.entries) {
        expect(entry.id.startsWith(`${catalog.id}:`)).toBe(true);
        expect(seen.has(entry.id)).toBe(false);
        seen.add(entry.id);
      }
    }
  });

  it("maps every entry onto a card the model accepts", () => {
    for (const catalog of BUNDLED_CATALOGS) {
      const failures = catalog.cards
        .map((card) => ({
          id: card.id,
          issues: CardModel.validate(card),
        }))
        .filter((result) => result.issues.length > 0);

      expect(failures).toEqual([]);
    }
  });

  it("maps every entry onto text already in canonical form", () => {
    // `CardModel.from` canonicalises what it validates, so a card that comes
    // back unchanged was canonical to begin with. Two loads of the catalog
    // therefore give the same card, byte for byte.
    for (const catalog of BUNDLED_CATALOGS) {
      for (const card of catalog.cards) {
        expect(CardModel.from(card).card).toEqual(card);
      }
    }
  });

  it("gives every card something to say", () => {
    for (const catalog of BUNDLED_CATALOGS) {
      for (const card of catalog.cards) {
        const model = new CardModel({ card });

        expect(model.isEmpty).toBe(false);
        expect(model.metaFieldCount).toBe(4);
      }
    }
  });

  it("records where every card came from and on what terms", () => {
    for (const catalog of BUNDLED_CATALOGS) {
      const attribution = catalog.attribution;

      for (const card of catalog.cards) {
        expect(card.source).toEqual({
          name: attribution?.title,
          url: attribution?.sourceUrl,
          license: attribution?.license.name,
        });
      }
    }
  });

  // The mapping writes a material where the document writes it, inside the
  // components value, and one rule in the card model moves it to the body for
  // every source. Walking the whole corpus is what says that rule reached all
  // of them: a bracket left in a cell is prose in a cell a quarter of a card
  // wide, which is the shape it exists to prevent.
  it("moves every material out of the strip and into the body", () => {
    for (const catalog of BUNDLED_CATALOGS) {
      const cardsById = new Map(
        catalog.cards.map((card) => [card.id, card]),
      );
      const withMaterial = catalog.entries.filter(
        (entry) => entry.components.materialText !== undefined,
      );

      expect(withMaterial.length).toBeGreaterThan(0);

      for (const entry of withMaterial) {
        const card = cardsById.get(entry.id);
        const components = card?.meta.find(
          (field) =>
            RichText.plain(field.label) === META_LABELS.components,
        );
        const closing = card?.body.at(-1);

        if (components === undefined || closing === undefined) {
          throw new Error(`${entry.id} has no components or no body`);
        }

        // The cell keeps the letters and nothing else.
        expect(RichText.plain(components.value)).not.toContain("(");

        // And what it was holding is the last thing the body says.
        expect(closing.kind).toBe(CARD_BLOCK_KINDS.callout);
        expect(CardModel.blockText(closing).toLowerCase()).toContain(
          (entry.components.materialText ?? "")
            .trim()
            .replace(/[.!?]$/, "")
            .toLowerCase(),
        );
      }
    }
  });

  it("leaves no inline markup in the text a reader sees", () => {
    for (const catalog of BUNDLED_CATALOGS) {
      const leaked = catalog.cards.filter((card) =>
        /\*\*|(?<![\p{L}\p{N}])_(?=\S)/u.test(
          new CardModel({ card }).faceText,
        ),
      );

      expect(leaked.map((card) => card.id)).toEqual([]);
    }
  });
});

describe("bundledCatalog", () => {
  it("returns undefined for an id it does not ship", () => {
    expect(bundledCatalog("srd-9.9")).toBeUndefined();
  });
});
