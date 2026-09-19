import type { TextRun } from "./pdf-text.ts";
import { isBoldFont } from "./text.ts";

export type Edition = "5.1" | "5.2.1";

/** Semantic role of a line, decided from its fonts. */
export type LineRole =
  | "chapter-heading"
  | "entry-name"
  | "level"
  | "label"
  | "body"
  | "table-caption"
  | "table-header"
  | "table-cell"
  | "stat-block";

/** Everything that differs between the two documents' typography and conventions. */
export interface EditionProfile {
  readonly edition: Edition;
  /** Baseline-to-baseline distance of body text. */
  readonly leading: number;
  /** Whether line-final hyphens can be typesetter word breaks (5.1 marks every hyphen explicitly). */
  readonly dehyphenate: boolean;
  /** Role of a single run; `undefined` means "same as the surrounding text". */
  runRole(run: TextRun): LineRole | undefined;
}

export interface SrdSource {
  readonly catalogId: string;
  readonly title: string;
  readonly fileName: string;
  readonly url: string;
  readonly sha256: string;
  readonly profile: EditionProfile;
}

const near = (value: number, target: number, tolerance = 0.15) =>
  Math.abs(value - target) <= tolerance;

/** Header field labels; 5.1 misprints one as "Component:". */
export const FIELD_LABEL =
  /^(Casting Time|Range|Components?|Duration):/;

/** Labels are bold; most 5.2.1 spells set them in GillSans, a few (e.g. Chill Touch) in Cambria. */
const isLabel = (run: TextRun) =>
  isBoldFont(run.font) && FIELD_LABEL.test(run.text);

const profile51: EditionProfile = {
  edition: "5.1",
  leading: 11.75,
  dehyphenate: false,
  runRole(run) {
    if (run.size >= 16) return "chapter-heading";
    if (isLabel(run)) return "label";
    if (
      run.font.startsWith("GillSans-SemiBold") &&
      near(run.size, 12)
    )
      return "entry-name";
    if (run.font.startsWith("Calibri")) {
      if (near(run.size, 12)) return "table-caption";
      return run.font.includes("Bold")
        ? "table-header"
        : "table-cell";
    }
    if (run.font.startsWith("Cambria") || run.font === "Symbol")
      return "body";
    return undefined;
  },
};

const profile521: EditionProfile = {
  edition: "5.2.1",
  leading: 12,
  dehyphenate: true,
  runRole(run) {
    if (run.size >= 16) return "chapter-heading";
    if (isLabel(run)) return "label";
    if (
      run.font.startsWith("Optima") ||
      (run.font.includes("-SC700") && run.size < 11)
    ) {
      return "stat-block";
    }
    if (run.font.startsWith("GillSans")) {
      if (
        run.font.startsWith("GillSans-SemiBold") &&
        near(run.size, 12)
      )
        return "entry-name";
      if (near(run.size, 14.6)) return "stat-block";
      if (
        near(run.size, 12) ||
        near(run.size, 6) ||
        near(run.size, 9.8)
      )
        return "stat-block";
      if (near(run.size, 10.5)) return "table-caption";
      if (near(run.size, 9.3)) return "table-header";
      if (near(run.size, 9.5)) return "table-cell";
    }
    if (run.font.startsWith("Cambria")) return "body";
    return undefined;
  },
};

export const SRD_SOURCES: readonly SrdSource[] = [
  {
    catalogId: "srd-5.1",
    title: "SRD 5.1",
    fileName: "SRD_CC_v5.1.pdf",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf",
    sha256:
      "2504d2a0abb0a4d491a939be4f17910a2dde0312570ab8d208080225ccf0a1f0",
    profile: profile51,
  },
  {
    catalogId: "srd-5.2.1",
    title: "SRD 5.2.1",
    fileName: "SRD_CC_v5.2.1.pdf",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    sha256:
      "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    profile: profile521,
  },
];
