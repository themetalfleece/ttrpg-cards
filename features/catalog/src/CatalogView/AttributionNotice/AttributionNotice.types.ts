import type { CatalogAttribution } from "@ttrpg-cards/srd";

/** What the licence obliges the page to show for the content on it. */
export interface AttributionNoticeProps {
  /** The credits for every catalog the page is drawing from. */
  attributions: readonly CatalogAttribution[];
  /** Passed through for a consumer that positions the notice. */
  className?: string | undefined;
}
