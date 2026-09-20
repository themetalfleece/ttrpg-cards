import type { ImportSummary } from "../CatalogView.types";

/** Where the reader brings their own cards from. */
export interface ImportPanelProps {
  /** Called with the document the reader pasted or chose. */
  onImport: (source: string) => void;
  /** Called when the reader wants the bundled cards back on the page. */
  onClear: () => void;
  /** What they have brought, or undefined until they bring something. */
  summary: ImportSummary | undefined;
  /** Passed through for a consumer that positions the panel. */
  className?: string | undefined;
}

/** What reading a document off the reader's machine needs. */
export interface UseImportSourceOptions {
  /** Called with the document, once there is one to hand over. */
  onImport: (source: string) => void;
}

/** The document the reader is putting together, and what they can do to it. */
export interface ImportSource {
  /** What is in the field. */
  readonly text: string;
  /** What went wrong reading a file, when something did. */
  readonly problem: string | undefined;
  /** Replaces what is in the field. */
  readonly setText: (text: string) => void;
  /** Hands what is in the field over to be read. */
  readonly submit: () => void;
  /** Reads a file the reader chose, and hands that over instead. */
  readonly chooseFile: (file: File) => void;
}
