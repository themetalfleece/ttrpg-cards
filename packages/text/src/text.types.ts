import type { Static } from "@ttrpg-cards/validator";

import type {
  TextMarkSchema,
  TextRunSchema,
  TextRunsSchema,
} from "./text.schemas";

/** A mark a run of text carries, such as strong or emphasis. */
export type TextMark = Static<typeof TextMarkSchema>;

/** A stretch of text that reads the same way throughout. */
export type TextRun = Static<typeof TextRunSchema>;

/** Text the reader sees, as an ordered list of runs. */
export type TextRuns = Static<typeof TextRunsSchema>;
