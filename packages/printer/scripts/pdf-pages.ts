import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import type { PrintedPdf } from "./print.types.ts";

/** A PDF measures itself in points, and there are 72 to the inch. */
const POINTS_PER_MILLIMETRE = 72 / 25.4;

/**
 * What a printed file came out as: how many pages, and how large the paper is.
 *
 * Read with a PDF library rather than counted out of the bytes, because the
 * page objects in a browser's output are usually inside a compressed object
 * stream and a search for them finds nothing.
 *
 * The paper is taken off the first page, since one `@page` rule governs the
 * whole run. Through a viewport rather than off the raw box, because that is
 * what turns a box and a rotation into the width and height the sheet would
 * come out at.
 *
 * @example
 * ```ts
 * (await readPdf(await preview.print({ file }))).pageCount; // 4
 * ```
 */
export async function readPdf(data: Uint8Array): Promise<PrintedPdf> {
  const loading = getDocument({ data, verbosity: 0 });
  const document = await loading.promise;
  const paper = (await document.getPage(1)).getViewport({ scale: 1 });
  const printed: PrintedPdf = {
    pageCount: document.numPages,
    widthMillimetres: paper.width / POINTS_PER_MILLIMETRE,
    heightMillimetres: paper.height / POINTS_PER_MILLIMETRE,
  };

  // The reader keeps a worker alive until the loading task is destroyed, and
  // a script that leaves one running never exits.
  await loading.destroy();

  return printed;
}
