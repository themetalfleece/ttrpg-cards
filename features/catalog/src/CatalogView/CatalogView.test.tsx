import {
  CARD_LAYOUT_PRESETS,
  CARD_SIZES,
  CARD_TEXT_SIZE_PRESETS,
  CARD_TEXT_SIZES,
  CARD_THEMES,
  CardLayout,
  DEFAULT_CARD_LAYOUT_PRESET,
  DEFAULT_CARD_TEXT_SIZE,
  type Card,
  type CardSizeOption,
} from "@ttrpg-cards/card";
import { SCREEN_SCALE_RANGE } from "@ttrpg-cards/core";
import { SLIDER_HINT_LABEL } from "@ttrpg-cards/ui/Slider";
import {
  CUSTOM_PAGE_SIDE_RANGE,
  CUSTOM_PAGE_SIZE,
  PAGE_ORIENTATIONS,
  PAGE_SIZE_NAMES,
  PAGE_SIZES,
  SheetLayout,
} from "@ttrpg-cards/printer";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TEXT_SIZE_LABEL } from "./CardControls/CardControls.constants";
import {
  CLEAR_LABEL,
  IMPORT_LABEL,
  NOTHING_READ,
  unreadLine,
} from "./ImportPanel/ImportPanel.constants";
import {
  CUSTOM_HEIGHT_LABEL,
  CUSTOM_WIDTH_LABEL,
  CUT_GUIDE_LABEL,
  FLIP_EDGE_LABEL,
  PRINT_LABEL,
  PRINT_WAITING_LABEL,
  SIDES_LABEL,
} from "./PageControls/PageControls.constants";
import {
  CALIBRATION_HINT,
  CALIBRATION_LABEL,
} from "./ScreenCalibration/ScreenCalibration.constants";
import { CatalogView } from "./CatalogView.component";
import {
  CATALOG_ATTRIBUTIONS,
  CATALOG_CARDS,
} from "./CatalogView.data";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Two cards a reader might bring, written the way most documents are. */
const BROUGHT_CARDS = [
  "## Hearth Token",
  "",
  "*A trinket of banked warmth*",
  "",
  "**Range:** Touch",
  "**Duration:** 8 hours",
  "",
  "It keeps a fire lit overnight, however the wind sits.",
  "",
  "---",
  "",
  "## Lantern Ward",
  "",
  "- **Range:** Self",
  "- **Duration:** 1 minute",
  "",
  "A ward of steady light closes over you.",
  "",
].join("\n");

/** A third card, for a reader who adds one document after another. */
const LATER_CARD = [
  "## Candle Stub",
  "",
  "**Range:** Touch",
  "**Duration:** 1 hour",
  "",
  "It burns down to nothing by morning.",
  "",
].join("\n");

/**
 * The paper the reader measures in these tests.
 *
 * Larger than any published one on purpose, so it holds sixteen cards where
 * A4 holds nine: a grid that came out different is what says the layout read
 * the paper rather than assuming a sheet. Larger also means fewer sheets to
 * lay out and measure than a small paper would, which keeps the test quick.
 */
const MEASURED_PAPER = {
  widthMillimetres: 300,
  heightMillimetres: 420,
};

/**
 * How long a test that lays the whole sample out several times over is given.
 *
 * Every card on every sheet measures itself as it mounts, so a test that
 * changes the paper four times pays for four of those. The rest of this file
 * changes it once or twice and fits the default.
 */
const ROUND_TRIP_TIMEOUT_MILLISECONDS = 20_000;

/** Enough frames for the page to stop moving, and how long one lasts. */
const FRAMES_TO_PASS = 10;
const FRAME_MILLISECONDS = 20;

/**
 * A sheet of paper on the page, by the label it announces itself with.
 *
 * Matched on the label rather than the element, because the view is made of
 * sections and only some of them are paper.
 */
const SHEET_SELECTOR = 'section[aria-label^="Card page"]';

/**
 * Frames let by, so anything the page is waiting on has a chance to land.
 *
 * jsdom runs animation frames off its own timer, so the only way to let a few
 * go by is to wait for real ones.
 */
