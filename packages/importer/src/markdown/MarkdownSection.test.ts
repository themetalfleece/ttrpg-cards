import { RichText } from "@ttrpg-cards/text";
import { describe, expect, it } from "vitest";

import { MarkdownSection } from "./MarkdownSection";
import type { SourceLine } from "./markdown.types";

/** A section built from a heading and the lines written under it. */
function section(
  heading: string,
  ...lines: string[]
): MarkdownSection {
  const under: SourceLine[] = lines.map((text, index) => ({
    number: index + 2,
    text,
  }));

  return new MarkdownSection({
    heading: { number: 1, text: heading },
    lines: under,
  });
}

describe("MarkdownSection", () => {
  it("reports the line its heading was read from", () => {
    expect(section("Ward", "It holds.").line).toBe(1);
  });

  it("reads the heading as the card's name", () => {
    expect(section("Lantern Ward").name).toEqual(
      RichText.of("Lantern Ward"),
    );
  });

  it("has no name when the heading said nothing", () => {
    expect(section("   ").name).toBeUndefined();
    expect(section("![art](art.png)").name).toBeUndefined();
  });

  it("resolves the name's markup away for an identifier", () => {
    expect(section("**Lantern** Ward [3]").plainName).toBe(
      "Lantern Ward",
    );
  });

  it("knows when the heading has nothing under it", () => {
    expect(section("Ward").hasContent).toBe(false);
    expect(section("Ward", "", "  ").hasContent).toBe(false);
    expect(section("Ward", "It holds.").hasContent).toBe(true);
  });

  it("builds a card under the identifier it is given", () => {
    const card = section("Ward", "It holds.").cardFrom({
      id: "imported:ward",
    });

    expect(card?.id).toBe("imported:ward");
    expect(card?.meta).toEqual([]);
  });

  it("builds nothing from a heading with no name in it", () => {
    expect(
      section("   ", "It holds.").cardFrom({ id: "imported:ward" }),
    ).toBeUndefined();
  });

  it("keeps the emphasis a name carries", () => {
    const card = section("**Lantern** Ward", "It holds.").cardFrom({
      id: "imported:lantern-ward",
    });

    expect(card?.name).toEqual(
      RichText.joined(
        RichText.marked(RichText.of("Lantern"), "strong"),
        RichText.of(" Ward"),
      ),
    );
  });
});
