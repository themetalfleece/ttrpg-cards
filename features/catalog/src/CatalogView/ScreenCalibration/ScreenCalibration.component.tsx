import { SCREEN_SCALE_RANGE } from "@ttrpg-cards/core";
import { Slider } from "@ttrpg-cards/ui/Slider";

import {
  CALIBRATION_HINT,
  CALIBRATION_LABEL,
} from "./ScreenCalibration.constants";
import { scaleReadout } from "./ScreenCalibration.data";
import type { ScreenCalibrationProps } from "./ScreenCalibration.types";

/**
 * Matches the preview to the world, by having a reader hold a card against
 * the display.
 *
 * A CSS millimetre is not a millimetre. The specification fixes an inch at 96
 * pixels, so a card declared 63mm wide paints 238 pixels wide whatever the
 * display is, and on anything other than a 96 pixel per inch panel that is not
 * 63mm. Nothing in the browser reports a display's real density, so there is
 * nothing to correct it from and no way to do this without asking.
 *
 * So the reader is asked: hold a card against the screen and drag until the
 * two match. The ratio that results scales the preview, and nothing else.
 *
 * The cards on the sheet are what a reader matches against, rather than an
 * outline drawn beside the slider. The cards are the thing being got right,
 * they are on the same page, and every size is drawn at the scale, so a match
 * at one is a match at all of them. An outline was a second thing to look at
 * that said no more than the first.
 *
 * What the control does not say for itself goes in the aside: that it changes
 * the preview and never the print, which is the one thing a reader could
 * reasonably fear about dragging it.
 */
export function ScreenCalibration({
  scale,
  onScaleChange,
  className,
}: ScreenCalibrationProps) {
  return (
    <Slider
      label={CALIBRATION_LABEL}
      value={scale}
      minimum={SCREEN_SCALE_RANGE.minimum}
      maximum={SCREEN_SCALE_RANGE.maximum}
      step={SCREEN_SCALE_RANGE.step}
      onValueChange={onScaleChange}
      readout={scaleReadout(scale)}
      hint={CALIBRATION_HINT}
      className={className}
    />
  );
}
