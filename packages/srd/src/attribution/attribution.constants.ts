import type {
  CatalogAttribution,
  ContentLicense,
} from "./attribution.types";

/** The licence both bundled catalogs are redistributed under. */
export const CC_BY_4_0: ContentLicense = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/legalcode",
};

/**
 * Our declaration that the material was modified, required by CC BY 4.0
 * section 3(a)(1)(B). Extracting a published document into structured data is
 * a modification, so this ships wherever the statements do.
 */
export const MODIFICATION_NOTICE =
  "The text of each entry was extracted from the published documents and restructured as card data.";

/**
 * The attribution statements, reproduced verbatim from the licensor's own
 * legal information page in each document.
 *
 * These strings are the single exemption to the rule that no outside product
 * is named in this repository: the licence compels this exact text, character
 * for character, including the curly quotation marks. Never paraphrase one,
 * never reflow one to fit a line width, and never let a formatter or a codemod
 * rewrite one. `attribution.test.ts` pins both.
 *
 * The statements are also a ceiling. Both documents ask that no other credit
 * to the licensor appear, so nothing beyond these lines may name them or imply
 * their endorsement.
 */
export const ATTRIBUTIONS: readonly CatalogAttribution[] = [
  {
    catalogId: "srd-5.2.1",
    title: "SRD 5.2.1",
    statement:
      "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.",
    sourceUrl: "https://www.dndbeyond.com/srd",
    license: CC_BY_4_0,
    modificationNotice: MODIFICATION_NOTICE,
  },
  {
    catalogId: "srd-5.1",
    title: "SRD 5.1",
    statement:
      "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.",
    sourceUrl:
      "https://dnd.wizards.com/resources/systems-reference-document",
    license: CC_BY_4_0,
    modificationNotice: MODIFICATION_NOTICE,
  },
];
