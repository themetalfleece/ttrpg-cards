import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilePicker } from "./FilePicker.component";
import type { FilePickerProps } from "./FilePicker.types";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** The roots a test mounted, torn down after it. */
const roots: Root[] = [];

/** Mounts a picker and hands back the container it was mounted in. */
function render(props: Partial<FilePickerProps> = {}): HTMLElement {
  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  roots.push(root);

  act(() => {
    root.render(
      <FilePicker
        onFile={props.onFile ?? (() => {})}
        accept={props.accept}
        disabled={props.disabled}
        className={props.className}
      >
        {props.children ?? "Choose a file"}
      </FilePicker>,
    );
  });

  return container;
}

/** The hidden input the button stands in front of. */
function inputIn(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector("input");

  if (input === null) {
    throw new Error("The picker rendered no input");
  }

  return input;
}

/** The button a reader actually presses. */
function buttonIn(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector("button");

  if (button === null) {
    throw new Error("The picker rendered no button");
  }

  return button;
}

/** Reports a chosen file the way a browser would. */
function choose(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });

  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

afterEach(() => {
  for (const root of roots) {
    act(() => {
      root.unmount();
    });
  }

  roots.length = 0;
  document.body.replaceChildren();
});

describe("FilePicker", () => {
  it("says what it is given", () => {
    expect(buttonIn(render({ children: "Upload" })).textContent).toBe(
      "Upload",
    );
  });

  it("offers the kinds of file it was told to", () => {
    expect(
      inputIn(render({ accept: ".md" })).getAttribute("accept"),
    ).toBe(".md");
  });

  it("opens the picker when the button is pressed", () => {
    const container = render();
    const open = vi.fn();

    inputIn(container).click = open;

    act(() => {
      buttonIn(container).click();
    });

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("reports the file the reader chose", () => {
    const onFile = vi.fn();
    const container = render({ onFile });
    const file = new File(["# Ward"], "ward.md");

    choose(inputIn(container), file);

    expect(onFile).toHaveBeenCalledWith(file);
  });

  // Without this the same file chosen twice in a row reports nothing the
  // second time, because the input's value never changed.
  it("forgets the file it reported, so the same one can be chosen again", () => {
    const container = render();
    const input = inputIn(container);

    choose(input, new File(["# Ward"], "ward.md"));

    expect(input.value).toBe("");
  });

  it("reports nothing when the reader closes the picker empty-handed", () => {
    const onFile = vi.fn();
    const input = inputIn(render({ onFile }));

    act(() => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onFile).not.toHaveBeenCalled();
  });

  it("does not open while it is disabled", () => {
    const container = render({ disabled: true });
    const open = vi.fn();

    inputIn(container).click = open;

    act(() => {
      buttonIn(container).click();
    });

    expect(open).not.toHaveBeenCalled();
  });
});
