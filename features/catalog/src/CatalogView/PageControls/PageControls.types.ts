import type {
  SheetLayout,
  SheetLayoutOverrides,
} from "@ttrpg-cards/printer";

/** What a reader can change about the sheet the cards are printed on. */
export interface PageControlsProps {
  /**
   * The sheet as it stands, which is what every control here shows.
   *
   * The sheet rather than its settings one by one: it already answers every
   * question a control asks, including what a paper the reader measured came
   * out as once it was held to what a sheet can be.
   */
  sheet: SheetLayout;
  /**
   * Called with the one setting that changed, leaving the rest alone.
   *
   * One callback rather than one per control, because that is the shape
   * `SheetLayout.with` already takes and a list of them here would be a
   * second copy of the sheet's own surface.
   */
  onSheetChange: (overrides: SheetLayoutOverrides) => void;
  /**
   * Whether the page is finished and would print as what is on screen. A
   * print asked for before this is true waits for it.
   */
  printable: boolean;
  /** Passed through for a consumer that positions the controls. */
  className?: string | undefined;
}
