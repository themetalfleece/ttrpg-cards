import { CardFace } from "@ttrpg-cards/ui/CardFace";
import { useCardSet } from "@ttrpg-cards/ui/CardSetView";

import { useReportedFaceCount } from "./CardPageEntry.hooks";
import type { CardPageEntryProps } from "./CardPageEntry.types";

/**
 * One entry's cards on one sheet, which tell the sheet what the entry cost.
 *
 * The sheet has to know how many cards an entry became before it can know how
 * many fit, and that is only settled once the browser has measured. So the
 * measurement is made here and the answer goes two ways: up to the sheet as a
 * count, and into the faces below as the set to draw.
 *
 * Cards rather than a set, and no box around them. A sheet is a grid of cards
 * and every one of them lands in it on its own account, which is what lets an
 * entry start in the last column of a row or the last slot of a sheet and
 * finish on the next. The entry is measured whole wherever its cards fall,
 * because where the split lands is a property of the entry rather than of the
 * paper it is being printed on.
 */
export function CardPageEntry({
  card,
  layout,
  theme,
  typeface,
  from,
  count,
  onFaceCount,
  faceClassName,
}: CardPageEntryProps) {
  const { set, measured } = useCardSet({ card, layout, typeface });

  useReportedFaceCount({
    cardId: card.id,
    faceCount: set.faces.length,
    measured,
    onFaceCount,
  });

  return (
    <>
      {set.faces.slice(from, from + count).map((face) => (
        <CardFace
          key={face.card.id}
          card={face.card}
          layout={layout}
          position={face.position}
          theme={theme}
          typeface={typeface}
          className={faceClassName}
        />
      ))}
    </>
  );
}
