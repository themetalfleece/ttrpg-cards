/**
 * Proves the printed sheet on paper rather than in arithmetic.
 *
 * Run with `pnpm verify:print` from the repository root, which builds the
 * export first and then says where it put it and where the workspace is. The
 * browser is installed once, with
 * `pnpm --filter @ttrpg-cards/printer exec playwright install chromium`.
 *
 * The unit tests hold `SheetLayout` to the right counts and slot indices and
 * the feature tests hold the page to drawing what it was handed. Neither can
 * take the last step, from a number of millimetres to a place on paper,
 * because that step is the browser's layout engine and neither Node nor jsdom
 * has one. So this serves the built export over loopback, drives the page in
 * headless Chromium and measures what was actually drawn.
 *
 * Two phases, because there are two kinds of claim:
 *
 * - **Every paper**, printed on one side: that a card comes out 63 by 88mm,
 *   that a sheet holds the cards it has room for, that the run comes to the
 *   pages it should, that every card carries cut guides reaching into the
 *   blank around it, and that the file printed on the paper that was asked
 *   for. Driven on A4, on Letter, and on a paper typed in by hand, which is
 *   what says no part of the layout assumes a sheet.
 * - **The cut guides turned off**, that nothing is painted around a card.
 *   They come off by the sheet setting their reach to nothing, so only a
 *   layout engine can say they are really gone.
 * - **Both flip edges**, printed on both sides: that pages come in front and
 *   back pairs, that a continuation stands as far in from the mirrored paper
 *   edge as its front card does from the opposite one, and that a blank back
 *   is printed rather than dropped.
 *
 * Plus one claim about the source rather than the output: that a paper
 * measurement is written down in one place. There is no type that can stop
 * somebody typing 210 into a stylesheet, so it is a grep, and it runs here
 * because the gate has to keep passing on a clone with no network.
 *
 * Every run also leaves a picture of each page and a grayscale render of the
 * first, under `.print-verification`, for anything a measurement cannot say.
 */
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import {
  blankBackDrawn,
  cardsAreCutToSize,
  cardsCarryCutGuides,
  cardsPerPageIs,
  continuationMirrors,
  cutGuidesComeOff,
  gridIsWiderThanOne,
  pageCountIs,
  pagesPairUp,
  paperIsWhatWasPicked,
  pdfMatchesPages,
  printedOnPaper,
} from "./checks.ts";
import { paperMeasurementsAreInOnePlace } from "./paper-measurements.ts";
import { readPdf } from "./pdf-pages.ts";
import { PrintPreview } from "./PrintPreview.ts";
import { StaticSite } from "./StaticSite.ts";
import {
  A4_OPTION,
  CARD_SIZE_CONTROL,
  CARD_SIZE_OPTION,
  CUSTOM_HEIGHT_FIELD,
  CUSTOM_WIDTH_FIELD,
  CUT_GUIDE_CONTROL,
  FLIP_EDGE_CONTROL,
  FLIP_EDGE_RUNS,
  GRAYSCALE_RENDER,
  GUIDES_OFF_OPTION,
  GUIDES_ON_OPTION,
  ONE_SIDED_OPTION,
  ORIENTATION_CONTROL,
  PAPER_CONTROL,
  PAPER_RUNS,
  PORTRAIT_OPTION,
  PRINTED_FILE,
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
import type {
  CheckResult,
  FlipEdgeRun,
  PaperRun,
} from "./print.types.ts";

/**
 * The export to serve and the workspace to read, named on the command line
 * rather than worked out.
 *
 * This package knows how a sheet is laid out and nothing about which app
 * draws one or where the repository sits, and it may not: a package computing
 * a path outside itself is the dependency direction backwards. Whoever builds
 * the export is the one who knows where it landed, so they say so, and the
 * root `verify:print` script is that caller.
 */
const EXPORT_DIRECTORY = process.argv[2];
const WORKSPACE_DIRECTORY = process.argv[3];

/** This package, which is where the renders are written and then ignored. */
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RENDERS = join(PACKAGE_ROOT, RENDER_DIRECTORY);

/** What one run of the harness came to. */
interface RunReport {
  /** What it was driving, short enough to head a column of results. */
  readonly heading: string;
  readonly results: readonly CheckResult[];
}

/** Where the harness was pointed, or why there is nowhere to point it. */
function readyArguments(): { export: string; workspace: string } {
  if (
    EXPORT_DIRECTORY === undefined ||
    WORKSPACE_DIRECTORY === undefined
  ) {
    throw new Error(
      'Give this an export directory and a workspace directory. Run "pnpm verify:print" from the repository root, which builds one and points this at both.',
    );
  }

  return {
    export: resolve(EXPORT_DIRECTORY),
    workspace: resolve(WORKSPACE_DIRECTORY),
  };
}

/** The export the harness serves, once there is one to serve. */
async function readyExport(directory: string): Promise<string> {
  try {
    await stat(join(directory, "index.html"));
  } catch {
    throw new Error(
      `No static export at ${directory}. Run "pnpm build" first.`,
    );
  }

  return directory;
}

/** Writes a picture of every page of a run, and a grayscale one of the first. */
async function captureRun(options: {
  preview: PrintPreview;
  directory: string;
  pages: readonly { number: number; side?: string | undefined }[];
}): Promise<void> {
  const { preview, directory, pages } = options;

  for (const [index, page] of pages.entries()) {
    await preview.capture({
      number: index + 1,
      file: join(
        directory,
        `sheet-${page.number}-${page.side ?? "only"}.png`,
      ),
    });
  }

  if (pages.length > 0) {
    await preview.captureGrayscale({
      number: 1,
      file: join(directory, GRAYSCALE_RENDER),
    });
  }
}

/** Drives one paper, writes its renders, and measures what came out. */
async function verifyPaper(options: {
  preview: PrintPreview;
  run: PaperRun;
}): Promise<RunReport> {
  const { preview, run } = options;
  const directory = join(RENDERS, run.directory);

  await mkdir(directory, { recursive: true });
  await preview.choose({
    control: PAPER_CONTROL,
    option: run.option,
  });

  // A paper the reader measures rather than picks brings out two fields, and
  // nothing is laid out at the size it asks for until they are filled in.
  if (run.typed === true) {
    await preview.fill({
      field: CUSTOM_WIDTH_FIELD,
      value: run.widthMillimetres,
    });
    await preview.fill({
      field: CUSTOM_HEIGHT_FIELD,
      value: run.heightMillimetres,
    });
  }

  await preview.settle();

  const pages = await preview.read();

  await captureRun({ preview, directory, pages });

  const pdf = await readPdf(
    await preview.print({ file: join(directory, PRINTED_FILE) }),
  );

  return {
    heading: `On ${run.option}`,
    results: [
      cardsAreCutToSize(pages),
      cardsPerPageIs({ pages, run }),
      pageCountIs({ pages, run }),
      cardsCarryCutGuides(pages),
      pdfMatchesPages({ pages, pdf }),
      printedOnPaper({ pdf, run }),
      paperIsWhatWasPicked({ page: pages[0], pdf }),
    ],
  };
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

  await captureRun({ preview, directory, pages });

  const pdf = await readPdf(
    await preview.print({ file: join(directory, PRINTED_FILE) }),
  );

  return {
    heading: `Flipping on the ${run.option.toLowerCase()}`,
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

/**
 * Pins every layout input the counts below rest on.
 *
 * Picked rather than left at its default: the mirror axis follows the way
 * round the paper is, and how many slots a sheet holds and whether the long
 * entry splits follow from the cut, the type and the band. A default that
 * moved would quietly change what the expectations mean rather than failing.
 * The colour theme is left alone on purpose: a theme is a set of colours and
 * nothing else, so it cannot change how much a card holds.
 */
async function pinSettings(preview: PrintPreview): Promise<void> {
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
  await preview.choose({
    control: CUT_GUIDE_CONTROL,
    option: GUIDES_ON_OPTION,
  });
  await preview.bring({ source: PRINT_FIXTURE_DOCUMENT });
}

/**
 * Drives the one setting that takes the marks off, and checks they went.
 *
 * Measured on screen and nothing printed: what is in question is whether the
 * stylesheet draws anything at a reach of nothing, and that is answered by
 * the layout engine rather than by the PDF. A page of renders per setting
 * would be a minute of browser for a question a measurement already closes.
 */
async function verifyGuidesOff(
  preview: PrintPreview,
): Promise<RunReport> {
  await preview.choose({
    control: CUT_GUIDE_CONTROL,
    option: GUIDES_OFF_OPTION,
  });
  await preview.settle();

  const pages = await preview.read();

  await preview.choose({
    control: CUT_GUIDE_CONTROL,
    option: GUIDES_ON_OPTION,
  });
  await preview.settle();

  return {
    heading: "With the cut guides off",
    results: [cutGuidesComeOff(pages)],
  };
}

/** Everything the harness checks, on every paper and at every flip setting. */
async function verify(): Promise<readonly RunReport[]> {
  const directories = readyArguments();
  const exportDirectory = await readyExport(directories.export);

  await rm(RENDERS, { recursive: true, force: true });

  const site = new StaticSite({ root: exportDirectory });
  const origin = await site.start();
  const browser = await chromium.launch();

  try {
    const preview = await PrintPreview.open({ browser, origin });

    await pinSettings(preview);

    const reports: RunReport[] = [
      {
        heading: "In the source",
        results: [
          await paperMeasurementsAreInOnePlace({
            root: directories.workspace,
          }),
        ],
      },
    ];

    // One sided first. How much a paper holds and how many pages that comes
    // to are about the grid, and printing on both sides puts a continuation
    // on the back of its own slot, which changes the count for a reason that
    // has nothing to do with the paper.
    await preview.choose({
      control: SIDES_CONTROL,
      option: ONE_SIDED_OPTION,
    });

    for (const run of PAPER_RUNS) {
      reports.push(await verifyPaper({ preview, run }));
    }

    reports.push(await verifyGuidesOff(preview));

    // Back to the paper the mirror expectations are written for, on both
    // sides, for the second phase.
    await preview.choose({
      control: PAPER_CONTROL,
      option: A4_OPTION,
    });
    await preview.choose({
      control: SIDES_CONTROL,
      option: TWO_SIDED_OPTION,
    });

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
    console.log(`\n${run.heading}`);

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
