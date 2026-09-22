import { useCallback, useState } from "react";

import { UNREADABLE_FILE } from "./ImportPanel.constants";
import type {
  ImportSource,
  UseImportSourceOptions,
} from "./ImportPanel.types";

/**
 * The documents the reader is putting together, whether they typed one or
 * picked them off their disk.
 *
 * The field empties once its contents have been handed over, because each
 * document adds to the cards already on the page: left where it was, the next
 * press of the button would add the same cards a second time. It is the next
 * document's buffer rather than a record of the last one.
 *
 * The read happens in the browser, like everything else here: the file is
 * never uploaded and never leaves the machine it was opened on.
 *
 * A file that cannot be read is reported rather than swallowed. A reader whose
 * permissions or disk refused them has no other way to tell that from a
 * document that simply held no cards.
 */
export function useImportSource({
  onImport,
}: UseImportSourceOptions): ImportSource {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | undefined>(
    undefined,
  );

  const submit = useCallback(() => {
    setProblem(undefined);
    onImport([text]);
    setText("");
  }, [onImport, text]);

  // Read together and handed over together, so the summary counts one import
  // rather than reporting the last file as though the others had not arrived.
  // A file the disk refused stops the lot, because a reader told "3 cards" out
  // of four files has no way to tell which one went missing.
  const chooseFiles = useCallback(
    (files: readonly File[]) => {
      void Promise.all(files.map((file) => file.text())).then(
        (sources) => {
          setProblem(undefined);
          onImport(sources);
        },
        () => {
          setProblem(UNREADABLE_FILE);
        },
      );
    },
    [onImport],
  );

  return { text, problem, setText, submit, chooseFiles };
}
