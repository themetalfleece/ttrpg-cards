// The slider reports what the reader dragged, so it runs in the browser.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import { Tooltip } from "@ttrpg-cards/ui/Tooltip";
import clsx from "clsx";
import { Slider as SliderPrimitive } from "radix-ui";
import { useId } from "react";

import {
  SLIDER_HINT_GLYPH,
  SLIDER_HINT_LABEL,
} from "./Slider.constants";
import styles from "./Slider.module.css";
import type { SliderProps } from "./Slider.types";

/** Where the value goes when Radix hands back a range it did not have to. */
const FIRST_THUMB = 0;

/**
 * A value dragged along a range, for a quantity with no meaningful steps to
 * name. A short set of named choices wants a `ChoiceGroup` instead.
 */
export function Slider({
  label,
  value,
  minimum,
  maximum,
  step,
  onValueChange,
  readout,
  hint,
  className,
}: SliderProps) {
  const labelId = useId();

  const handleValueChange = (dragged: number[]) => {
    const next = dragged[FIRST_THUMB];

    if (next !== undefined) {
      onValueChange(next);
    }
  };

  return (
    <Box className={clsx(styles.slider, className)}>
      <Box className={styles.heading}>
        <Box as="span" className={styles.label} id={labelId}>
          {label}
        </Box>
        {hint !== undefined && (
          // A bare element rather than the `Button` primitive: Radix clones
          // the trigger and hands it a ref, which nothing here forwards. It is
          // also not a button in the sense that one is: nothing happens when
          // it is pressed, it is there to be rested on and tabbed to.
          <Tooltip content={hint}>
            <button
              type="button"
              className={styles.hint}
              aria-label={SLIDER_HINT_LABEL}
            >
              {SLIDER_HINT_GLYPH}
            </button>
          </Tooltip>
        )}
        {readout !== undefined && (
          <Box as="span" className={styles.readout}>
            {readout}
          </Box>
        )}
      </Box>
      <SliderPrimitive.Root
        className={styles.track}
        value={[value]}
        min={minimum}
        max={maximum}
        step={step}
        onValueChange={handleValueChange}
        aria-labelledby={labelId}
      >
        <SliderPrimitive.Track className={styles.rail}>
          <SliderPrimitive.Range className={styles.filled} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className={styles.thumb} />
      </SliderPrimitive.Root>
    </Box>
  );
}
