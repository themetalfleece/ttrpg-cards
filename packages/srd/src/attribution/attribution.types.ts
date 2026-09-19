/** A licence, as it is named and linked wherever the catalog is credited. */
export interface ContentLicense {
  /** The short identifier a reader recognises. */
  readonly name: string;
  /** The published legal text. */
  readonly url: string;
}

/**
 * Everything one bundled catalog must show a reader to satisfy its licence.
 *
 * Plain strings, and deliberately so: {@link CatalogAttribution.statement} is
 * reproduced exactly as the licensor wrote it, and text that must not be
 * altered does not belong in a structure built to merge and normalise runs.
 */
export interface CatalogAttribution {
  /** The catalog this credits, matching the id its entries are prefixed with. */
  readonly catalogId: string;
  /** How the catalog is named in our own copy, around the statement. */
  readonly title: string;
  /**
   * The attribution statement, verbatim. Never paraphrase, reflow, or
   * substitute the quotation marks: the licence compels this exact text.
   */
  readonly statement: string;
  /** The licensor's published source, which the reader must be able to reach. */
  readonly sourceUrl: string;
  /** The terms the material is offered under. */
  readonly license: ContentLicense;
  /** Our declaration that the material was modified. */
  readonly modificationNotice: string;
}
