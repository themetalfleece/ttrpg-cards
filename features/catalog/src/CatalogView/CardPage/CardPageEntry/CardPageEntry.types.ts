import type {
  Card,
  CardLayout,
  CardThemeId,
} from "@ttrpg-cards/card";

import type { FaceCountReport } from "../CardPage.types";

/** One entry on the sheet, which tells the sheet what it cost. */
export interface CardPageEntryProps {
  /** What the entry says, whole. */
  card: Card;
  /** The geometry it is cut to. */
  layout: CardLayout;
  /** The colour theme it is drawn in. */
  theme?: CardThemeId | undefined;
  /** Told how many cards the entry turned out to be. */
  onFaceCount: (report: FaceCountReport) => void;
  /** Passed through for a consumer that positions the entry. */
  className?: string | undefined;
}

/** What reporting an entry's cost needs. */
export interface UseReportedFaceCountOptions {
  /** The entry that was measured. */
  cardId: string;
  /** How many cards it turned out to be. */
  faceCount: number;
  /** Told the answer. Has to be stable, or the report repeats forever. */
  onFaceCount: (report: FaceCountReport) => void;
}
