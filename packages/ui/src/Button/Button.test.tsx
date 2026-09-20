import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./Button.component";
import type { ButtonProps } from "./Button.types";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** The roots a test mounted, torn down after it. */
const roots: Root[] = [];

/** Mounts a button and hands back the element itself. */
function render(props: Partial<ButtonProps> = {}): HTMLButtonElement {
  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  roots.push(root);

  act(() => {
    root.render(
      <Button
        onPress={props.onPress ?? (() => {})}
        disabled={props.disabled}
        className={props.className}
      >
        {props.children ?? "Print"}
      </Button>,
    );
  });

  const button = container.querySelector("button");

  if (button === null) {
    throw new Error("The button rendered nothing");
  }

  return button;
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

describe("Button", () => {
  it("says what it is given", () => {
    expect(render({ children: "Print" }).textContent).toBe("Print");
  });

  // A bare button inside a form submits it, which is never what this is for.
  it("is never a submit button", () => {
    expect(render().getAttribute("type")).toBe("button");
  });

  it("runs its action when it is pressed", () => {
    const onPress = vi.fn();
    const button = render({ onPress });

    act(() => {
      button.click();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does nothing while it is disabled", () => {
    const onPress = vi.fn();
    const button = render({ onPress, disabled: true });

    act(() => {
      button.click();
    });

    expect(onPress).not.toHaveBeenCalled();
  });

  it("keeps the class it is passed alongside its own", () => {
    expect(render({ className: "printAction" }).className).toContain(
      "printAction",
    );
  });
});
