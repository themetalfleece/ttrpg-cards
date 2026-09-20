import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Slider } from "./Slider.component";
import { SLIDER_HINT_LABEL } from "./Slider.constants";
import type { SliderProps } from "./Slider.types";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Whatever a test replaced or mounted, undone after it. */
const restores: Array<() => void> = [];
const roots: Root[] = [];

/** Radix measures the track, and jsdom has no `ResizeObserver` to do it with. */
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

/** Mounts a slider and hands back the container it rendered into. */
function render(props: Partial<SliderProps> = {}): HTMLElement {
  stubResizeObserver();

  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  roots.push(root);

  act(() => {
    root.render(
      <Slider
        label={props.label ?? "Screen size"}
        value={props.value ?? 1}
        minimum={props.minimum ?? 0.6}
        maximum={props.maximum ?? 3.2}
        step={props.step ?? 0.005}
        onValueChange={props.onValueChange ?? (() => {})}
        readout={props.readout}
        hint={props.hint}
        className={props.className}
      />,
    );
  });

  return container;
}

/** The thumb a reader drags, which is what carries the value. */
function thumb(container: HTMLElement): HTMLElement {
  const found =
    container.querySelector<HTMLElement>('[role="slider"]');

  if (found === null) {
    throw new Error("The slider rendered no thumb");
  }

  return found;
}

afterEach(() => {
  for (const root of roots) {
    act(() => {
      root.unmount();
    });
  }

  roots.length = 0;

  while (restores.length > 0) {
    restores.pop()?.();
  }

  document.body.replaceChildren();
});

describe("Slider", () => {
  it("sits at the value it is given, within the range it is given", () => {
    const handle = thumb(render({ value: 1.4 }));

    expect(handle.getAttribute("aria-valuenow")).toBe("1.4");
    expect(handle.getAttribute("aria-valuemin")).toBe("0.6");
    expect(handle.getAttribute("aria-valuemax")).toBe("3.2");
  });

  it("names itself by the label it shows, rather than repeating it", () => {
    const container = render({ label: "Screen size" });
    const labelledBy = container
      .querySelector('[role="slider"]')
      ?.closest("[aria-labelledby]")
      ?.getAttribute("aria-labelledby");

    expect(labelledBy).toBeTruthy();
    expect(
      container.querySelector(`#${CSS.escape(labelledBy ?? "")}`)
        ?.textContent,
    ).toBe("Screen size");
  });

  it("shows a readout beside the label when it is given one", () => {
    expect(render({ readout: "142%" }).textContent).toContain("142%");
  });

  it("reports a step when the reader nudges it", () => {
    const onValueChange = vi.fn();
    const handle = thumb(
      render({ value: 1, step: 0.1, onValueChange }),
    );

    act(() => {
      handle.focus();
      handle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      );
    });

    expect(onValueChange).toHaveBeenCalledWith(1.1);
  });

  // Controlled all the way: nothing moves until the caller says it did.
  it("does not move on its own", () => {
    const container = render({ value: 1, step: 0.1 });
    const handle = thumb(container);

    act(() => {
      handle.focus();
      handle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      );
    });

    expect(thumb(container).getAttribute("aria-valuenow")).toBe("1");
  });

  it("offers an aside beside the label only when it is given one", () => {
    expect(
      render().querySelector(`[aria-label="${SLIDER_HINT_LABEL}"]`),
    ).toBeNull();
    expect(
      render({ hint: "Preview only" }).querySelector(
        `[aria-label="${SLIDER_HINT_LABEL}"]`,
      ),
    ).not.toBeNull();
  });

  // The aside is help, so it describes the slider rather than standing in for
  // the label: a reader who never opens it still knows what the control is.
  it("says what it asks whether or not the aside is opened", () => {
    const container = render({
      label: "Screen size",
      hint: "Preview only",
    });

    expect(container.textContent).toContain("Screen size");
    expect(container.textContent).not.toContain("Preview only");
  });

  it("keeps the class it is passed alongside its own", () => {
    expect(render({ className: "calibration" }).innerHTML).toContain(
      "calibration",
    );
  });
});
