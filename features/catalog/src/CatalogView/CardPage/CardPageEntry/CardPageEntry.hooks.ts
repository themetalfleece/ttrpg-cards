import { useEffect } from "react";

import type { UseReportedFaceCountOptions } from "./CardPageEntry.types";

/** Tells the sheet how many cards the entry turned out to be, once it knows. */
export function useReportedFaceCount({
  cardId,
  faceCount,
  measured,
  onFaceCount,
}: UseReportedFaceCountOptions): void {
  useEffect(() => {
    onFaceCount({ cardId, faceCount, measured });
  }, [cardId, faceCount, measured, onFaceCount]);
}
