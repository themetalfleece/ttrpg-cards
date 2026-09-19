import { ATTRIBUTIONS } from "./attribution.constants";
import type { CatalogAttribution } from "./attribution.types";

/**
 * The attribution a catalog id carries, or undefined when it has none.
 *
 * @example
 * ```ts
 * attributionFor("srd-5.1")?.title; // "SRD 5.1"
 * attributionFor("not-a-catalog"); // undefined
 * ```
 */
export function attributionFor(
  catalogId: string,
): CatalogAttribution | undefined {
  return ATTRIBUTIONS.find(
    (attribution) => attribution.catalogId === catalogId,
  );
}
