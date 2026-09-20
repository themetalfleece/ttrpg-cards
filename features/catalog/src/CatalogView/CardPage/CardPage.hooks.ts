import type { CardLayout } from "@ttrpg-cards/card";
import { useCallback, useMemo, useState } from "react";

import type {
  FaceCountReport,
  PageFill,
  UsePageFillOptions,
} from "./CardPage.types";

/** What has been counted before anything has been measured. */
const NOTHING_COUNTED: ReadonlyMap<string, number> = new Map();

/**
 * The entries that fit on the sheet, worked out as they are measured.
 *
 * How many cards an entry becomes is only known once the browser has laid it
 * out, and by then the sheet has already been filled. So the sheet fills
 * optimistically, every entry reports what it cost, and `SheetLayout.fill`
 * gives back whatever no longer fits. That settles rather than oscillates, for
 * the reason written down on `fill` itself.
 *
 * All this holds is the counts. What they mean for a sheet is the sheet's own
 * question.
 */
export function usePageFill({
  cards,
  layout,
  sheet,
}: UsePageFillOptions): PageFill {
  const [faceCounts, setFaceCounts] =
    useState<ReadonlyMap<string, number>>(NOTHING_COUNTED);
  const [countedAt, setCountedAt] = useState<CardLayout>(layout);

  // A card cut to another size splits somewhere else, so what was counted at
  // the old geometry says nothing about this one and is dropped rather than
  // deciding a sheet it was never measured for.
  if (countedAt !== layout) {
    setCountedAt(layout);
    setFaceCounts(NOTHING_COUNTED);
  }

  const reportFaceCount = useCallback((report: FaceCountReport) => {
    setFaceCounts((current) => {
      if (current.get(report.cardId) === report.faceCount) {
        return current;
      }

      const next = new Map(current);

      next.set(report.cardId, report.faceCount);

      return next;
    });
  }, []);

  const shown = useMemo(
    () => sheet.fill({ items: cards, layout, faceCounts }),
    [sheet, cards, layout, faceCounts],
  );

  return { shown, reportFaceCount };
}
