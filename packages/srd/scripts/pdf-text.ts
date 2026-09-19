import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api.d.ts";

/** A single positioned text fragment as drawn by the PDF. */
export interface TextRun {
  readonly page: number;
  /** Left edge of the baseline, in PDF points. */
  readonly x: number;
  /** Baseline, in PDF points (origin bottom-left, so larger is higher on the page). */
  readonly y: number;
  readonly width: number;
  /** Font size in points. */
  readonly size: number;
  /** PostScript font name without the subset prefix, e.g. "Cambria-BoldItalic". */
  readonly font: string;
  readonly text: string;
}

export interface PdfPage {
  readonly number: number;
  readonly width: number;
  readonly height: number;
  readonly runs: readonly TextRun[];
}

export interface PdfText {
  readonly pageCount: number;
  readPages(first: number, last: number): Promise<PdfPage[]>;
}

export async function openPdf(data: Uint8Array): Promise<PdfText> {
  const doc = await getDocument({ data, verbosity: 0 }).promise;

  async function readPage(pageNumber: number): Promise<PdfPage> {
    const page = await doc.getPage(pageNumber);
    // Font objects (with their real names) are only resolved once the page's operators are loaded.
    await page.getOperatorList();
    const content = await page.getTextContent();
    const fontNames = new Map<string, string>();
    const runs: TextRun[] = [];
    for (const item of content.items) {
      if (!("str" in item) || item.str === "") continue;
      const textItem: TextItem = item;
      let font = fontNames.get(textItem.fontName);
      if (font === undefined) {
        const fontObject = page.commonObjs.get(textItem.fontName) as
          { name?: string } | undefined;
        font = (fontObject?.name ?? textItem.fontName).replace(
          /^[A-Z]{6}\+/,
          "",
        );
        fontNames.set(textItem.fontName, font);
      }
      const [scaleX, , , , x, y] = textItem.transform as number[];
      runs.push({
        page: pageNumber,
        x: x ?? 0,
        y: y ?? 0,
        width: textItem.width,
        size: Math.abs(scaleX ?? 0),
        font,
        text: textItem.str,
      });
    }
    const [, , width = 0, height = 0] = page.view;
    page.cleanup();
    return { number: pageNumber, width, height, runs };
  }

  return {
    pageCount: doc.numPages,
    async readPages(first, last) {
      const pages: PdfPage[] = [];
      for (
        let pageNumber = first;
        pageNumber <= Math.min(last, doc.numPages);
        pageNumber++
      )
        pages.push(await readPage(pageNumber));
      return pages;
    },
  };
}