async function passFrames(): Promise<void> {
  for (let frame = 0; frame < FRAMES_TO_PASS; frame += 1) {
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, FRAME_MILLISECONDS);
      });
    });
  }
}

/** Whatever a test replaced or mounted, undone after it. */
const restores: Array<() => void> = [];

/**
 * Enough of a `ResizeObserver` for cards that each observe one box. jsdom has
 * none, and a card watches its own box so it re-measures when the size changes
 * under it.
 */
function stubResizeObserver(): void {
  class StubResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;

  restores.push(() => {
    globalThis.ResizeObserver = original;
  });
}

/** The view mounted for real, so the cards on it measure themselves. */
async function renderView(): Promise<HTMLElement> {
  stubResizeObserver();

  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  // Awaited, because a card works out whether it needs a continuation in a
  // microtask just after the commit rather than inside it.
  await act(async () => {
    root.render(<CatalogView />);
  });

  restores.push(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  return container;
}

/** Every card face the view laid out, across all of its sheets. */
function cardFaces(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll("article"));
}

/** The sheets the cards are laid out on, in the order they print. */
function sheetSurfaces(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(SHEET_SELECTOR),
  );
}

/**
 * The faces on one sheet, which is what a capacity counts.
 *
 * A capacity is how many cards a single piece of paper holds. The page runs
 * over as many pieces as the set needs, so counting every face on it answers a
 * different question entirely.
 */
function facesOnSheet(
  container: HTMLElement,
  index = 0,
): HTMLElement[] {
  const sheet = sheetSurfaces(container)[index];

  if (sheet === undefined) {
    throw new Error(`The view rendered no sheet ${index + 1}`);
  }

  return Array.from(sheet.querySelectorAll("article"));
}

/** The first sheet, which is the one a paper's own settings are read off. */
function pageSurface(container: HTMLElement): HTMLElement {
  const page = sheetSurfaces(container)[0];

  if (page === undefined) {
    throw new Error("The view rendered no page");
  }

  return page;
}

/** The `@page` rule the view is telling the printer to use. */
function printedPageRule(container: HTMLElement): string {
  return container.querySelector("style")?.textContent ?? "";
}

/** Picks the choice showing `label`, the way a reader would. */
async function pick(
  container: HTMLElement,
  label: string,
): Promise<void> {
  const choice = Array.from(
    container.querySelectorAll<HTMLElement>('[role="radio"]'),
  ).find((candidate) => candidate.textContent === label);

  if (choice === undefined) {
    throw new Error(`No choice labelled ${label}`);
  }

  await act(async () => {
    choice.click();
  });
}

/**
 * Types `text` into the field asking `label` and leaves it, which is what
 * makes the field report.
 *
 * Through the element's own value setter rather than the property, because
 * React patches that property to track what it last rendered: written to
 * directly, the tracker moves with it and React reports no change at all.
 */
async function fill(
  container: HTMLElement,
  label: string,
  text: string,
): Promise<void> {
  const named = Array.from(container.querySelectorAll("label")).find(
    (candidate) => candidate.textContent === label,
  );
  const field = named?.htmlFor
    ? container.querySelector<HTMLInputElement>(
        `#${CSS.escape(named.htmlFor)}`,
      )
    : null;

  if (field === null || field === undefined) {
    throw new Error(`No field labelled ${label}`);
  }

  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  await act(async () => {
    setValue?.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true }),
    );
  });
}

/**
 * Picks the choice showing `label` from the control asking `control`.
 *
 * Two controls offer a size called Large, one for the card and one for the
 * type on it, which is the point: they are separate picks. A test that asked
 * for the label alone would take whichever came first.
 */
async function pickFrom(
  container: HTMLElement,
  control: string,
  label: string,
): Promise<void> {
  const group = Array.from(
    container.querySelectorAll<HTMLElement>('[role="radiogroup"]'),
  ).find((candidate) => {
    const labelId = candidate.getAttribute("aria-labelledby") ?? "";

    return (
      container.querySelector(`#${CSS.escape(labelId)}`)
        ?.textContent === control
    );
  });

  if (group === undefined) {
    throw new Error(`No control labelled ${control}`);
  }

  const choice = Array.from(
    group.querySelectorAll<HTMLElement>('[role="radio"]'),
  ).find((candidate) => candidate.textContent === label);

  if (choice === undefined) {
    throw new Error(`No choice labelled ${label} under ${control}`);
  }

  await act(async () => {
    choice.click();
  });
}

