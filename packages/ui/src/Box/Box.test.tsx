import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Box } from "./Box.component";
import type { BoxProps } from "./Box.types";

/** The markup a Box renders to, which is the whole of what it decides. */
function markupFor(props: BoxProps): string {
  return renderToStaticMarkup(<Box {...props} />);
}

describe("Box", () => {
  it("is a div unless told otherwise", () => {
    expect(markupFor({ children: "Inside" })).toBe(
      "<div>Inside</div>",
    );
  });

  it("is the element it is given", () => {
    expect(markupFor({ as: "p", children: "Prose" })).toBe(
      "<p>Prose</p>",
    );
    expect(markupFor({ as: "span", children: "Inline" })).toBe(
      "<span>Inline</span>",
    );
  });

  it("carries the class it is given", () => {
    expect(markupFor({ className: "cardBody" })).toContain(
      'class="cardBody"',
    );
  });

  it("carries custom properties through, which is what a surface sets on its root", () => {
    const style = { "--card-width": "70mm" } as BoxProps["style"];

    expect(markupFor({ style })).toContain(
      'style="--card-width:70mm"',
    );
  });

  it("renders nothing inside when given nothing", () => {
    expect(markupFor({})).toBe("<div></div>");
  });
});
