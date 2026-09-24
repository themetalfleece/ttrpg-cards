import {
  CUSTOM_PAGE_SIDE_RANGE,
  CUSTOM_PAGE_SIZE,
  SheetLayout,
  type SheetLayoutOverrides,
} from "@ttrpg-cards/printer";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PageControls } from "./PageControls.component";
import {
  CUSTOM_HEIGHT_LABEL,
  CUSTOM_WIDTH_LABEL,
  CUT_GUIDE_LABEL,
  FLIP_EDGE_LABEL,
  PRINT_LABEL,
  PRINT_WAITING_LABEL,
} from "./PageControls.constants";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Enough frames for the button's wait to notice, and how long one lasts. */
const FRAMES_TO_PASS = 6;
const FRAME_MILLISECONDS = 20;

/** Whatever a test replaced or mounted, undone after it. */
const restores: Array<() => void> = [];

/**
 * Frames let by, so the button's wait gets a turn.
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

/** A sheet on the reader's own paper, at a size the test can recognise. */
function measuredSheet(): SheetLayout {
  return SheetLayout.default().with({
    size: CUSTOM_PAGE_SIZE,
    custom: { widthMillimetres: 148, heightMillimetres: 200 },
  });
}

/** A sheet printed on both sides, turning about `flipEdge`. */
function duplexSheet(
  flipEdge: "long-edge" | "short-edge",
): SheetLayout {
  return SheetLayout.default().with({ sides: "double", flipEdge });
}

