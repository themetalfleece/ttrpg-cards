import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NumberField } from "./NumberField.component";
import { COMMIT_KEY } from "./NumberField.constants";
import type { NumberFieldProps } from "./NumberField.types";

// React runs effects synchronously inside `act` only once it knows it is under
// test, and warns on every render until it is told.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Whatever a test mounted, unmounted after it. */
const roots: Root[] = [];

/** Mounts a field and hands back the container it rendered into. */
function render(props: Partial<NumberFieldProps> = {}): HTMLElement {
  const container = document.createElement("div");

  document.body.append(container);

  const root = createRoot(container);

  roots.push(root);

  act(() => {
    root.render(
      <NumberField
        label={props.label ?? "Width"}
        value={props.value ?? 150}
        minimum={props.minimum ?? 50}
        maximum={props.maximum ?? 1200}
        step={props.step ?? 0.1}
        onValueChange={props.onValueChange ?? (() => {})}
        unit={props.unit}
        className={props.className}
      />,
    );
  });

  return container;
}

/** The box the number is typed into. */
function input(container: HTMLElement): HTMLInputElement {
  const found = container.querySelector("input");

  if (found === null) {
    throw new Error("The field rendered no input");
  }

  return found;
}

/**
 * Types `text` into the field, the way a reader replacing a number does.
 *
 * Through the element's own value setter rather than the property, because
 * React patches that property to keep track of what it last rendered: written
 * to directly, the tracker moves with it and React reports no change at all.
 */
function type(field: HTMLInputElement, text: string): void {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  act(() => {
    setValue?.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Leaves the field, which is what React reports as a blur. */
function leave(field: HTMLInputElement): void {
  act(() => {
    field.dispatchEvent(
      new FocusEvent("focusout", { bubbles: true }),
    );
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

describe("NumberField", () => {
  it("shows the value it is given, within the range it is given", () => {
    const field = input(render({ value: 148, minimum: 50 }));

    expect(field.value).toBe("148");
    expect(field.min).toBe("50");
    expect(field.max).toBe("1200");
    expect(field.step).toBe("0.1");
  });

  it("is named by the label it shows", () => {
    const container = render({ label: "Width" });
    const label = container.querySelector("label");

    expect(label?.textContent).toBe("Width");
    expect(label?.htmlFor).toBe(input(container).id);
  });

  // Half a number is not a number. A caller holding this to a range would
  // otherwise take the 1 off a reader on their way to 148.
  it("says nothing while the reader is still typing", () => {
    const onValueChange = vi.fn();

    type(input(render({ onValueChange })), "1");

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("reports what was typed once the reader leaves the field", () => {
    const onValueChange = vi.fn();
    const field = input(render({ onValueChange }));

    type(field, "148");

    leave(field);

    expect(onValueChange).toHaveBeenCalledWith(148);
  });

  it("reports what was typed when the reader presses the commit key", () => {
    const onValueChange = vi.fn();
    const field = input(render({ onValueChange }));

    type(field, "148.5");

    act(() => {
      field.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: COMMIT_KEY,
          bubbles: true,
        }),
      );
    });

    expect(onValueChange).toHaveBeenCalledWith(148.5);
  });

  it("reports nothing at all rather than a number that is not one", () => {
    const onValueChange = vi.fn();
    const field = input(render({ onValueChange }));

    type(field, "");

    leave(field);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(field.value).toBe("150");
  });

  it("says nothing when the reader leaves a field they never typed in", () => {
    const onValueChange = vi.fn();
    const field = input(render({ onValueChange }));

    leave(field);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  // Controlled all the way: what the field shows after a report is whatever
  // the caller settled on, so a number past the range is visibly corrected
  // rather than left standing in a box that lies.
  it("goes back to showing the value it is given once it has reported", () => {
    const field = input(render({ value: 150 }));

    type(field, "9000");

    leave(field);

    expect(field.value).toBe("150");
  });

  // A browser steps a focused number input on the wheel, and this one reports
  // late, so a reader who typed a measurement and scrolled down to look at
  // what it did would never see the number moving under them.
  it("leaves the field when the reader scrolls, rather than stepping", () => {
    const field = input(render());

    act(() => {
      field.focus();
    });

    expect(document.activeElement).toBe(field);

    act(() => {
      field.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    });

    expect(document.activeElement).not.toBe(field);
  });

  it("commits what was typed when the reader scrolls away", () => {
    const onValueChange = vi.fn();
    const field = input(render({ onValueChange }));

    type(field, "148");

    act(() => {
      field.focus();
      field.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    });

    expect(onValueChange).toHaveBeenCalledWith(148);
  });

  it("shows a unit inside the field, and points the number at it", () => {
    const container = render({ unit: "mm" });
    const describedBy = input(container).getAttribute(
      "aria-describedby",
    );

    expect(container.textContent).toContain("mm");
    expect(describedBy).toBeTruthy();
    expect(
      container.querySelector(`#${CSS.escape(describedBy ?? "")}`)
        ?.textContent,
    ).toBe("mm");
  });

  it("describes itself by nothing when it has no unit", () => {
    expect(
      input(render()).getAttribute("aria-describedby"),
    ).toBeNull();
  });

  it("keeps the class it is passed alongside its own", () => {
    expect(render({ className: "paper-width" }).innerHTML).toContain(
      "paper-width",
    );
  });
});
