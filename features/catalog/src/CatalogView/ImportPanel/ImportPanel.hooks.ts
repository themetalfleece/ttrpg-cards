import { useCallback, useState } from "react";

import { UNREADABLE_FILE } from "./ImportPanel.constants";
import type {
  ImportSource,
  UseImportSourceOptions,
} from "./ImportPanel.types";

/**
 * The document the reader is putting together, whether they typed it or
 * picked it off their disk.
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
    onImport(text);
    setText("");
  }, [onImport, text]);

  const chooseFile = useCallback(
    (file: File) => {
      void file.text().then(
        (source) => {
          setProblem(undefined);
          onImport(source);
        },
        () => {
          setProblem(UNREADABLE_FILE);
        },
      );
    },
    [onImport],
  );

  return { text, problem, setText, submit, chooseFile };
}
