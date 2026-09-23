import {
  PAPER_TOLERANCE_MILLIMETRES,
  TOLERANCE_MILLIMETRES,
} from "./print.constants.ts";
import type {
  CheckResult,
  MirrorAxis,
  PrintedPdf,
  RenderedCard,
  RenderedPage,
} from "./print.types.ts";

/**
 * A measurement as it reads in a report.
 *
 * @example
 * ```ts
 * millimetres(8.499999); // "8.5mm"
 * ```
 */
function millimetres(value: number): string {
  return `${Number(value.toFixed(2))}mm`;
}

/** Whether two measurements are the same place on paper. */
function same(one: number, other: number): boolean {
  return Math.abs(one - other) <= TOLERANCE_MILLIMETRES;
}

/**
 * How many distinct positions a list of measurements holds, counting two
 * within the tolerance as one. That is how a grid's columns are counted off
 * the cards standing in them.
 */
function distinctPositions(values: readonly number[]): number {
  const sorted = [...values].sort((one, other) => one - other);
  let count = 0;
  let last: number | undefined = undefined;

  for (const value of sorted) {
    if (last === undefined || !same(value, last)) {
      count += 1;
      last = value;
    }
  }

  return count;
}

/** The page carrying the most cards, which is the one a full grid shows on. */
function fullestPage(
  pages: readonly RenderedPage[],
): RenderedPage | undefined {
  let fullest: RenderedPage | undefined = undefined;

  for (const page of pages) {
    if (
      fullest === undefined ||
      page.cards.length > fullest.cards.length
    ) {
      fullest = page;
    }
  }

  return fullest;
}

/**
 * That the sheet holds a grid rather than a single column or row.
 *
 * A precondition rather than a claim about the code: a mirror of a one column
 * grid is the grid, so every check below it would pass without the sheet
 * having reversed anything at all.
 *
 * @example
 * ```ts
 * gridIsWiderThanOne(pages).detail; // "3 columns by 3 rows"
 * ```
 */
export function gridIsWiderThanOne(
  pages: readonly RenderedPage[],
): CheckResult {
  const page = fullestPage(pages);
  const cards = page?.cards ?? [];
  const columns = distinctPositions(
    cards.map((card) => card.leftMillimetres),
  );
  const rows = distinctPositions(
    cards.map((card) => card.topMillimetres),
  );

  return {
    name: "The sheet is a grid, so a mirror can be told from the identity",
    passed: columns > 1 && rows > 1,
    detail: `${columns} columns by ${rows} rows, from the ${cards.length} cards on the fullest page`,
  };
}

/**
 * That the run is front and back pairs: an even number of pages, sides
 * alternating, and both sides of a sheet naming that piece of paper.
 *
 * Every front is followed by its own back, blank or not, which is what the
 * pairing rests on: a page the printer never puts out moves every back after
 * it onto the wrong front.
 */
export function pagesPairUp(
  pages: readonly RenderedPage[],
): CheckResult {
  const sides = pages.map((page) => page.side ?? "none");
  const sheets = Math.ceil(pages.length / 2);
  const paired = pages.length > 0 && pages.length % 2 === 0;
  const problems: string[] = [];

  if (!paired) {
    problems.push(
      `${pages.length} pages, which is not a run of pairs`,
    );
  }

  for (const [index, page] of pages.entries()) {
    const expected = index % 2 === 0 ? "front" : "back";
    const sheet = Math.floor(index / 2) + 1;

    if (page.side !== expected) {
      problems.push(
        `page ${index + 1} is ${page.side ?? "one sided"}`,
      );
    }

    // Only worth asking once the run pairs up. A dropped page leaves every
    // label after it counting a different number of sheets from this one, so
    // reporting each of them buries the one thing that went wrong.
    if (paired && (page.number !== sheet || page.total !== sheets)) {
      problems.push(
        `page ${index + 1} calls itself ${page.number} of ${page.total} rather than sheet ${sheet} of ${sheets}`,
      );
    }
  }

  return {
    name: "Pages come in front and back pairs",
    passed: problems.length === 0,
    detail:
      problems.length === 0
        ? `${sheets} sheets, ${pages.length} pages: ${sides.join(", ")}`
        : problems.join("; "),
  };
}

