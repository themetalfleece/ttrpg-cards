import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Separator } from "./Separator.component";
import type { SeparatorProps } from "./Separator.types";

/** The markup a rule renders to, which is where its two decisions show up. */
function markupFor(props: SeparatorProps = {}): string {
  return renderToStaticMarkup(<Separator {...props} />);
}

describe("Separator", () => {
  it("runs horizontally unless told otherwise", () => {
    expect(markupFor()).toContain('data-orientation="horizontal"');
  });

  it("follows the orientation it is given", () => {
    expect(markupFor({ orientation: "vertical" })).toContain(
      'data-orientation="vertical"',
    );
  });

  // A rule between regions separates, it does not announce. Decorative is the
  // explicit `none`, not an absent role, so nothing infers one from the element.
  it("is decorative unless told otherwise", () => {
    expect(markupFor()).toContain('role="none"');
  });

  it("takes a role when it is not decorative", () => {
    expect(markupFor({ decorative: false })).toContain(
      'role="separator"',
    );
  });

  it("keeps the class it is passed alongside its own", () => {
    const markup = markupFor({ className: "cardRule" });

    expect(markup).toContain("cardRule");
    expect(markup).toContain("separator");
  });
});