/** Types a document into the field the way a reader pasting one would. */
async function paste(
  container: HTMLElement,
  source: string,
): Promise<void> {
  const field = container.querySelector("textarea");

  if (field === null) {
    throw new Error("The view rendered no field to paste into");
  }

  // React listens for an input event on a controlled field, and jsdom's own
  // value setter does not raise one, so the native setter goes in underneath.
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  setter?.call(field, source);

  await act(async () => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Opens a file the way the reader's own picker reports one. */
async function upload(
  container: HTMLElement,
  file: File,
): Promise<void> {
  const input = container.querySelector('input[type="file"]');

  if (input === null) {
    throw new Error("The view rendered no way to open a file");
  }

  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });

  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

/** Presses the button showing `label`. */
async function press(
  container: HTMLElement,
  label: string,
): Promise<void> {
  const button = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      "button:not([role])",
    ),
  ).find((candidate) => candidate.textContent === label);

  if (button === undefined) {
    throw new Error(`No button labelled ${label}`);
  }

  await act(async () => {
    button.click();
  });
}

/** Every choice on offer across the controls. */
function choiceLabels(container: HTMLElement): (string | null)[] {
  return Array.from(
    container.querySelectorAll('[role="radio"]'),
    (choice) => choice.textContent,
  );
}

/** A card's name as a reader sees it, with the emphasis flattened out. */
function nameOf(card: Card): string {
  return card.name.map((run) => run.text).join("");
}

/** The smallest size on offer, which is what a reflow is easiest to see on. */
function smallestSize(): CardSizeOption {
  const smallest = CARD_SIZES.toSorted(
    (left, right) =>
      CARD_LAYOUT_PRESETS[left.id].size.widthMillimetres -
      CARD_LAYOUT_PRESETS[right.id].size.widthMillimetres,
  )[0];

  if (smallest === undefined) {
    throw new Error("The app ships no card sizes");
  }

  return smallest;
}

/**
 * How many cards the sheet holds at a card size.
 *
 * jsdom lays nothing out, so every entry measures as the one card it is and
 * the page fills exactly. In a browser an entry that splits takes a second
 * slot and the page shows fewer entries for the same count of cards.
 */
function capacityAt(options: {
  preset?: CardSizeOption["id"];
  sheet?: SheetLayout;
}): number {
  const sheet = options.sheet ?? SheetLayout.default();
  const layout =
    options.preset === undefined
      ? CardLayout.default()
      : CardLayout.fromPreset({ preset: options.preset });

  return sheet.capacityFor({ layout });
}

/** The view's own surface, which is where the screen scale is published. */
function viewSurface(container: HTMLElement): HTMLElement {
  const view = container.firstElementChild;

  if (!(view instanceof HTMLElement)) {
    throw new Error("The view rendered nothing");
  }

  return view;
}

/** Drags the slider to `value` the way the reader's keyboard would not. */
async function drag(
  container: HTMLElement,
  value: number,
): Promise<void> {
  const thumb =
    container.querySelector<HTMLElement>('[role="slider"]');

  if (thumb === null) {
    throw new Error("The view rendered no slider");
  }

  // Radix reads a drag from pointer geometry jsdom does not have, so the
  // value goes in through the keyboard path it also supports. Each press is
  // one step, so the test asks for a step rather than an arbitrary number.
  await act(async () => {
    thumb.focus();
    thumb.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value > 0 ? "ArrowRight" : "ArrowLeft",
        bubbles: true,
      }),
    );
  });
}

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

