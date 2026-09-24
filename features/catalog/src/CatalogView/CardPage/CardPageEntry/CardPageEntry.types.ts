import type {
  Card,
  CardLayout,
  CardThemeId,
  CardTypefaceId,
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
  /** The faces it is set in, which decide where its split falls. */
  typeface?: CardTypefaceId | undefined;
  /** Which of the entry's cards to draw, counted from zero. */
  from: number;
  /** How many of them, which is what the sheet had room for. */
  count: number;
  /** Told how many cards the entry turned out to be. */
  onFaceCount: (report: FaceCountReport) => void;
  /**
   * Put on every card this draws, rather than on one box around them.
   *
   * An entry is a run of slots in the sheet's grid and not a group, so there
   * is no box here to hang anything on. The sheet uses it for the cut guides,
   * which belong to each card that gets cut out.
   */
  faceClassName?: string | undefined;
}

/** What reporting an entry's cost needs. */
export interface UseReportedFaceCountOptions {
  /** The entry that was measured. */
  cardId: string;
  /** How many cards it turned out to be. */
  faceCount: number;
  /** Whether that came from a measurement or is standing in for one. */
  measured: boolean;
  /** Told the answer. Has to be stable, or the report repeats forever. */
  onFaceCount: (report: FaceCountReport) => void;
}
