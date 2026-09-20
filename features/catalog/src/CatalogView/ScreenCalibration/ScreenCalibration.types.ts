/** What matching the preview to the world needs. */
export interface ScreenCalibrationProps {
  /** How much the preview is scaled by, where 1 is CSS taken at its word. */
  scale: number;
  /** Called with the scale the reader dragged to. */
  onScaleChange: (scale: number) => void;
  /** Passed through for a consumer that positions the control. */
  className?: string | undefined;
}