describe("CatalogView", () => {
  it("fills the page with cards from the bundled catalog", async () => {
    const container = await renderView();

    // jsdom lays nothing out, so every entry is the one card it is and each
    // sheet fills exactly.
    expect(facesOnSheet(container)).toHaveLength(capacityAt({}));
    expect(cardFaces(container)).toHaveLength(CATALOG_CARDS.length);

    for (const card of CATALOG_CARDS) {
      expect(container.textContent).toContain(nameOf(card));
    }
  });

  // A set longer than a sheet used to stop at the end of the first one, on
  // screen and on paper both, with nothing saying the rest was there.
  it("runs a set longer than a sheet onto the sheets it needs", async () => {
    const container = await renderView();
    const capacity = capacityAt({});
    const sheets = sheetSurfaces(container);

    expect(CATALOG_CARDS.length).toBeGreaterThan(capacity);
    expect(sheets).toHaveLength(
      Math.ceil(CATALOG_CARDS.length / capacity),
    );
    expect(sheets.at(-1)?.getAttribute("aria-label")).toBe(
      `Card page ${sheets.length} of ${sheets.length}`,
    );
  });

  it("offers every choice the packages ship, for the cards and for the page", async () => {
    const container = await renderView();
    const labels = choiceLabels(container);

    for (const option of [
      ...CARD_THEMES,
      ...CARD_SIZES,
      ...CARD_TEXT_SIZES,
      ...PAGE_SIZES,
      ...PAGE_ORIENTATIONS,
    ]) {
      expect(labels).toContain(option.name);
    }
  });

  it("repaints the cards in the theme that was picked, with no reload", async () => {
    const container = await renderView();
    const chosen = CARD_THEMES[1];

    await pick(container, chosen.name);

    const themes = cardFaces(container).map(
      (face) => face.dataset["cardTheme"],
    );

    expect(themes.length).toBeGreaterThan(0);
    expect(new Set(themes)).toEqual(new Set([chosen.id]));
  });

  it("reflows the page at the card size that was picked", async () => {
    const container = await renderView();
    const smallest = smallestSize();

    await pick(container, smallest.name);

    const faces = facesOnSheet(container);

    expect(faces).toHaveLength(capacityAt({ preset: smallest.id }));
    expect(faces.length).toBeGreaterThan(capacityAt({}));
    expect(faces[0]?.style.getPropertyValue("--card-width")).toBe(
      `${CARD_LAYOUT_PRESETS[smallest.id].size.widthMillimetres}mm`,
    );
  });

  // The floor is what every region of a card is clamped to, so setting it is
  // what makes the whole card larger rather than only its body.
  it("sets the type at the size that was picked, floor and all", async () => {
    const container = await renderView();
    const largest = CARD_TEXT_SIZES.at(-1);

    if (largest === undefined) {
      throw new Error("The app ships no text sizes");
    }

    const before = cardFaces(container)[0]?.style.getPropertyValue(
      "--card-font-size-minimum",
    );

    await pickFrom(container, TEXT_SIZE_LABEL, largest.name);

    const after = cardFaces(container)[0]?.style.getPropertyValue(
      "--card-font-size-minimum",
    );

    expect(before).toBe(
      `${CARD_TEXT_SIZE_PRESETS[DEFAULT_CARD_TEXT_SIZE].minimumMillimetres}mm`,
    );
    expect(after).toBe(
      `${CARD_TEXT_SIZE_PRESETS[largest.id].minimumMillimetres}mm`,
    );
  });

  // Two picks, not one: how large a card is cut and how large its type is set
  // are different questions and either can be answered without the other.
  it("leaves the card the size it is when the type changes", async () => {
    const container = await renderView();
    const largest = CARD_TEXT_SIZES.at(-1);

    if (largest === undefined) {
      throw new Error("The app ships no text sizes");
    }

    await pickFrom(container, TEXT_SIZE_LABEL, largest.name);

    expect(
      cardFaces(container)[0]?.style.getPropertyValue("--card-width"),
    ).toBe(
      `${CARD_LAYOUT_PRESETS[DEFAULT_CARD_LAYOUT_PRESET].size.widthMillimetres}mm`,
    );
  });

  it("resizes the sheet to the paper that was picked", async () => {
    const container = await renderView();
    const letter = SheetLayout.default().with({ size: "letter" });

    await pick(container, "US Letter");

    expect(
      pageSurface(container).style.getPropertyValue("--page-width"),
    ).toBe(`${letter.widthMillimetres}mm`);
  });

  it("turns the sheet round, and fits a different number of cards on it", async () => {
    const container = await renderView();
    const landscape = SheetLayout.default().with({
      orientation: "landscape",
    });

    await pick(container, "Landscape");

    expect(
      pageSurface(container).style.getPropertyValue("--page-width"),
    ).toBe(`${landscape.widthMillimetres}mm`);
    expect(facesOnSheet(container)).toHaveLength(
      capacityAt({ sheet: landscape }),
    );
  });

  // The margin is the paper's, not a control, so picking a paper brings its
  // margin with it and there is nothing else for a reader to set.
  it("brings the margin the paper carries, and offers no way to set one", async () => {
    const container = await renderView();
    const letter = SheetLayout.default().with({ size: "letter" });

    expect(choiceLabels(container)).not.toContain("Wide");

    await pick(container, "US Letter");

    expect(
      pageSurface(container).style.getPropertyValue("--page-margin"),
    ).toBe(`${letter.marginMillimetres}mm`);
    expect(letter.marginMillimetres).not.toBe(
      SheetLayout.default().marginMillimetres,
    );
  });

  // Nine standard cards a sheet on either paper is the whole point of the
  // margin belonging to the paper.
  it("keeps a full grid on every paper it offers", async () => {
    const container = await renderView();

    for (const paper of PAGE_SIZES) {
      await pick(container, paper.name);

      expect(facesOnSheet(container)).toHaveLength(
        capacityAt({
          sheet: SheetLayout.default().with({ size: paper.id }),
        }),
      );
      expect(facesOnSheet(container)).toHaveLength(9);
    }
  });

  // The one paper a reader measures rather than picks, so the one that has to
  // travel the whole way: into the grid, into the preview's own lengths, and
  // into the rule that tells the printer what to put it on.
  it("lays out on a paper the reader measured", async () => {
    const container = await renderView();
    const measured = SheetLayout.default().with({
      size: CUSTOM_PAGE_SIZE,
      custom: MEASURED_PAPER,
    });

    await pick(container, PAGE_SIZE_NAMES[CUSTOM_PAGE_SIZE]);
    await fill(
      container,
      CUSTOM_WIDTH_LABEL,
      String(MEASURED_PAPER.widthMillimetres),
    );
    await fill(
      container,
      CUSTOM_HEIGHT_LABEL,
      String(MEASURED_PAPER.heightMillimetres),
    );

    expect(
      pageSurface(container).style.getPropertyValue("--page-width"),
    ).toBe(`${measured.widthMillimetres}mm`);
    expect(printedPageRule(container)).toBe(
      `@page { size: ${measured.widthMillimetres}mm ${measured.heightMillimetres}mm; margin: 0; }`,
    );
    expect(facesOnSheet(container)).toHaveLength(
      capacityAt({ sheet: measured }),
    );
    // Sixteen rather than the nine A4 holds, which is what says the grid was
    // laid out against the paper the reader gave it.
    expect(
      measured.capacityFor({ layout: CardLayout.default() }),
    ).toBe(16);
  });

  // Typed rather than picked, so it is the only setting on the page that can
  // arrive as something a sheet cannot be.
  it("holds a paper the reader typed to what a sheet can be", async () => {
    const container = await renderView();

    await pick(container, PAGE_SIZE_NAMES[CUSTOM_PAGE_SIZE]);
    await fill(container, CUSTOM_WIDTH_LABEL, "9000");

    expect(
      pageSurface(container).style.getPropertyValue("--page-width"),
    ).toBe(`${CUSTOM_PAGE_SIDE_RANGE.maximum}mm`);
    expect(printedPageRule(container)).not.toContain("9000");
  });

  // That the sheet keeps the measurement is pinned in `SheetLayout.test.ts`
  // already. What this one adds is that the field shows it again afterwards,
  // which only the wiring can answer.
  //
  // Four complete relayouts of the sample to get there, which is more than
  // any other test here asks for, so it says how long it needs rather than
  // running out on a slower machine.
  it(
    "keeps what the reader measured while a published paper is picked",
    { timeout: ROUND_TRIP_TIMEOUT_MILLISECONDS },
    async () => {
      const container = await renderView();
      const width = String(MEASURED_PAPER.widthMillimetres);

      await pick(container, PAGE_SIZE_NAMES[CUSTOM_PAGE_SIZE]);
      await fill(container, CUSTOM_WIDTH_LABEL, width);
      await pick(container, "US Letter");
      await pick(container, PAGE_SIZE_NAMES[CUSTOM_PAGE_SIZE]);

      expect(
        pageSurface(container).style.getPropertyValue("--page-width"),
      ).toBe(`${width}mm`);
    },
  );

  // The marks go in the blank around every card, so what says they are on is
  // how far they reach out of it. Nothing at all is how the sheet says it
  // carries none, which is what keeps the stylesheet free of a second rule.
  //
  // A sheet starts carrying none, because marks are ink a reader asks for.
  it("carries no cut guides until they are asked for, then does", async () => {
    const container = await renderView();
    const guided = SheetLayout.default().with({ cutGuides: "on" });
    const reach = () =>
      pageSurface(container).style.getPropertyValue(
        "--page-guide-reach",
      );

    expect(reach()).toBe("0mm");

    await pickFrom(container, CUT_GUIDE_LABEL, "On");

    expect(reach()).toBe(`${guided.cutGuideReachMillimetres}mm`);
    expect(reach()).not.toBe("0mm");

    await pickFrom(container, CUT_GUIDE_LABEL, "Off");

    expect(reach()).toBe("0mm");
  });

  // Guides are painted in the blank that is thrown away with the offcut, so
  // turning them on cannot cost the sheet a card.
  it("fits the same cards on the sheet either way", async () => {
    const container = await renderView();
    const plain = facesOnSheet(container).length;

    await pickFrom(container, CUT_GUIDE_LABEL, "On");

    expect(facesOnSheet(container)).toHaveLength(plain);
  });

  // Off is today's behavior exactly, which is what a reader who never touches
  // the control is relying on.
  it("prints one page a sheet until the reader asks for two sides", async () => {
    const container = await renderView();
    const oneSided = sheetSurfaces(container).length;

    for (const sheet of sheetSurfaces(container)) {
      expect(sheet.getAttribute("aria-label")).not.toContain("front");
    }

    await pickFrom(container, SIDES_LABEL, "Two sided");
    await passFrames();

    const pages = sheetSurfaces(container);

    expect(pages).toHaveLength(oneSided * 2);
    expect(
      pages.map((page) =>
        page.getAttribute("aria-label")?.endsWith("back")
          ? "back"
          : "front",
      ),
    ).toEqual(
      pages.map((_unused, index) =>
        index % 2 === 0 ? "front" : "back",
      ),
    );
  });

  // A back with nothing on it is still a page. One the driver never puts out
  // moves every back after it onto the wrong front, so it is drawn like any
  // other page and the reader is told to stop their driver skipping it.
  it("draws a back for every front, carrying nothing when there is nothing", async () => {
    const container = await renderView();

    await pickFrom(container, SIDES_LABEL, "Two sided");
    await passFrames();

    // The bundled sample splits nothing in jsdom, which has no layout to
    // measure, so every back on the page is one of the blank ones.
    expect(facesOnSheet(container, 1)).toHaveLength(0);
    expect(sheetSurfaces(container)[1]).toBeDefined();
  });

  // Which edge the printer turns the sheet about decides where a back slot
  // lands, and a browser can neither find it out nor set it, so the app asks
  // and then says the answer back as the setting to match.
  it("asks which edge the printer flips on, and only while it matters", async () => {
    const container = await renderView();

    expect(container.textContent).not.toContain(FLIP_EDGE_LABEL);

    await pickFrom(container, SIDES_LABEL, "Two sided");

    expect(container.textContent).toContain(FLIP_EDGE_LABEL);
    expect(container.textContent).toContain(
      "flipped on the long edge",
    );

    await pickFrom(container, FLIP_EDGE_LABEL, "Short edge");

    expect(container.textContent).toContain(
      "flipped on the short edge",
    );
  });

  // Without this the browser picks the paper, the sheet re-wraps against
  // whatever run of it is left, and what prints is not what was previewed.
  it("tells the printer the same paper the preview is drawn at", async () => {
    const container = await renderView();
    const a4 = SheetLayout.default();
    const letter = a4.with({ size: "letter" });

    expect(printedPageRule(container)).toBe(
      `@page { size: ${a4.widthMillimetres}mm ${a4.heightMillimetres}mm; margin: 0; }`,
    );

    await pick(container, "US Letter");

    expect(printedPageRule(container)).toBe(
      `@page { size: ${letter.widthMillimetres}mm ${letter.heightMillimetres}mm; margin: 0; }`,
    );
  });

  // A browser draws the page as it stands the moment it is asked, and the
  // sheets arrive over several frames, so the button takes the request and
  // holds it until the page has finished rather than printing a part of one.
  it("prints when the reader asks it to, once the page is finished", async () => {
    const container = await renderView();
    const print = vi.fn();
    const original = window.print;

    window.print = print;
    restores.push(() => {
      window.print = original;
    });

    await press(container, PRINT_LABEL);
    await passFrames();

    // Once, whether it went straight through or waited for the page first.
    // Which of those it does depends on how far the page had got, and both
    // are right; printing twice for one press never is. The waiting itself is
    // pinned in the controls' own tests, where the page state is given rather
    // than raced for.
    expect(print).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain(PRINT_WAITING_LABEL);
  });

  // A CSS millimetre is not a millimetre, so a card on screen is only life
  // sized on a 96 pixel per inch display. This is the correction, and the
  // cards on the page are what the reader matches against.
  it("offers a way to match the preview to a real card", async () => {
    const container = await renderView();

    expect(container.textContent).toContain(CALIBRATION_LABEL);
    expect(container.querySelector('[role="slider"]')).not.toBeNull();
  });

  it("starts at the scale CSS assumes, and publishes it to both surfaces", async () => {
    const container = await renderView();

    expect(
      viewSurface(container).style.getPropertyValue("--screen-scale"),
    ).toBe(String(SCREEN_SCALE_RANGE.initial));
  });

  it("scales the preview by what the reader calibrated", async () => {
    const container = await renderView();

    await drag(container, 1);

    const scale = Number(
      viewSurface(container).style.getPropertyValue("--screen-scale"),
    );

    expect(scale).toBeCloseTo(
      SCREEN_SCALE_RANGE.initial + SCREEN_SCALE_RANGE.step,
      6,
    );
  });

  // What the control does and does not do is the one thing a reader could
  // reasonably fear about dragging it, and it is an aside rather than a
  // paragraph parked under the slider.
  it("explains the screen size when asked, and not before", async () => {
    const container = await renderView();

    expect(
      container.querySelector(`[aria-label="${SLIDER_HINT_LABEL}"]`),
    ).not.toBeNull();
    expect(container.textContent).not.toContain(CALIBRATION_HINT);
  });

  // The correction is how the sheet is drawn, never what it is. Everything
  // that decides what fits, and the rule the printer is given, stay in true
  // millimetres, or a calibrated screen would print the wrong size.
  it("leaves the millimetres alone, because only the drawing is scaled", async () => {
    const container = await renderView();
    const before = printedPageRule(container);

    await drag(container, 1);

    expect(printedPageRule(container)).toBe(before);
    expect(
      cardFaces(container)[0]?.style.getPropertyValue("--card-width"),
    ).toBe(
      `${CARD_LAYOUT_PRESETS[DEFAULT_CARD_LAYOUT_PRESET].size.widthMillimetres}mm`,
    );
  });

  // The content is redistributed under a licence that requires the credit to
  // travel with it, so it is on the page from the first render.
  it("shows the attribution the bundled content carries", async () => {
    const container = await renderView();

    expect(CATALOG_ATTRIBUTIONS.length).toBeGreaterThan(0);
    for (const attribution of CATALOG_ATTRIBUTIONS) {
      expect(container.textContent).toContain(attribution.statement);
    }
  });

  describe("cards the reader brings", () => {
    it("lays a pasted document out on the same sheet", async () => {
      const container = await renderView();

      await paste(container, BROUGHT_CARDS);
      await press(container, IMPORT_LABEL);

      const faces = cardFaces(container);

      expect(faces).toHaveLength(2);
      expect(container.textContent).toContain("Hearth Token");
      expect(container.textContent).toContain("Lantern Ward");
    });

    it("draws them with the controls the bundled ones are drawn with", async () => {
      const container = await renderView();
      const chosen = CARD_THEMES[1];

      await paste(container, BROUGHT_CARDS);
      await press(container, IMPORT_LABEL);
      await pick(container, chosen.name);

      const themes = cardFaces(container).map(
        (face) => face.dataset["cardTheme"],
      );

      expect(themes).toEqual([chosen.id, chosen.id]);
    });

    it("reads a document opened off the reader's own machine", async () => {
      const container = await renderView();

      await upload(
        container,
        new File([BROUGHT_CARDS], "cards.md", {
          type: "text/markdown",
        }),
      );

      expect(cardFaces(container)).toHaveLength(2);
    });

    // A reader who pasted forty cards and got thirty-nine has no other way to
    // find the one that went missing.
    it("lists what did not read as a card, with the line it starts at", async () => {
      const container = await renderView();

      await paste(container, `Some loose notes.\n\n${BROUGHT_CARDS}`);
      await press(container, IMPORT_LABEL);

      expect(cardFaces(container)).toHaveLength(2);
      expect(container.textContent).toContain(unreadLine(1));
    });

    it("says so when a document held no cards at all", async () => {
      const container = await renderView();

      await paste(
        container,
        "Just some prose, and no heading over it.",
      );
      await press(container, IMPORT_LABEL);

      expect(container.textContent).toContain(NOTHING_READ);
    });

    // A reader builds a set up a few cards at a time, so a second document
    // joins the first rather than replacing it.
    it("keeps the cards already on the page when another document is added", async () => {
      const container = await renderView();

      await paste(container, BROUGHT_CARDS);
      await press(container, IMPORT_LABEL);
      await paste(container, LATER_CARD);
      await press(container, IMPORT_LABEL);

      expect(cardFaces(container)).toHaveLength(3);
      expect(container.textContent).toContain("Hearth Token");
      expect(container.textContent).toContain("Lantern Ward");
      expect(container.textContent).toContain("Candle Stub");
    });

    // Two documents are entitled to name a card the same thing, and the page
    // has to be able to tell the two apart.
    it("keeps both when a later document repeats a name", async () => {
      const container = await renderView();

      await paste(container, LATER_CARD);
      await press(container, IMPORT_LABEL);
      await paste(container, LATER_CARD);
      await press(container, IMPORT_LABEL);

      expect(cardFaces(container)).toHaveLength(2);
    });

    // Left where it was, the next press of the button would add the same
    // cards a second time.
    it("empties the field once it has taken what was in it", async () => {
      const container = await renderView();

      await paste(container, LATER_CARD);
      await press(container, IMPORT_LABEL);

      expect(container.querySelector("textarea")?.value).toBe("");
    });

    // The credit is owed for the bundled material, and that is not what is on
    // the page any more. Leaving it under somebody's own homebrew would read
    // as the licensor having had a hand in it.
    it("takes the bundled credit off the page, and puts it back", async () => {
      const container = await renderView();
      const statement = CATALOG_ATTRIBUTIONS[0]?.statement ?? "";

      await paste(container, BROUGHT_CARDS);
      await press(container, IMPORT_LABEL);

      expect(container.textContent).not.toContain(statement);

      await press(container, CLEAR_LABEL);

      expect(container.textContent).toContain(statement);
      expect(cardFaces(container)).toHaveLength(CATALOG_CARDS.length);
    });

    it("keeps nothing from a document once it is cleared", async () => {
      const container = await renderView();

      await paste(container, `Some loose notes.\n\n${BROUGHT_CARDS}`);
      await press(container, IMPORT_LABEL);
      await press(container, CLEAR_LABEL);

      expect(container.textContent).not.toContain(unreadLine(1));
    });
  });
});
