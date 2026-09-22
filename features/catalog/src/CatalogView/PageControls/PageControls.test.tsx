import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PageControls } from "./PageControls.component";
import {
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

/** The controls mounted, and a way to change what they are told. */
function renderControls(printable: boolean): {
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
          paper="a4"
          onPaperChange={() => {}}
          orientation="portrait"
          onOrientationChange={() => {}}
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
