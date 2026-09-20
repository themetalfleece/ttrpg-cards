import { Box } from "@ttrpg-cards/ui/Box";
import clsx from "clsx";

import styles from "./AttributionNotice.module.css";
import type { AttributionNoticeProps } from "./AttributionNotice.types";

/**
 * The credit the bundled content is redistributed under, shown wherever that
 * content is.
 *
 * Every part of it is obliged: the statement reproduced exactly as the
 * licensor wrote it, a reachable link to their published source, the licence
 * named and linked, and our declaration that we modified the material. A
 * notice missing any one of them is not compliant, so none of this is styling
 * that can be trimmed to fit.
 *
 * It is also a ceiling. Nothing here may credit the licensor beyond what the
 * statement says or suggest they endorse this.
 */
export function AttributionNotice({
  attributions,
  className,
}: AttributionNoticeProps) {
  if (attributions.length === 0) {
    return null;
  }

  return (
    <footer className={clsx(styles.notice, className)}>
      {attributions.map((attribution) => (
        <Box key={attribution.catalogId} className={styles.entry}>
          <Box as="p" className={styles.statement}>
            {attribution.statement}
          </Box>
          <Box as="p" className={styles.links}>
            <a href={attribution.sourceUrl}>{attribution.title}</a>
            <Box as="span" className={styles.divider}>
              ·
            </Box>
            <a href={attribution.license.url}>
              {attribution.license.name}
            </a>
          </Box>
          <Box as="p">{attribution.modificationNotice}</Box>
        </Box>
      ))}
    </footer>
  );
}
