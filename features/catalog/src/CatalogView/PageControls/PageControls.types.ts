import type {
  PageOrientation,
  PageSizeName,
} from "@ttrpg-cards/printer";

/** What a reader can change about the sheet the cards are printed on. */
export interface PageControlsProps {
  /** The paper the sheet is printed on. */
  paper: PageSizeName;
  /** Called with the paper the reader picked. */
  onPaperChange: (paper: PageSizeName) => void;
  /** Which way round that paper goes. */
  orientation: PageOrientation;
  /** Called with the orientation the reader picked. */
  onOrientationChange: (orientation: PageOrientation) => void;
  /** Passed through for a consumer that positions the controls. */
  className?: string | undefined;
}
