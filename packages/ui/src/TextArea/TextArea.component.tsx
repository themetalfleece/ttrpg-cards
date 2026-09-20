// The field reports what the reader typed, so it runs in the browser.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import clsx from "clsx";
import { useId, type ChangeEvent } from "react";

import styles from "./TextArea.module.css";
import type { TextAreaProps } from "./TextArea.types";

/** How many lines tall the field is when a consumer does not say. */
const DEFAULT_ROWS = 8;

/**
 * Several lines of text a reader types or pastes.
 *
 * The label is a real label rather than a placeholder, because a placeholder
 * is gone the moment there is anything in the field and a reader who looks
 * away has no way to get it back.
 *
 * Spell checking is off: what goes in here is content the reader brought, and
 * a page of red underlines says nothing useful about it.
 */
export function TextArea({
  label,
  value,
  onValueChange,
  placeholder,
  rows = DEFAULT_ROWS,
  className,
}: TextAreaProps) {
  const fieldId = useId();

  const handleChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    onValueChange(event.target.value);
  };

  return (
    <Box className={clsx(styles.field, className)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        className={styles.input}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
      />
    </Box>
  );
}
