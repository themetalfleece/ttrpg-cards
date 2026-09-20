import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TextArea } from "./TextArea.component";
import type { TextAreaProps } from "./TextArea.types";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** The roots a test mounted, torn down after it. */
const roots: Root[] = [];

/** Mounts a field and hands back the container it was mounted in. */
function render(props: Partial<TextAreaProps> = {}): HTMLElement {
  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  roots.push(root);

  act(() => {
    root.render(
      <TextArea
        label={props.label ?? "Paste a document"}
        value={props.value ?? ""}
        onValueChange={props.onValueChange ?? (() => {})}
        placeholder={props.placeholder}
        rows={props.rows}
        className={props.className}
      />,
    );
  });

  return container;
}

/** The field itself. */
function fieldIn(container: HTMLElement): HTMLTextAreaElement {
  const field = container.querySelector("textarea");

  if (field === null) {
    throw new Error("The field rendered nothing");
  }

  return field;
}

/** Types `text` into a controlled field the way a browser would. */
function type(field: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  setter?.call(field, text);

  act(() => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
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

describe("TextArea", () => {
  it("shows what it is given", () => {
    expect(fieldIn(render({ value: "## Ward" })).value).toBe(
      "## Ward",
    );
  });

  // A placeholder is gone the moment there is anything in the field, so the
  // question the field is asking is a label instead.
  it("labels the field, and points the label at it", () => {
    const container = render({ label: "Paste a document" });
    const label = container.querySelector("label");

    expect(label?.textContent).toBe("Paste a document");
    expect(label?.getAttribute("for")).toBe(
      fieldIn(container).getAttribute("id"),
    );
  });

  it("reports the text rather than the event", () => {
    const onValueChange = vi.fn();
    const field = fieldIn(render({ onValueChange }));

    type(field, "## Ward");

    expect(onValueChange).toHaveBeenCalledWith("## Ward");
  });

  it("stands as many lines tall as it is asked to", () => {
    expect(fieldIn(render({ rows: 3 })).rows).toBe(3);
  });

  it("keeps the class it is passed alongside its own", () => {
    expect(render({ className: "pasteArea" }).innerHTML).toContain(
      "pasteArea",
    );
  });
});
