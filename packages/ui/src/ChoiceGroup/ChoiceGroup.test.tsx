import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChoiceGroup } from "./ChoiceGroup.component";
import type { ChoiceGroupProps } from "./ChoiceGroup.types";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** The sizes a card can be cut to, which is what this control is for. */
const sizeOptions = [
  { value: "mini", label: "Mini" },
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" },
] as const;

/** The roots a test mounted, torn down after it. */
const roots: Root[] = [];

/** Mounts a group and hands back the container it rendered into. */
function render(
  props: Partial<ChoiceGroupProps<string>> = {},
): HTMLElement {
  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  roots.push(root);

  act(() => {
    root.render(
      <ChoiceGroup
        label={props.label ?? "Card size"}
        options={props.options ?? sizeOptions}
        value={props.value ?? "standard"}
        onValueChange={props.onValueChange ?? (() => {})}
        className={props.className}
      />,
    );
  });

  return container;
}

/** Every choice on offer, in the order it is offered. */
function choices(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[role="radio"]'),
  );
}

/** The choice showing `label`, which a reader would click. */
function choiceLabelled(
  container: HTMLElement,
  label: string,
): HTMLElement {
  const found = choices(container).find(
    (choice) => choice.textContent === label,
  );

  if (found === undefined) {
    throw new Error(`No choice labelled ${label}`);
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
  document.body.replaceChildren();
});

describe("ChoiceGroup", () => {
  it("offers every choice, in the order it was given them", () => {
    const container = render();

    expect(
      choices(container).map((choice) => choice.textContent),
    ).toEqual(["Mini", "Standard", "Large"]);
  });

  it("names the group by the label it shows, rather than repeating it", () => {
    const container = render({ label: "Card size" });
    const group = container.querySelector('[role="radiogroup"]');
    const labelledBy = group?.getAttribute("aria-labelledby");

    expect(labelledBy).toBeTruthy();
    expect(
      container.querySelector(`#${CSS.escape(labelledBy ?? "")}`)
        ?.textContent,
    ).toBe("Card size");
  });

  it("marks the value it is given, and nothing else", () => {
    const container = render({ value: "large" });
    const checked = choices(container).filter(
      (choice) => choice.getAttribute("data-state") === "checked",
    );

    expect(checked.map((choice) => choice.textContent)).toEqual([
      "Large",
    ]);
  });

  it("reports the choice that was picked", () => {
    const onValueChange = vi.fn();
    const container = render({ value: "standard", onValueChange });

    act(() => {
      choiceLabelled(container, "Mini").click();
    });

    expect(onValueChange).toHaveBeenCalledWith("mini");
  });

  // Controlled all the way: nothing moves until the caller says it did, so a
  // consumer that rejects a pick never sees the control disagree with it.
  it("does not change what it draws on its own", () => {
    const container = render({
      value: "standard",
      onValueChange: () => {},
    });

    act(() => {
      choiceLabelled(container, "Mini").click();
    });

    expect(
      choiceLabelled(container, "Standard").getAttribute(
        "data-state",
      ),
    ).toBe("checked");
  });

  it("keeps the class it is passed alongside its own", () => {
    const container = render({ className: "sizeControl" });

    expect(container.innerHTML).toContain("sizeControl");
  });

  it("offers nothing when it is given nothing", () => {
    const container = render({ options: [] });

    expect(choices(container)).toHaveLength(0);
  });
});
