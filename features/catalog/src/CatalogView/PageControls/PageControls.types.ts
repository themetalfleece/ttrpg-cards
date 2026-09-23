import type {
  FlipEdgeName,
  PageOrientation,
  PageSizeName,
  PrintSidesName,
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
  /** How many sides of the paper the job prints on. */
  sides: PrintSidesName;
  /** Called with the way of printing the reader picked. */
  onSidesChange: (sides: PrintSidesName) => void;
  /** The edge the printer turns the sheet about between the two sides. */
  flipEdge: FlipEdgeName;
  /** Called with the flip edge the reader picked. */
  onFlipEdgeChange: (flipEdge: FlipEdgeName) => void;
  /**
   * Whether the page is finished and would print as what is on screen. A
   * print asked for before this is true waits for it.
   */
  printable: boolean;
  /** Passed through for a consumer that positions the controls. */
  className?: string | undefined;
}