/**
 * That a back with nothing on it was drawn.
 *
 * The other half of the blank back question, and the half that has to come
 * first: the page count below only proves a blank one reached the printer if
 * there was a blank one to reach it.
 */
export function blankBackDrawn(
  pages: readonly RenderedPage[],
): CheckResult {
  const blanks = pages.filter(
    (page) => page.side === "back" && page.cards.length === 0,
  );

  return {
    name: "A back page with no cards on it is drawn",
    passed: blanks.length > 0,
    detail:
      blanks.length === 0
        ? "every back page carries a card, so the fixture no longer exercises a blank one"
        : `${blanks.length} of ${pages.length} pages: ${blanks.map((page) => page.label).join(", ")}`,
  };
}

/**
 * That the printed file holds one page per page on screen, blank backs
 * included.
 *
 * This is the check a browser is needed for. A page of no height is collapsed
 * into the break after it and never put out, and every back after it then
 * lands on the wrong front, which spoils a print run rather than a card.
 */
export function pdfMatchesPages(options: {
  pages: readonly RenderedPage[];
  pdf: PrintedPdf;
}): CheckResult {
  return {
    name: "The PDF holds one page per page on screen",
    passed: options.pdf.pageCount === options.pages.length,
    detail: `${options.pdf.pageCount} printed against ${options.pages.length} drawn`,
  };
}

/**
 * That the paper printed on is the paper the reader picked.
 *
 * The other half of the page count, and the half that says what the count
 * means: the app writes its `@page` size as a string because a descriptor will
 * not resolve a custom property, and the browser falls back to Letter if that
 * rule does not reach it. The grid would then be laid out for one piece of
 * paper and printed on another, which the screen cannot show.
 */
export function paperIsWhatWasPicked(options: {
  page: RenderedPage | undefined;
  pdf: PrintedPdf;
}): CheckResult {
  const { page, pdf } = options;
  const printed = `${millimetres(pdf.widthMillimetres)} by ${millimetres(pdf.heightMillimetres)}`;

  if (page === undefined) {
    return {
      name: "The PDF is on the paper that was picked",
      passed: false,
      detail: `${printed} printed, with no page on screen to compare it against`,
    };
  }

  const sameSize = (one: number, other: number) =>
    Math.abs(one - other) <= PAPER_TOLERANCE_MILLIMETRES;

  return {
    name: "The PDF is on the paper that was picked",
    passed:
      sameSize(pdf.widthMillimetres, page.widthMillimetres) &&
      sameSize(pdf.heightMillimetres, page.heightMillimetres),
    detail: `${printed} printed against ${millimetres(page.widthMillimetres)} by ${millimetres(page.heightMillimetres)} picked`,
  };
}

/**
 * That a continuation prints on the back of its own slot, mirrored about the
 * axis the flip edge turns the sheet on.
 *
 * The claim in millimetres: the back card stands as far in from one paper edge
 * as its front card does from the opposite one, and the same distance in from
 * the two edges the sheet did not turn about.
 */
export function continuationMirrors(options: {
  pages: readonly RenderedPage[];
  axis: MirrorAxis;
  entryName: string;
  firstPosition: string;
  secondPosition: string;
}): readonly CheckResult[] {
  const found = locate(options);

  if (found === undefined) {
    return [
      {
        name: "The fixture holds an entry that runs onto a continuation",
        passed: false,
        detail: `no card of "${options.entryName}" was found at both ${options.firstPosition} and ${options.secondPosition}, so the document no longer overruns a card`,
      },
    ];
  }

  return [
    onTheBackOfItsOwnSheet(found),
    mirroredAcross({ ...found, axis: options.axis }),
    notTheIdentity({ ...found, axis: options.axis }),
  ];
}

/** An entry's two cards, and where in the run the pages holding them fall. */
interface ContinuedEntry {
  readonly frontPage: RenderedPage;
  readonly frontIndex: number;
  readonly front: RenderedCard;
  readonly backPage: RenderedPage;
  readonly backIndex: number;
  readonly back: RenderedCard;
}