/** The controls mounted, and a way to change what they are told. */
function renderControls(
  printable: boolean,
  options: {
    sheet?: SheetLayout;
    onSheetChange?: (overrides: SheetLayoutOverrides) => void;
  } = {},
): {
  container: HTMLElement;
  setPrintable: (next: boolean) => void;
} {
  const container = document.createElement("div");

  document.body.append(container);

  const root: Root = createRoot(container);

  const draw = (next: boolean) => {
    act(() => {
      root.render(
        <PageControls
          sheet={options.sheet ?? SheetLayout.default()}
          onSheetChange={options.onSheetChange ?? (() => {})}
          printable={next}
        />,
      );
    });
  };

  draw(printable);

  restores.push(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  return { container, setPrintable: draw };
}

/** The button that prints, whatever it currently says. */
function printButton(container: HTMLElement): HTMLElement {
  const button = Array.from(
    container.querySelectorAll<HTMLElement>("button"),
  ).find((candidate) =>
    [PRINT_LABEL, PRINT_WAITING_LABEL].includes(
      candidate.textContent ?? "",
    ),
  );

  if (button === undefined) {
    throw new Error("The controls rendered no print button");
  }

  return button;
}

/** Replaces `window.print`, so a test can see whether it was reached. */
function watchPrinting(): ReturnType<typeof vi.fn> {
  const print = vi.fn();
  const original = window.print;

  window.print = print;
  restores.push(() => {
    window.print = original;
  });

  return print;
}

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

describe("PageControls", () => {
  it("prints straight away when the page is already finished", () => {
    const print = watchPrinting();
    const { container } = renderControls(true);

    act(() => {
      printButton(container).click();
    });

    expect(print).toHaveBeenCalledTimes(1);
  });

  // A browser draws the page as it stands the moment it is asked, so a print
  // that went ahead here would come out short or come out with entries that
  // have not worked out yet that they need a second card.
  it("waits for a page that is still finishing, and says so", async () => {
    const print = watchPrinting();
    const { container, setPrintable } = renderControls(false);

    act(() => {
      printButton(container).click();
    });

    expect(print).not.toHaveBeenCalled();
    expect(printButton(container).textContent).toBe(
      PRINT_WAITING_LABEL,
    );

    setPrintable(true);
    await passFrames();

    expect(print).toHaveBeenCalledTimes(1);
    expect(printButton(container).textContent).toBe(PRINT_LABEL);
  });

  // Otherwise a reader who presses twice while waiting gets two print dialogs
  // for the one thing they asked for.
  it("takes one press however many times it is pressed while waiting", async () => {
    const print = watchPrinting();
    const { container, setPrintable } = renderControls(false);

    act(() => {
      printButton(container).click();
    });

    expect(printButton(container).hasAttribute("disabled")).toBe(
      true,
    );

    act(() => {
      printButton(container).click();
      printButton(container).click();
    });

    setPrintable(true);
    await passFrames();

    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("PageControls, on the reader's own paper", () => {
  /** The field asking for one side of the custom paper. */
  function sideField(
    container: HTMLElement,
    label: string,
  ): HTMLInputElement {
    const named = Array.from(
      container.querySelectorAll("label"),
    ).find((candidate) => candidate.textContent === label);
    const field = named?.htmlFor
      ? container.querySelector<HTMLInputElement>(
          `#${CSS.escape(named.htmlFor)}`,
        )
      : null;

    if (field === null || field === undefined) {
      throw new Error(`The controls rendered no "${label}" field`);
    }

    return field;
  }

  /** Types `text` into a field and leaves it, which is what reports. */
  function fill(field: HTMLInputElement, text: string): void {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;

    act(() => {
      setValue?.call(field, text);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(
        new FocusEvent("focusout", { bubbles: true }),
      );
    });
  }

  // Two more fields standing open on every sheet would be two settings that
  // do nothing, which is worse than one paper that has to be picked first.
  it("asks for no measurements while a published paper is picked", () => {
    const { container } = renderControls(true, {
      sheet: SheetLayout.default(),
    });

    expect(container.textContent).not.toContain(CUSTOM_WIDTH_LABEL);
    expect(container.textContent).not.toContain(CUSTOM_HEIGHT_LABEL);
  });

  it("asks for both measurements once the reader's own paper is picked", () => {
    const { container } = renderControls(true, {
      sheet: measuredSheet(),
    });

    expect(sideField(container, CUSTOM_WIDTH_LABEL).value).toBe(
      "148",
    );
    expect(sideField(container, CUSTOM_HEIGHT_LABEL).value).toBe(
      "200",
    );
  });

  it("offers the range a sheet can be, on both fields", () => {
    const { container } = renderControls(true, {
      sheet: SheetLayout.default().with({ size: CUSTOM_PAGE_SIZE }),
    });

    for (const label of [CUSTOM_WIDTH_LABEL, CUSTOM_HEIGHT_LABEL]) {
      const field = sideField(container, label);

      expect(field.min).toBe(String(CUSTOM_PAGE_SIDE_RANGE.minimum));
      expect(field.max).toBe(String(CUSTOM_PAGE_SIDE_RANGE.maximum));
    }
  });

  // The sheet takes a paper rather than a side, so a field that changed one
  // has to hand back both or the other would be lost every time.
  it("reports the side that changed alongside the one that did not", () => {
    const onSheetChange = vi.fn();
    const { container } = renderControls(true, {
      sheet: measuredSheet(),
      onSheetChange,
    });

    fill(sideField(container, CUSTOM_WIDTH_LABEL), "120");

    expect(onSheetChange).toHaveBeenCalledWith({
      custom: { widthMillimetres: 120, heightMillimetres: 200 },
    });

    fill(sideField(container, CUSTOM_HEIGHT_LABEL), "180");

    expect(onSheetChange).toHaveBeenLastCalledWith({
      custom: { widthMillimetres: 148, heightMillimetres: 180 },
    });
  });

  // The sheet is what the fields show, and it has already held what was typed
  // to what a paper can be, so a number past the range comes back corrected
  // rather than standing in a box that lies.
  it("shows the measurement the sheet settled on", () => {
    const { container } = renderControls(true, {
      sheet: SheetLayout.default().with({
        size: CUSTOM_PAGE_SIZE,
        custom: {
          widthMillimetres: 9000,
          heightMillimetres: 200,
        },
      }),
    });

    expect(sideField(container, CUSTOM_WIDTH_LABEL).value).toBe(
      String(CUSTOM_PAGE_SIDE_RANGE.maximum),
    );
  });
});

describe("PageControls, cut guides", () => {
  /** What the control asking `label` currently has picked. */
  function picked(
    container: HTMLElement,
    label: string,
  ): string | undefined {
    const group = Array.from(
      container.querySelectorAll<HTMLElement>('[role="radiogroup"]'),
    ).find((candidate) => {
      const labelId = candidate.getAttribute("aria-labelledby") ?? "";

      return (
        container.querySelector(`#${CSS.escape(labelId)}`)
          ?.textContent === label
      );
    });

    if (group === undefined) {
      throw new Error(`The controls rendered no "${label}" control`);
    }

    return (
      Array.from(
        group.querySelectorAll<HTMLElement>('[role="radio"]'),
      ).find(
        (choice) => choice.getAttribute("aria-checked") === "true",
      )?.textContent ?? undefined
    );
  }

  // Offered on every sheet, not only a two sided one: guides are about the
  // blade rather than about the printer.
  it("asks whether the sheet carries them, and starts with them off", () => {
    const { container } = renderControls(true);

    expect(container.textContent).toContain(CUT_GUIDE_LABEL);
    expect(picked(container, CUT_GUIDE_LABEL)).toBe("Off");
  });

  it("shows them on once the sheet carries them", () => {
    const { container } = renderControls(true, {
      sheet: SheetLayout.default().with({ cutGuides: "on" }),
    });

    expect(picked(container, CUT_GUIDE_LABEL)).toBe("On");
  });

  it("reports the setting alone, so the rest of the sheet is left be", () => {
    const onSheetChange = vi.fn();
    const { container } = renderControls(true, { onSheetChange });
    const on = Array.from(
      container.querySelectorAll<HTMLElement>('[role="radio"]'),
    ).find((choice) => choice.textContent === "On");

    act(() => {
      on?.click();
    });

    expect(onSheetChange).toHaveBeenCalledWith({ cutGuides: "on" });
  });
});

describe("PageControls, printed on both sides", () => {
  // None of it is true while the job is one sided, and a standing instruction
  // a reader cannot act on is noise.
  it("says nothing about flipping while the job is one sided", () => {
    const { container } = renderControls(true, {
      sheet: SheetLayout.default(),
    });

    expect(container.textContent).not.toContain(FLIP_EDGE_LABEL);
    expect(container.textContent).not.toContain("double-sided");
  });

  it("asks which edge the printer flips on once it is two sided", () => {
    const { container } = renderControls(true, {
      sheet: duplexSheet("long-edge"),
    });

    expect(container.textContent).toContain(FLIP_EDGE_LABEL);
  });

  // Matching this control to the print dialog is the one thing a reader has to
  // do, so the note names the edge they picked rather than describing both.
  it("names the edge it was given, and follows a change of it", () => {
    const long = renderControls(true, {
      sheet: duplexSheet("long-edge"),
    });

    expect(long.container.textContent).toContain(
      "flipped on the long edge",
    );

    const short = renderControls(true, {
      sheet: duplexSheet("short-edge"),
    });

    expect(short.container.textContent).toContain(
      "flipped on the short edge",
    );
  });

  // A driver that drops a blank back moves every back after it onto the wrong
  // front, and the app cannot stop it, so it says so.
  it("asks for the blank backs to be left alone", () => {
    const { container } = renderControls(true, {
      sheet: duplexSheet("long-edge"),
    });

    expect(container.textContent).toContain("skip blank pages");
  });
});
