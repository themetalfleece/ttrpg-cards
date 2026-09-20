import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { Tooltip } from "./Tooltip.component";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Whatever a test replaced or mounted, undone after it. */
const restores: Array<() => void> = [];
const roots: Root[] = [];

/** Radix positions the bubble, and the test DOM has nothing to measure with. */
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

/** The words the tooltip carries, used by every test here. */
const CONTENT = "Only changes the preview, never the print.";

/** Mounts a tooltip on a button and hands back that button. */
function render(content = CONTENT): HTMLButtonElement {
  stubResizeObserver();

  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  roots.push(root);

  act(() => {
    root.render(
      <Tooltip content={content}>
        <button type="button">What this does</button>
      </Tooltip>,
    );
  });

  const trigger = container.querySelector("button");

  if (trigger === null) {
    throw new Error("The tooltip rendered no trigger");
  }

  return trigger;
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

describe("Tooltip", () => {
  it("says nothing until it is asked", () => {
    render();

    expect(document.body.textContent).not.toContain(CONTENT);
  });

  // A tooltip that only answers a pointer is one a keyboard reader never
  // reaches, which is the whole reason the trigger has to be focusable.
  it("opens on focus, so a keyboard reaches it too", () => {
    const trigger = render();

    act(() => {
      trigger.focus();
    });

    expect(document.body.textContent).toContain(CONTENT);
  });

  it("describes the trigger, rather than renaming it", () => {
    const trigger = render();

    act(() => {
      trigger.focus();
    });

    const describedBy = trigger.getAttribute("aria-describedby");

    expect(trigger.textContent).toBe("What this does");
    expect(
      document.querySelector(`#${CSS.escape(describedBy ?? "")}`)
        ?.textContent,
    ).toContain(CONTENT);
  });

  // `asChild`, which is what keeps a tooltip from adding a box to a layout.
  it("makes the child the trigger rather than wrapping it", () => {
    const trigger = render();

    expect(trigger.parentElement?.tagName).toBe("DIV");
    expect(document.querySelectorAll("button")).toHaveLength(1);
  });
});