/** The two halves of the continued entry, or `undefined` if it did not split. */
function locate(options: {
  pages: readonly RenderedPage[];
  entryName: string;
  firstPosition: string;
  secondPosition: string;
}): ContinuedEntry | undefined {
  const find = (position: string) => {
    for (const [index, page] of options.pages.entries()) {
      const card = page.cards.find(
        (candidate) =>
          candidate.name === options.entryName &&
          candidate.position === position,
      );

      if (card !== undefined) {
        return { page, index, card };
      }
    }

    return undefined;
  };

  const first = find(options.firstPosition);
  const second = find(options.secondPosition);

  if (first === undefined || second === undefined) {
    return undefined;
  }

  return {
    frontPage: first.page,
    frontIndex: first.index,
    front: first.card,
    backPage: second.page,
    backIndex: second.index,
    back: second.card,
  };
}

/**
 * That the two halves are the two sides of one piece of paper.
 *
 * Read off where the pages fall in the run rather than off what they call
 * themselves, because the label counts printed pages: the back of the first
 * sheet is page two. A front and the page straight after it are the sheet's
 * two sides.
 */
function onTheBackOfItsOwnSheet(entry: ContinuedEntry): CheckResult {
  const passed =
    entry.frontPage.side === "front" &&
    entry.backPage.side === "back" &&
    entry.backIndex === entry.frontIndex + 1;

  return {
    name: "The continuation is on the back of its own sheet",
    passed,
    detail: `${entry.frontPage.label} then ${entry.backPage.label}`,
  };
}

/** That the back card stands where turning the sheet over would put it. */
function mirroredAcross(
  entry: ContinuedEntry & { axis: MirrorAxis },
): CheckResult {
  const measured = measure(entry);

  return {
    name: `The back card is the mirror of the front across the ${entry.axis}`,
    passed:
      same(measured.mirrored.front, measured.mirrored.back) &&
      same(measured.kept.front, measured.kept.back),
    detail: `${measured.mirrored.name}: ${millimetres(measured.mirrored.front)} against ${millimetres(measured.mirrored.back)}; ${measured.kept.name}: ${millimetres(measured.kept.front)} against ${millimetres(measured.kept.back)}`,
  };
}

/**
 * That the mirror actually moved the card.
 *
 * A mirror that hands back the slot it was given passes every measurement
 * above, because both cards are then in the same place. On a grid more than
 * one column and one row across, the first slot always mirrors into another
 * one.
 */
function notTheIdentity(
  entry: ContinuedEntry & { axis: MirrorAxis },
): CheckResult {
  const measured = measure(entry);

  return {
    name: "The mirror moved the card rather than leaving it where it was",
    passed: !same(measured.moved.front, measured.moved.back),
    detail: `${measured.moved.name}: ${millimetres(measured.moved.front)} against ${millimetres(measured.moved.back)}`,
  };
}

/** One pair of distances, named for the report. */
interface MeasuredPair {
  readonly name: string;
  readonly front: number;
  readonly back: number;
}

/** What a mirror about `axis` changes, what it keeps, and what it moves. */
interface MirrorMeasurements {
  /** The distances that swap edges, so the front's is the back's answer. */
  readonly mirrored: MeasuredPair;
  /** The distances on the axis the sheet did not turn about, which hold. */
  readonly kept: MeasuredPair;
  /** The distance from the same edge on both sides, which has to differ. */
  readonly moved: MeasuredPair;
}

/**
 * The three pairs of distances a mirror is read from.
 *
 * A sheet turned about the long edge of portrait paper swaps left for right
 * and keeps top and bottom; turned about the short edge it swaps top for
 * bottom and keeps left and right.
 */
function measure(
  entry: ContinuedEntry & { axis: MirrorAxis },
): MirrorMeasurements {
  if (entry.axis === "columns") {
    return {
      mirrored: {
        name: "front from the left paper edge against back from the right",
        front: entry.front.leftMillimetres,
        back: entry.back.rightMillimetres,
      },
      kept: {
        name: "both from the top",
        front: entry.front.topMillimetres,
        back: entry.back.topMillimetres,
      },
      moved: {
        name: "both from the left",
        front: entry.front.leftMillimetres,
        back: entry.back.leftMillimetres,
      },
    };
  }

  return {
    mirrored: {
      name: "front from the top paper edge against back from the bottom",
      front: entry.front.topMillimetres,
      back: entry.back.bottomMillimetres,
    },
    kept: {
      name: "both from the left",
      front: entry.front.leftMillimetres,
      back: entry.back.leftMillimetres,
    },
    moved: {
      name: "both from the top",
      front: entry.front.topMillimetres,
      back: entry.back.topMillimetres,
    },
  };
}
