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
        onFiles={props.onFiles ?? (() => {})}
        accept={props.accept}
        multiple={props.multiple}
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
function choose(
  input: HTMLInputElement,
  ...files: readonly File[]
): void {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: files,
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
    const onFiles = vi.fn();
    const container = render({ onFiles });
    const file = new File(["# Ward"], "ward.md");

    choose(inputIn(container), file);

    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  // A reader bringing a set has it in as many documents as they wrote, and
  // handing them over one at a time is the thing this exists to avoid.
  it("reports every file of a choice, in the order the picker gave them", () => {
    const onFiles = vi.fn();
    const container = render({ onFiles, multiple: true });
    const first = new File(["# Ward"], "ward.md");
    const second = new File(["# Lantern"], "lantern.md");

    choose(inputIn(container), first, second);

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles).toHaveBeenCalledWith([first, second]);
  });

  it("offers one file at a time unless it is told otherwise", () => {
    expect(inputIn(render()).multiple).toBe(false);
    expect(inputIn(render({ multiple: true })).multiple).toBe(true);
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
    const onFiles = vi.fn();
    const input = inputIn(render({ onFiles }));

    act(() => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onFiles).not.toHaveBeenCalled();
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
