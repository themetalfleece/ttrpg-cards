import { writeFile } from "node:fs/promises";
import type { Browser, Page } from "playwright";

import {
  ADD_BUTTON,
  CARD_SELECTOR,
  PAGE_SELECTOR,
  PASTE_FIELD,
  SAMPLE_MILLISECONDS,
  STEADY_SAMPLES,
  WAIT_MILLISECONDS,
} from "./print.constants.ts";
import type { RenderedPage } from "./print.types.ts";

/** What the preview says about itself between two samples. */
interface PreviewState {
  /** Whether every sheet published `aria-busy`, which `busy` is only worth reading if. */
  readonly published: boolean;
  readonly busy: boolean;
  /** Where everything is drawn, as one string, for comparing with the last sample. */
  readonly signature: string;
}

/**
 * The app open in a browser, driven the way a reader drives it.
 *
 * Through labels and roles rather than through the app's internals, because
 * what this harness is for is the step the unit tests cannot take: from a slot
 * index to millimetres on paper. Reaching into the component state to arrange
 * that would be checking the arithmetic against itself again.
 *
 * @example
 * ```ts
 * const preview = await PrintPreview.open({ browser, origin });
 * await preview.choose({ control: "Sides", option: "Two sided" });
 * await preview.settle();
 * (await preview.read()).length; // 4
 * ```
 */
export class PrintPreview {
  readonly #page: Page;

  constructor(options: { page: Page }) {
    this.#page = options.page;
  }

  /** The app loaded from a served export, ready to be driven. */
  static async open(options: {
    browser: Browser;
    origin: string;
  }): Promise<PrintPreview> {
    const page = await options.browser.newPage();

    page.setDefaultTimeout(WAIT_MILLISECONDS);
    await page.goto(options.origin, { waitUntil: "load" });

    return new PrintPreview({ page });
  }

  /** Picks `option` in the control called `control`. */
  async choose(options: {
    control: string;
    option: string;
  }): Promise<void> {
    await this.#page
      .getByRole("radiogroup", { name: options.control })
      .getByRole("radio", { name: options.option, exact: true })
      .click();
  }

  /**
   * Hands the page a document of cards, the way a reader pastes one in.
   *
   * What a reader brings replaces the bundled sample, so this is also how the
   * run gets a set small enough to measure and known to hold an entry that
   * will not fit on one card.
   */
  async bring(options: { source: string }): Promise<void> {
    await this.#page.getByLabel(PASTE_FIELD).fill(options.source);
    await this.#page
      .getByRole("button", { name: ADD_BUTTON, exact: true })
      .click();
  }

  /**
   * Waits until the page has stopped moving.
   *
   * Two answers, and both have to agree. The sheets say whether they have
   * finished arriving, through `aria-busy`, which is the app's own conclusion
   * and the one the print control acts on. On top of that nothing drawn may
   * have moved for a few samples together, because a card measures itself as
   * it mounts, that moves a sheet boundary, and the cards that moved measure
   * again.
   *
   * Neither alone is enough. The flag can still read settled in the moment
   * after a control is changed and before the work it started reaches the
   * DOM, and a run of matching samples can be a scheduling gap on a loaded
   * machine rather than a finished layout.
   *
   * A sheet that has stopped publishing the flag stops the run rather than
   * quietly leaving the samples to answer on their own. Nothing else in the
   * repository would go red for it: no linter enforces the attribute and no
   * build needs it, so this is where its absence has to be noticed.
   */
  async settle(): Promise<void> {
    const deadline = Date.now() + WAIT_MILLISECONDS;
    let previous: string | undefined = undefined;
    let steady = 0;

    while (Date.now() < deadline) {
      const state = await this.#state();

      if (!state.published) {
        throw new Error(
          "The sheets no longer publish `aria-busy`, so the harness would be waiting on half an answer.",
        );
      }

      if (state.busy || state.signature !== previous) {
        steady = 0;
        previous = state.signature;
      } else {
        steady += 1;

        if (steady >= STEADY_SAMPLES) {
          return;
        }
      }

      await this.#page.waitForTimeout(SAMPLE_MILLISECONDS);
    }

    throw new Error(
      "The preview never stopped moving, so nothing it was drawn at can be measured.",
    );
  }

