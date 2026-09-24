// The field reports what the reader typed, so it runs in the browser.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import clsx from "clsx";
import {
  useId,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type WheelEvent,
} from "react";

import { COMMIT_KEY } from "./NumberField.constants";
import styles from "./NumberField.module.css";
import type { NumberFieldProps } from "./NumberField.types";

/**
 * A measurement typed into a box, for a quantity where the reader already
 * knows the number they want.
 *
 * Controlled, but not on every keystroke. Half a number is not a number: a
 * field that reported each one to a caller holding it to a range would take
 * the 1 off a reader on their way to 148, and they could never get there. So
 * what is being typed is held here, and the caller is told when the reader has
 * finished, which is when they leave the field or press Enter.
 *
 * What the caller does with it then comes straight back: the field shows
 * `value` again the moment it has reported, so a number outside the range is
 * visibly corrected rather than left standing in a box that lies.
 *
 * A wheel over it while it has focus leaves the field rather than stepping
 * the number, which is the one place the two decisions above meet badly. A
 * browser steps a focused number input on the wheel, and reporting late means
 * a reader who typed a measurement and then scrolled to look at what it did
 * would not see the number moving under them.
 */
export function NumberField({
  label,
  value,
  minimum,
  maximum,
  step,
  onValueChange,
  unit,
  className,
}: NumberFieldProps) {
  // What is being typed, or nothing while the field is showing `value`.
  const [typed, setTyped] = useState<string | undefined>(undefined);
  const fieldId = useId();
  const unitId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTyped(event.target.value);
  };

  const commit = () => {
    if (typed === undefined) {
      return;
    }

    const asked = Number.parseFloat(typed);

    // Back to showing `value` either way. The caller may hold what was asked
    // for to a range, and the field has to show what it settled on rather
    // than what was asked.
    setTyped(undefined);

    if (Number.isFinite(asked)) {
      onValueChange(asked);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === COMMIT_KEY) {
      commit();
    }
  };

  // Scrolling away is leaving the field, so it is treated as leaving it: the
  // blur commits whatever was typed and takes the focus the browser would
  // otherwise step. Cancelling the event is not an option, because React
  // listens for the wheel passively and a `preventDefault` there does
  // nothing.
  const handleWheel = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  return (
    <Box className={clsx(styles.field, className)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <Box className={styles.control}>
        <input
          id={fieldId}
          className={styles.input}
          type="number"
          inputMode="decimal"
          value={typed ?? String(value)}
          min={minimum}
          max={maximum}
          step={step}
          onChange={handleChange}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          // Described by the unit rather than named with it, so the unit is
          // announced once after the number instead of being folded into the
          // question the label already asks.
          aria-describedby={unit === undefined ? undefined : unitId}
        />
        {unit !== undefined && (
          <Box as="span" className={styles.unit} id={unitId}>
            {unit}
          </Box>
        )}
      </Box>
    </Box>
  );
}
