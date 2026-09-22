// The picker reports the file the reader chose, so it runs in the browser.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import { Button } from "@ttrpg-cards/ui/Button";
import { useRef, type ChangeEvent } from "react";

import styles from "./FilePicker.module.css";
import type { FilePickerProps } from "./FilePicker.types";

/**
 * A button that opens the reader's own file picker and reports what they
 * chose.
 *
 * A file input cannot be styled and cannot be opened from anywhere else, so
 * the input is hidden and a real button stands in front of it. That keeps one
 * button in the codebase rather than two that drift apart.
 *
 * The chosen file is read by whoever asked for it. Nothing here opens it, and
 * nothing here sends it anywhere.
 */
export function FilePicker({
  children,
  accept,
  onFiles,
  multiple,
  disabled,
  className,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePress = (): void => {
    inputRef.current?.click();
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const files = [...(event.target.files ?? [])];

    // Cleared so that choosing the same file twice in a row is still a
    // change. Without it the second choice reports nothing at all.
    event.target.value = "";

    if (files.length > 0) {
      onFiles(files);
    }
  };

  return (
    <Box className={className}>
      <input
        ref={inputRef}
        type="file"
        className={styles.input}
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <Button onPress={handlePress} disabled={disabled}>
        {children}
      </Button>
    </Box>
  );
}
