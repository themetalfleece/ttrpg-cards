import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import {
  PAPER_MEASUREMENT_HOMES,
  PAPER_RUNS,
  SKIPPED_DIRECTORIES,
  SOURCE_DIRECTORIES,
  SOURCE_EXTENSIONS,
} from "./print.constants.ts";
import type { CheckResult } from "./print.types.ts";

/** One paper measurement found somewhere it does not belong. */
interface StrayMeasurement {
  /** Where it was found, relative to the workspace and in forward slashes. */
  readonly file: string;
  /** The measurement itself. */
  readonly measurement: number;
}

/**
 * The measurements a published paper is made at, which are the numbers that
 * may appear in only one place.
 *
 * Taken from the harness's own runs rather than from the print package, like
 * every other expectation here. The paper a reader measures is left out: its
 * numbers are typed at runtime and belong to whoever is typing them.
 */
function publishedMeasurements(): readonly number[] {
  const measurements = new Set<number>();

  for (const run of PAPER_RUNS) {
    if (run.typed === true) {
      continue;
    }

    measurements.add(run.widthMillimetres);
    measurements.add(run.heightMillimetres);
  }

  return [...measurements];
}

/**
 * `source` with every comment taken out, so the check reads what runs.
 *
 * A doc comment is allowed to say what a call gives back, and the convention
 * here asks it to: an `@example` showing `// 297` is documentation of the
 * record rather than a second copy laying anything out. What cannot be
 * anywhere but the record is a number a browser will read.
 *
 * Walked rather than matched with a pattern, because a slash means four
 * different things depending on what came before it: a length inside a
 * string, the start of a comment, a division, and the delimiter of a regular
 * expression. Only the last of those is left out, since a regular expression
 * beginning with an escaped slash is not something this repository writes.
 */
function withoutComments(source: string): string {
  const CODE = "code";
  const LINE = "line";
  const BLOCK = "block";
  let state:
    typeof CODE | typeof LINE | typeof BLOCK | "'" | '"' | "`" = CODE;
  let kept = "";

  for (let at = 0; at < source.length; at += 1) {
    const here = source[at] ?? "";
    const next = source[at + 1] ?? "";

    if (state === LINE) {
      if (here === "\n") {
        state = CODE;
        kept += here;
      }

      continue;
    }

    if (state === BLOCK) {
      if (here === "*" && next === "/") {
        state = CODE;
        at += 1;
      }

      continue;
    }

    if (state !== CODE) {
      // Inside a string. An escaped character cannot end it, whatever it is.
      if (here === "\\") {
        kept += here + next;
        at += 1;
        continue;
      }

      if (here === state) {
        state = CODE;
      }

      kept += here;
      continue;
    }

    if (here === "/" && next === "/") {
      state = LINE;
      at += 1;
      continue;
    }

    if (here === "/" && next === "*") {
      state = BLOCK;
      at += 1;
      continue;
    }

    if (here === "'" || here === '"' || here === "`") {
      state = here;
    }

    kept += here;
  }

  return kept;
}

/**
 * Whether `text` writes `measurement` as a number of its own.
 *
 * Bounded on both sides, so 210 is not found inside 1210 or 210.5 and a
 * colour or a pixel length that happens to share the digits is not reported.
 * A decimal point is escaped because the search is a pattern.
 */
function writesMeasurement(options: {
  text: string;
  measurement: number;
}): boolean {
  const digits = String(options.measurement).replace(".", "\\.");

  return new RegExp(`(?<![\\d.])${digits}(?![\\d.])`).test(
    options.text,
  );
}

/** Every source file under `root` that a person wrote by hand. */
async function sourceFiles(root: string): Promise<readonly string[]> {
  const found: string[] = [];

  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.includes(entry.name)) {
          await walk(path);
        }

        continue;
      }

      if (
        SOURCE_EXTENSIONS.some((extension) =>
          entry.name.endsWith(extension),
        )
      ) {
        found.push(path);
      }
    }
  };

  for (const directory of SOURCE_DIRECTORIES) {
    await walk(join(root, directory));
  }

  return found;
}

/**
 * That a paper measurement is written down in one place, and read everywhere
 * else.
 *
 * The check a card measurement already carries, for the sheet. Two papers
 * differ by a few millimetres and a grid is laid out to the millimetre, so a
 * second copy of 297 somewhere is a sheet that keeps laying out correctly
 * right up until the first one moves.
 *
 * A grep rather than a type, because there is no type that can stop somebody
 * typing 210 into a stylesheet. It runs with the print verification rather
 * than in the gate: the gate is the same commands on a clone with no network,
 * and this is one of the things a browser run is for, checking the sheet
 * against what it says about itself.
 *
 * @example
 * ```ts
 * (await paperMeasurementsAreInOnePlace({ root })).passed; // true
 * ```
 */
export async function paperMeasurementsAreInOnePlace(options: {
  root: string;
}): Promise<CheckResult> {
  const measurements = publishedMeasurements();
  const files = await sourceFiles(options.root);
  const strays: StrayMeasurement[] = [];

  for (const path of files) {
    const file = relative(options.root, path).split(sep).join("/");

    if (PAPER_MEASUREMENT_HOMES.includes(file)) {
      continue;
    }

    const text = withoutComments(await readFile(path, "utf8"));

    for (const measurement of measurements) {
      if (writesMeasurement({ text, measurement })) {
        strays.push({ file, measurement });
      }
    }
  }

  return {
    name: "A paper measurement is written down in one place",
    passed: strays.length === 0,
    detail:
      strays.length === 0
        ? `${measurements.join(", ")} appear in ${PAPER_MEASUREMENT_HOMES.length} files and nowhere else, out of ${files.length} searched`
        : strays
            .map((stray) => `${stray.measurement} in ${stray.file}`)
            .join("; "),
  };
}
