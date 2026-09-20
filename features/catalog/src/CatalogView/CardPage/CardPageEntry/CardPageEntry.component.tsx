import { CardSetView, useCardSet } from "@ttrpg-cards/ui/CardSetView";

import { useReportedFaceCount } from "./CardPageEntry.hooks";
import type { CardPageEntryProps } from "./CardPageEntry.types";

/**
 * One entry on the sheet, which tells the sheet what it cost.
 *
 * The sheet has to know how many cards an entry became before it can know how
 * many entries fit, and that is only settled once the browser has measured.
 * So the measurement is made here and the answer goes two ways: up to the
 * sheet as a count, and into the view as the set to draw. The view takes the
 * set rather than working one out, so the entry is measured once.
 */
export function CardPageEntry({
  card,
  layout,
  theme,
  onFaceCount,
  className,
}: CardPageEntryProps) {
  const set = useCardSet({ card, layout });

  useReportedFaceCount({
    cardId: card.id,
    faceCount: set.faces.length,
    onFaceCount,
  });

  return (
    <CardSetView
      card={card}
      layout={layout}
      set={set}
      theme={theme}
      className={className}
    />
  );
}
