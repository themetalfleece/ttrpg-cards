import { Value } from "@ttrpg-cards/validator";
import { describe, expect, it } from "vitest";

import { RichText } from "./RichText";
import { TEXT_MARKS } from "./text.constants";
import { TextRunsSchema } from "./text.schemas";

describe("RichText.of", () => {
  it("wraps a plain string as a single unmarked run", () => {
    expect(RichText.of("Plain prose.")).toEqual([
      { text: "Plain prose." },
    ]);
  });

  it("builds text the schema accepts", () => {
    expect(Value.Check(TextRunsSchema, RichText.of("Prose."))).toBe(
      true,
    );
  });

  it("refuses an empty string rather than building a bad run", () => {
    expect(() => RichText.of("")).toThrow(TypeError);
    expect(() => RichText.of("")).toThrow(/left off/);
  });

  it("keeps whitespace, which is text like any other", () => {
    expect(RichText.of(" ")).toEqual([{ text: " " }]);
  });
});

describe("RichText.canonical", () => {
  it("merges neighbours that carry no marks", () => {
    expect(
      RichText.canonical([
        { text: "One half, " },
        { text: "then the other." },
      ]),
    ).toEqual([{ text: "One half, then the other." }]);
  });

  it("merges neighbours carrying the same marks", () => {
    expect(
      RichText.canonical([
        { text: "Rough ", marks: [TEXT_MARKS.strong] },
        { text: "water", marks: [TEXT_MARKS.strong] },
      ]),
    ).toEqual([{ text: "Rough water", marks: [TEXT_MARKS.strong] }]);
  });

  it("merges neighbours whose marks differ only in order", () => {
    expect(
      RichText.canonical([
        {
          text: "Both ",
          marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
        },
        {
          text: "at once",
          marks: [TEXT_MARKS.emphasis, TEXT_MARKS.strong],
        },
      ]),
    ).toEqual([
      {
        text: "Both at once",
        marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
      },
    ]);
  });

  it("leaves differently marked neighbours alone", () => {
    const text = [
      { text: "The line is " },
      { text: "scorching", marks: [TEXT_MARKS.strong] },
      { text: "." },
    ];

    expect(RichText.canonical(text)).toEqual(text);
  });

  it("puts marks in one fixed order", () => {
    expect(
      RichText.canonical([
        {
          text: "Both",
          marks: [TEXT_MARKS.emphasis, TEXT_MARKS.strong],
        },
      ]),
    ).toEqual([
      {
        text: "Both",
        marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
      },
    ]);
  });

  it("drops a mark list that carries nothing", () => {
    expect(
      RichText.canonical([{ text: "Unmarked", marks: [] }]),
    ).toEqual([{ text: "Unmarked" }]);
  });

  it("leaves text that is already canonical untouched", () => {
    const text = [
      { text: "Plain, then " },
      { text: "marked", marks: [TEXT_MARKS.emphasis] },
    ];

    expect(RichText.canonical(text)).toEqual(text);
  });

  it("collapses a run of neighbours down to one", () => {
    expect(
      RichText.canonical([
        { text: "a" },
        { text: "b" },
        { text: "c" },
      ]),
    ).toEqual([{ text: "abc" }]);
  });

  it("leaves what it is given untouched", () => {
    const text = [{ text: "One half, " }, { text: "then more." }];

    RichText.canonical(text);

    expect(text).toHaveLength(2);
  });
});

describe("RichText.plain", () => {
  it("returns the characters of a single run", () => {
    expect(RichText.plain([{ text: "A low ring of embers." }])).toBe(
      "A low ring of embers.",
    );
  });

  it("joins runs with nothing between them", () => {
    expect(
      RichText.plain([
        { text: "The line is " },
        { text: "scorching", marks: [TEXT_MARKS.strong] },
        { text: "." },
      ]),
    ).toBe("The line is scorching.");
  });

  it("drops the marks, keeping only the characters", () => {
    expect(
      RichText.plain([
        {
          text: "Both at once",
          marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
        },
      ]),
    ).toBe("Both at once");
  });

  it("round-trips what of built", () => {
    expect(RichText.plain(RichText.of("Plain prose."))).toBe(
      "Plain prose.",
    );
  });
});

