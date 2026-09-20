// The panel reads what the reader brought, so it runs in the browser.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import { Button } from "@ttrpg-cards/ui/Button";
import { FilePicker } from "@ttrpg-cards/ui/FilePicker";
import { TextArea } from "@ttrpg-cards/ui/TextArea";
import clsx from "clsx";

import {
  CLEAR_LABEL,
  DOCUMENT_FILE_TYPES,
  IMPORT_LABEL,
  NOTHING_READ,
  PANEL_TITLE,
  PASTE_LABEL,
  PASTE_PLACEHOLDER,
  PASTE_ROWS,
  UPLOAD_LABEL,
  cardsReadSummary,
  unreadLine,
  unreadSummary,
} from "./ImportPanel.constants";
import { useImportSource } from "./ImportPanel.hooks";
import styles from "./ImportPanel.module.css";
import type { ImportPanelProps } from "./ImportPanel.types";

/**
 * Where a reader brings cards of their own, by pasting a document or opening
 * one.
 *
 * Deliberately small. The cards go onto the same sheet the bundled ones were
 * on, drawn with the same controls, because a reader's own card is a card and
 * there is nothing about it to render differently.
 *
 * Everything happens here in the browser. The document is read where it was
 * handed over, it is not uploaded, and nothing about it is sent anywhere.
 *
 * What did not read as a card is listed with the line it starts at. A reader
 * who pasted forty cards and got thirty-nine has no other way to find the one
 * that went missing, and a panel that quietly drops it is worse than one that
 * refuses the lot.
 */
export function ImportPanel({
  onImport,
  onClear,
  summary,
  className,
}: ImportPanelProps) {
  const source = useImportSource({ onImport });
  const broughtCount = summary?.totalCount ?? 0;
  const issues = summary?.issues ?? [];
  // Of the document just added, not of the set: a reader who already has
  // cards on the page needs to know that the last one brought none.
  const nothingRead =
    summary !== undefined && summary.addedCount === 0;

  return (
    <Box className={clsx(styles.panel, className)}>
      <h2 className={styles.title}>{PANEL_TITLE}</h2>
      <TextArea
        label={PASTE_LABEL}
        value={source.text}
        onValueChange={source.setText}
        placeholder={PASTE_PLACEHOLDER}
        rows={PASTE_ROWS}
      />
      <Box className={styles.actions}>
        <Button
          onPress={source.submit}
          disabled={source.text.trim() === ""}
        >
          {IMPORT_LABEL}
        </Button>
        <FilePicker
          accept={DOCUMENT_FILE_TYPES}
          onFile={source.chooseFile}
        >
          {UPLOAD_LABEL}
        </FilePicker>
        {broughtCount > 0 && (
          <Button onPress={onClear}>{CLEAR_LABEL}</Button>
        )}
      </Box>
      {source.problem !== undefined && (
        <Box as="p" className={styles.problem}>
          {source.problem}
        </Box>
      )}
      {nothingRead && (
        <Box as="p" className={styles.problem}>
          {NOTHING_READ}
        </Box>
      )}
      {broughtCount > 0 && (
        <Box as="p" className={styles.summary}>
          {cardsReadSummary(broughtCount)}
        </Box>
      )}
      {issues.length > 0 && (
        <Box className={styles.unread}>
          <Box as="p">{unreadSummary(issues.length)}</Box>
          <ul className={styles.issues}>
            {issues.map((issue) => (
              <li key={`${issue.line}:${issue.message}`}>
                <Box as="span" className={styles.line}>
                  {unreadLine(issue.line)}
                </Box>
                {issue.message}
              </li>
            ))}
          </ul>
        </Box>
      )}
    </Box>
  );
}
