import { describe, expect, it } from "vitest";

import {
  ATTRIBUTIONS,
  CC_BY_4_0,
  MODIFICATION_NOTICE,
} from "./attribution.constants";
import { attributionFor } from "./attribution.data";

/**
 * The statements as the licensor publishes them, typed out a second time.
 *
 * The point of the duplication is that it is independent: an edit to the
 * constants, by a person or by a codemod, has to be made here too or the test
 * fails. Straight quotation marks instead of curly ones are the likely
 * accident, and this catches it.
 */
const STATEMENT_5_2_1 =
  "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.";

const STATEMENT_5_1 =
  "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.";

/** Every field of an attribution except the statement itself. */
function fieldsBesideStatement(catalogId: string): string[] {
  const attribution = attributionFor(catalogId);

  if (attribution === undefined) {
    throw new Error(`No attribution for ${catalogId}`);
  }

  return [
    attribution.catalogId,
    attribution.title,
    attribution.sourceUrl,
    attribution.license.name,
    attribution.license.url,
    attribution.modificationNotice,
  ];
}

describe("ATTRIBUTIONS", () => {
  it("reproduces the newer statement exactly", () => {
    expect(attributionFor("srd-5.2.1")?.statement).toBe(
      STATEMENT_5_2_1,
    );
  });

  it("reproduces the older statement exactly", () => {
    expect(attributionFor("srd-5.1")?.statement).toBe(STATEMENT_5_1);
  });

  it("uses the licensor's curly quotation marks, not straight ones", () => {
    for (const attribution of ATTRIBUTIONS) {
      expect(attribution.statement).not.toContain('"');
    }
  });

  it("covers both bundled catalogs and nothing else", () => {
    expect(
      ATTRIBUTIONS.map((attribution) => attribution.catalogId),
    ).toEqual(["srd-5.2.1", "srd-5.1"]);
  });

  it("links the licensor's published source, which the licence requires", () => {
    for (const attribution of ATTRIBUTIONS) {
      expect(attribution.statement).toContain(attribution.sourceUrl);
    }
  });

  it("identifies the licence and links its text", () => {
    for (const attribution of ATTRIBUTIONS) {
      expect(attribution.license).toBe(CC_BY_4_0);
      expect(attribution.statement).toContain(CC_BY_4_0.url);
    }
  });

  it("declares that the material was modified", () => {
    for (const attribution of ATTRIBUTIONS) {
      expect(attribution.modificationNotice).toBe(
        MODIFICATION_NOTICE,
      );
    }
  });

  it("keeps the credit to the required statement and no further", () => {
    // Attribution is a ceiling as well as a floor: the licensor asks that no
    // other credit to them appear, so their name must not leak into the fields
    // we wrote ourselves.
    for (const { catalogId } of ATTRIBUTIONS) {
      for (const field of fieldsBesideStatement(catalogId)) {
        expect(field).not.toContain("Wizards");
      }
    }
  });
});

describe("attributionFor", () => {
  it("finds a catalog by id", () => {
    expect(attributionFor("srd-5.1")?.title).toBe("SRD 5.1");
  });

  it("returns undefined for a catalog it does not cover", () => {
    expect(attributionFor("not-a-catalog")).toBeUndefined();
  });
});