describe("RichText.marked", () => {
  it("adds a mark to every run", () => {
    expect(
      RichText.marked(RichText.of("loud"), TEXT_MARKS.strong),
    ).toEqual([{ text: "loud", marks: [TEXT_MARKS.strong] }]);
  });

  it("keeps a mark a run already carries", () => {
    expect(
      RichText.marked(
        [{ text: "both", marks: [TEXT_MARKS.emphasis] }],
        TEXT_MARKS.strong,
      ),
    ).toEqual([
      {
        text: "both",
        marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
      },
    ]);
  });

  it("says the same thing when applied twice", () => {
    const once = RichText.marked(
      RichText.of("loud"),
      TEXT_MARKS.strong,
    );

    expect(RichText.marked(once, TEXT_MARKS.strong)).toEqual(once);
  });

  it("merges neighbours the mark has made alike", () => {
    expect(
      RichText.marked(
        [
          { text: "one" },
          { text: " two", marks: [TEXT_MARKS.strong] },
        ],
        TEXT_MARKS.strong,
      ),
    ).toEqual([{ text: "one two", marks: [TEXT_MARKS.strong] }]);
  });
});

describe("RichText.joined", () => {
  it("lays spans end to end", () => {
    expect(
      RichText.joined(
        [{ text: "one", marks: [TEXT_MARKS.strong] }],
        RichText.of(", two"),
      ),
    ).toEqual([
      { text: "one", marks: [TEXT_MARKS.strong] },
      { text: ", two" },
    ]);
  });

  it("merges the seam when both sides carry the same marks", () => {
    expect(
      RichText.joined(RichText.of("one"), RichText.of(" two")),
    ).toEqual([{ text: "one two" }]);
  });

  it("takes a single span unchanged", () => {
    expect(RichText.joined(RichText.of("alone"))).toEqual([
      { text: "alone" },
    ]);
  });

  it("refuses to build an empty span", () => {
    expect(() => RichText.joined()).toThrow(TypeError);
    expect(() => RichText.joined([], [])).toThrow(TypeError);
  });
});

describe("RichText.split", () => {
  it("cuts on a run boundary without touching either run", () => {
    expect(
      RichText.split({
        text: [
          { text: "Loud." },
          { text: " Quiet.", marks: [TEXT_MARKS.emphasis] },
        ],
        at: 5,
      }),
    ).toEqual([
      [{ text: "Loud." }],
      [{ text: " Quiet.", marks: [TEXT_MARKS.emphasis] }],
    ]);
  });

  it("divides the run the cut lands inside and gives both halves its marks", () => {
    expect(
      RichText.split({
        text: [{ text: "one two", marks: [TEXT_MARKS.strong] }],
        at: 4,
      }),
    ).toEqual([
      [{ text: "one ", marks: [TEXT_MARKS.strong] }],
      [{ text: "two", marks: [TEXT_MARKS.strong] }],
    ]);
  });

  it("loses nothing, so the halves read back as the whole", () => {
    const text = [
      { text: "The water runs backwards " },
      { text: "to the named hour", marks: [TEXT_MARKS.emphasis] },
      { text: ", and everything it touched is touched again." },
    ];

    const [before, after] = RichText.split({ text, at: 30 });

    expect(`${RichText.plain(before)}${RichText.plain(after)}`).toBe(
      RichText.plain(text),
    );
  });

  it("returns both halves canonical", () => {
    const [before, after] = RichText.split({
      text: [{ text: "one " }, { text: "two" }, { text: " three" }],
      at: 7,
    });

    expect(before).toEqual([{ text: "one two" }]);
    expect(after).toEqual([{ text: " three" }]);
  });

  it("refuses an offset that would leave one half empty", () => {
    const text = RichText.of("three");

    expect(() => RichText.split({ text, at: 0 })).toThrow(TypeError);
    expect(() => RichText.split({ text, at: 5 })).toThrow(TypeError);
    expect(() => RichText.split({ text, at: 9 })).toThrow(TypeError);
    expect(() => RichText.split({ text, at: -1 })).toThrow(TypeError);
  });

  it("refuses an offset between characters", () => {
    expect(() =>
      RichText.split({ text: RichText.of("three"), at: 1.5 }),
    ).toThrow(TypeError);
  });

  it("builds halves the schema accepts", () => {
    const halves = RichText.split({
      text: RichText.of("one two"),
      at: 4,
    });

    for (const half of halves) {
      expect(Value.Check(TextRunsSchema, half)).toBe(true);
    }
  });
});