  /**
   * Every page on screen, with each card measured in from the paper's edges.
   *
   * Measured in the browser, because that is where the answer is. Both the
   * card and the sheet are read with `getBoundingClientRect`, which is in
   * drawn pixels, so the preview's screen scale divides out of the ratio
   * between them and the millimetres come back the same at any scale.
   */
  async read(): Promise<readonly RenderedPage[]> {
    return this.#page.evaluate(
      (query) => {
        const sideOf = (label: string) => {
          if (label.endsWith(", front")) {
            return "front" as const;
          }

          if (label.endsWith(", back")) {
            return "back" as const;
          }

          return undefined;
        };
        const positionOf = (card: Element) => {
          for (const part of card.querySelectorAll("span")) {
            const text = (part.textContent ?? "").trim();

            if (/^\d+\/\d+$/.test(text)) {
              return text;
            }
          }

          return "";
        };

        return [...document.querySelectorAll(query.pages)].map(
          (section) => {
            const label = section.getAttribute("aria-label") ?? "";
            const counted = /(\d+) of (\d+)/.exec(label);
            const style = getComputedStyle(section);
            const widthMillimetres = Number.parseFloat(
              style.getPropertyValue("--page-width"),
            );
            const heightMillimetres = Number.parseFloat(
              style.getPropertyValue("--page-height"),
            );
            const paper = section.getBoundingClientRect();
            // The sheet's own width in millimetres over its width as drawn,
            // which is what turns every other measurement on it physical.
            const millimetresPerPixel =
              widthMillimetres / paper.width;

            return {
              label,
              number: Number.parseInt(counted?.[1] ?? "0", 10),
              total: Number.parseInt(counted?.[2] ?? "0", 10),
              side: sideOf(label),
              widthMillimetres,
              heightMillimetres,
              cards: [...section.querySelectorAll(query.cards)].map(
                (card) => {
                  const box = card.getBoundingClientRect();

                  return {
                    name: (
                      card.querySelector("h2")?.textContent ?? ""
                    ).trim(),
                    position: positionOf(card),
                    leftMillimetres:
                      (box.left - paper.left) * millimetresPerPixel,
                    rightMillimetres:
                      widthMillimetres -
                      (box.right - paper.left) * millimetresPerPixel,
                    topMillimetres:
                      (box.top - paper.top) * millimetresPerPixel,
                    bottomMillimetres:
                      heightMillimetres -
                      (box.bottom - paper.top) * millimetresPerPixel,
                  };
                },
              ),
            };
          },
        );
      },
      { pages: PAGE_SELECTOR, cards: CARD_SELECTOR },
    );
  }

  /**
   * Writes a picture of one page, counted from one the way the labels count.
   *
   * Clipped out of a picture of the whole document rather than taken off the
   * page element. An element screenshot scrolls its target into view first and
   * then waits for it to stop moving, and a sheet taller than the window never
   * settles that wait: it scrolls, retries, and times out. A clip is taken
   * where the sheet already is.
   */
  async capture(options: {
    number: number;
    file: string;
  }): Promise<void> {
    const clip = await this.#page.evaluate(
      (query) => {
        const section = document.querySelectorAll(query.selector)[
          query.index
        ];

        if (section === undefined) {
          return undefined;
        }

        const box = section.getBoundingClientRect();

        return {
          x: box.left + window.scrollX,
          y: box.top + window.scrollY,
          width: box.width,
          height: box.height,
        };
      },
      { selector: PAGE_SELECTOR, index: options.number - 1 },
    );

    if (clip === undefined) {
      throw new Error(
        `There is no page ${options.number} on screen to capture.`,
      );
    }

    await this.#page.screenshot({
      path: options.file,
      fullPage: true,
      clip,
    });
  }

  /**
   * Prints the preview to a PDF, which is as close as anything gets to the
   * paper without a printer.
   *
   * `preferCSSPageSize` is what makes the app's own `@page` rule decide the
   * paper. Without it the browser prints Letter whatever the reader picked,
   * and a page count read off the result would be counting a different
   * arrangement from the one on screen.
   */
  async print(options: { file: string }): Promise<Uint8Array> {
    const pdf = await this.#page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });

    await writeFile(options.file, pdf);

    // Handed on as a plain array of bytes. A `Buffer` is one, but the PDF
    // reader refuses the subclass by name.
    return new Uint8Array(pdf);
  }

  /** Closes the page. The browser it came from is the caller's to close. */
  async close(): Promise<void> {
    await this.#page.close();
  }

  /**
   * Whether the preview says it is still working, and what it has drawn as one
   * string. Both halves of the answer `settle` waits on.
   *
   * No sheet at all counts as busy: the page has yet to draw its first one, so
   * there is nothing there to have stopped moving.
   *
   * Whether the flag was published at all is answered separately from what it
   * said, because a missing attribute reads as not busy and that is the unsafe
   * direction: it would leave `settle` on the quiescence half alone while
   * still reporting a pass.
   */
  async #state(): Promise<PreviewState> {
    return this.#page.evaluate(
      (query) => {
        const sections = [...document.querySelectorAll(query.pages)];
        const flagged = sections.filter((section) =>
          section.hasAttribute("aria-busy"),
        );

        return {
          published: flagged.length === sections.length,
          busy:
            sections.length === 0 ||
            flagged.some(
              (section) =>
                section.getAttribute("aria-busy") === "true",
            ),
          signature: sections
            .map((section) => {
              const cards = [
                ...section.querySelectorAll(query.cards),
              ].map((card) => {
                const box = card.getBoundingClientRect();

                return `${Math.round(box.left)},${Math.round(box.top)}`;
              });

              return `${section.getAttribute("aria-label") ?? ""}:${cards.join("|")}`;
            })
            .join("\n"),
        };
      },
      { pages: PAGE_SELECTOR, cards: CARD_SELECTOR },
    );
  }
}
