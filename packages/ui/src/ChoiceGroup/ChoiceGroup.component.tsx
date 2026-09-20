// The group reports what the reader picked, so it runs in the browser.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import clsx from "clsx";
import { RadioGroup } from "radix-ui";
import { useId } from "react";

import styles from "./ChoiceGroup.module.css";
import type { ChoiceGroupProps } from "./ChoiceGroup.types";

/**
 * A small set of choices, exactly one of which is picked, drawn as a
 * segmented control.
 *
 * Radio semantics rather than a listbox, because the whole set is short enough
 * to show at once and a reader comparing two of them should not have to open
 * anything. A longer set wants a select instead.
 *
 * The value is narrowed back to one of the options on the way out, so a caller
 * holding a union gets its own type back without asserting it.
 */
export function ChoiceGroup<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: ChoiceGroupProps<Value>) {
  const labelId = useId();

  const handleValueChange = (picked: string) => {
    const option = options.find(
      (candidate) => candidate.value === picked,
    );

    if (option !== undefined) {
      onValueChange(option.value);
    }
  };

  return (
    <Box className={clsx(styles.group, className)}>
      <Box as="span" className={styles.label} id={labelId}>
        {label}
      </Box>
      <RadioGroup.Root
        className={styles.options}
        value={value}
        onValueChange={handleValueChange}
        orientation="horizontal"
        aria-labelledby={labelId}
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option.value}
            className={styles.option}
            value={option.value}
          >
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </Box>
  );
}
