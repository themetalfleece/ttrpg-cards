import { Catalog } from "./Catalog";
import type { CatalogSource } from "./catalog.types";
import srd51 from "./data/srd-5.1.json";
import srd521 from "./data/srd-5.2.1.json";

/**
 * The bundled catalogs, newest release first.
 *
 * A JSON import widens every literal union to `string`, so the shape is
 * asserted here rather than re-checked on every load: these files are written
 * by our own extraction, which validates them before writing. `bundled.test.ts`
 * holds both to the schema so the assertion cannot quietly go stale.
 */
export const BUNDLED_CATALOGS: readonly Catalog[] = [
  new Catalog({ source: srd521 as unknown as CatalogSource }),
  new Catalog({ source: srd51 as unknown as CatalogSource }),
];

/**
 * The bundled catalog with that id, or undefined when there is none.
 *
 * @example
 * ```ts
 * bundledCatalog("srd-5.1")?.entryCount; // 319
 * bundledCatalog("srd-9.9"); // undefined
 * ```
 */
export function bundledCatalog(id: string): Catalog | undefined {
  return BUNDLED_CATALOGS.find((catalog) => catalog.id === id);
}
