/**
 * Proves the duplex sheet on paper rather than in arithmetic.
 *
 * Run with `pnpm verify:print` from the repository root, which builds the
 * export first and then says where it put it. The browser is installed once,
 * with `pnpm --filter @ttrpg-cards/printer exec playwright install chromium`.
 *
 * The unit tests hold `SheetLayout` to the right slot indices and the feature
 * tests hold the page to drawing what it was handed. Neither can take the last
 * step, from a slot index to millimetres on paper, because that step is the
 * browser's layout engine and neither Node nor jsdom has one. So this serves
 * the built export over loopback, drives the page in headless Chromium and
 * measures what was actually drawn.
 *
 * Four claims, none of them checkable anywhere else:
 *
 * - The pages come in front and back pairs.
 * - A continuation stands as far in from the mirrored paper edge as its front
 *   card does from the opposite one, at both flip settings.
 * - The printed file holds one page per drawn page, the blank backs included.
 * - It is printed on the paper the reader picked rather than the browser's own.
 *
 * Its own job rather than part of `pnpm test`: it needs a build and a browser
 * binary, and a clone has to keep testing offline.
 */
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import {
  blankBackDrawn,
  continuationMirrors,
  gridIsWiderThanOne,
  pagesPairUp,
  paperIsWhatWasPicked,
  pdfMatchesPages,
} from "./checks.ts";
import { readPdf } from "./pdf-pages.ts";
import { PrintPreview } from "./PrintPreview.ts";
import { StaticSite } from "./StaticSite.ts";
import {
  A4_OPTION,
  CARD_SIZE_CONTROL,
  CARD_SIZE_OPTION,
  FLIP_EDGE_CONTROL,
  FLIP_EDGE_RUNS,
  ORIENTATION_CONTROL,
  PAPER_CONTROL,
  PORTRAIT_OPTION,
  RENDER_DIRECTORY,
  SIDES_CONTROL,
  TEXT_SIZE_CONTROL,
  TEXT_SIZE_OPTION,
  TWO_SIDED_OPTION,
  TYPEFACE_CONTROL,
  TYPEFACE_OPTION,
} from "./print.constants.ts";
import {
  CONTINUED_ENTRY_NAME,
  CONTINUED_FIRST_POSITION,
  CONTINUED_SECOND_POSITION,
  PRINT_FIXTURE_DOCUMENT,
} from "./print.fixtures.ts";
import type { CheckResult, FlipEdgeRun } from "./print.types.ts";

/**
 * The export to serve, named on the command line rather than worked out.
 *
 * This package knows how a sheet is laid out and nothing about which app draws
 * one, and it may not: a package importing an app's paths is the dependency
 * direction backwards. Whoever builds the export is the one who knows where it
 * landed, so they say so, and the root `verify:print` script is that caller.
 */
const EXPORT_DIRECTORY = process.argv[2];

/** This package, which is where the renders are written and then ignored. */
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RENDERS = join(PACKAGE_ROOT, RENDER_DIRECTORY);

/** What one flip setting came to. */
interface RunReport {
  readonly option: string;
  readonly results: readonly CheckResult[];
}

/** The export the harness serves, or why there is nothing to serve. */
async function readyExport(): Promise<string> {
  if (EXPORT_DIRECTORY === undefined) {
    throw new Error(
      'No export directory given. Run "pnpm verify:print" from the repository root, which builds one and points this at it.',
    );
  }

  const directory = resolve(EXPORT_DIRECTORY);

  try {
    await stat(join(directory, "index.html"));
  } catch {
    throw new Error(
      `No static export at ${directory}. Run "pnpm build" first.`,
    );
  }

  return directory;
}

/** Drives one flip setting, writes its renders, and checks what was drawn. */
async function verifyFlipEdge(options: {
  preview: PrintPreview;
  run: FlipEdgeRun;
}): Promise<RunReport> {
  const { preview, run } = options;
  const directory = join(RENDERS, run.directory);

  await mkdir(directory, { recursive: true });
  await preview.choose({
    control: FLIP_EDGE_CONTROL,
    option: run.option,
  });
  await preview.settle();

  const pages = await preview.read();

  for (const [index, page] of pages.entries()) {
    await preview.capture({
      number: index + 1,
      file: join(
        directory,
        `sheet-${page.number}-${page.side ?? "only"}.png`,
      ),
    });
  }

  const pdf = await readPdf(
    await preview.print({ file: join(directory, "sheets.pdf") }),
  );

  return {
    option: run.option,
    results: [
      gridIsWiderThanOne(pages),
      pagesPairUp(pages),
      blankBackDrawn(pages),
      ...continuationMirrors({
        pages,
        axis: run.axis,
        entryName: CONTINUED_ENTRY_NAME,
        firstPosition: CONTINUED_FIRST_POSITION,
        secondPosition: CONTINUED_SECOND_POSITION,
      }),
      pdfMatchesPages({ pages, pdf }),
      paperIsWhatWasPicked({ page: pages[0], pdf }),
    ],
  };
}

/** Everything the harness checks, at every flip setting. */
async function verify(): Promise<readonly RunReport[]> {
  const exportDirectory = await readyExport();

  await rm(RENDERS, { recursive: true, force: true });

  const site = new StaticSite({ root: exportDirectory });
  const origin = await site.start();
  const browser = await chromium.launch();

  try {
    const preview = await PrintPreview.open({ browser, origin });

    // The settings every measurement is made at, picked rather than assumed:
    // the mirror axis follows the way round the paper is, and how many slots a
    // sheet holds and whether the long entry splits follow from the cut, the
    // type and the band. A default that moved would quietly change what the
    // expectations below mean. The colour theme is left alone on purpose: a
    // theme is a set of colours and nothing else, so it cannot change how much
    // a card holds.
    await preview.choose({
      control: PAPER_CONTROL,
      option: A4_OPTION,
    });
    await preview.choose({
      control: ORIENTATION_CONTROL,
      option: PORTRAIT_OPTION,
    });
    await preview.choose({
      control: CARD_SIZE_CONTROL,
      option: CARD_SIZE_OPTION,
    });
    await preview.choose({
      control: TYPEFACE_CONTROL,
      option: TYPEFACE_OPTION,
    });
    await preview.choose({
      control: TEXT_SIZE_CONTROL,
      option: TEXT_SIZE_OPTION,
    });
    await preview.bring({ source: PRINT_FIXTURE_DOCUMENT });
    await preview.choose({
      control: SIDES_CONTROL,
      option: TWO_SIDED_OPTION,
    });

    const reports: RunReport[] = [];

    for (const run of FLIP_EDGE_RUNS) {
      reports.push(await verifyFlipEdge({ preview, run }));
    }

    await preview.close();

    return reports;
  } finally {
    await browser.close();
    await site.stop();
  }
}

/** Says what each check found, and whether the run as a whole passed. */
function report(reports: readonly RunReport[]): boolean {
  let passed = true;

  for (const run of reports) {
    console.log(`\nFlipping on the ${run.option.toLowerCase()}`);

    for (const result of run.results) {
      console.log(
        `  ${result.passed ? "ok  " : "FAIL"}  ${result.name}`,
      );
      console.log(`          ${result.detail}`);
      passed = passed && result.passed;
    }
  }

  console.log(`\nRenders written to ${RENDERS}`);

  return passed;
}

try {
  if (!report(await verify())) {
    console.error(
      "\nThe printed page is not what the sheet says it is.",
    );
    process.exitCode = 1;
  }
} catch (failure) {
  console.error(failure);
  process.exitCode = 1;
}
