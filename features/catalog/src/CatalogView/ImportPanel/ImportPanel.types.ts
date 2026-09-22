import type {
  BundledSample,
  ImportSummary,
} from "../CatalogView.types";

/** Where the reader brings their own cards from. */
export interface ImportPanelProps {
  /** Called with the documents the reader pasted or chose, in their order. */
  onImport: (sources: readonly string[]) => void;
  /** Called when the reader wants the bundled cards back on the page. */
  onClear: () => void;
  /** What they have brought, or undefined until they bring something. */
  summary: ImportSummary | undefined;
  /** How much of the bundled catalog the page is showing until then. */
  bundled: BundledSample;
  /** Passed through for a consumer that positions the panel. */
  className?: string | undefined;
}

/** What reading documents off the reader's machine needs. */
export interface UseImportSourceOptions {
  /** Called with the documents, once there are any to hand over. */
  onImport: (sources: readonly string[]) => void;
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
  /** Reads the files the reader chose, and hands those over instead. */
  readonly chooseFiles: (files: readonly File[]) => void;
}
