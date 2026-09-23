import { Box } from "@ttrpg-cards/ui/Box";

import {
  BLANK_PAGES_INSTRUCTION,
  DUPLEX_SUMMARY,
  flipInstruction,
} from "./DuplexNote.constants";
import styles from "./DuplexNote.module.css";
import type { DuplexNoteProps } from "./DuplexNote.types";

/**
 * What the printer has to be set to once continuations are going on the back
 * of their own slot.
 *
 * Shown only while that is on, because none of it is true otherwise and a
 * standing instruction a reader cannot act on is noise. Both halves are things
 * the app cannot do for them: a browser cannot ask for double-sided printing,
 * and it cannot stop a driver dropping the blank backs. Getting either wrong
 * spoils the whole run rather than one card, so this says which way we laid
 * the sheets out instead of leaving them to work it out from the output.
 */
export function DuplexNote({ flipEdge }: DuplexNoteProps) {
  return (
    <Box className={styles.note}>
      <Box as="p" className={styles.summary}>
        {DUPLEX_SUMMARY}
      </Box>
      <ul className={styles.instructions}>
        <li>{flipInstruction({ flipEdge })}</li>
        <li>{BLANK_PAGES_INSTRUCTION}</li>
      </ul>
    </Box>
  );
}
