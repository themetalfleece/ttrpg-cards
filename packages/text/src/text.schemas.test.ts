import { Value } from "@ttrpg-cards/validator";
import { describe, expect, it } from "vitest";

import { TEXT_MARKS } from "./text.constants";
import {
  PlainTextSchema,
  TextMarkSchema,
  TextRunsSchema,
} from "./text.schemas";

describe("TextRunsSchema", () => {
  it("accepts text as a single unmarked run", () => {
    expect(
      Value.Check(TextRunsSchema, [{ text: "Plain prose." }]),
    ).toBe(true);
  });

  it("accepts a marked run beside unmarked ones", () => {
    expect(
      Value.Check(TextRunsSchema, [
        { text: "The line is " },
        { text: "scorching", marks: [TEXT_MARKS.strong] },
        { text: "." },
      ]),
    ).toBe(true);
  });

  it("accepts a run carrying both marks at once", () => {
    expect(
      Value.Check(TextRunsSchema, [
        {
          text: "Both",
          marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
        },
      ]),
    ).toBe(true);
  });

  it("accepts text far longer than a face can hold", () => {
    expect(
      Value.Check(TextRunsSchema, [{ text: "ember ".repeat(2_000) }]),
    ).toBe(true);
  });

  it("rejects text with no runs at all", () => {
    expect(Value.Check(TextRunsSchema, [])).toBe(false);
  });

  it("rejects a plain string, which is the shape it replaced", () => {
    expect(Value.Check(TextRunsSchema, "Plain prose.")).toBe(false);
  });

  it("rejects an empty run", () => {
    expect(Value.Check(TextRunsSchema, [{ text: "" }])).toBe(false);
  });

  it("rejects an empty mark list, since absence already says none", () => {
    expect(
      Value.Check(TextRunsSchema, [{ text: "Unmarked", marks: [] }]),
    ).toBe(false);
  });

  it("rejects the same mark twice on one run", () => {
    expect(
      Value.Check(TextRunsSchema, [
        {
          text: "Doubled",
          marks: [TEXT_MARKS.strong, TEXT_MARKS.strong],
        },
      ]),
    ).toBe(false);
  });

  it("rejects a mark the model does not define", () => {
    expect(
      Value.Check(TextRunsSchema, [
        { text: "Underlined", marks: ["underline"] },
      ]),
    ).toBe(false);
  });

  it("rejects a field the run does not define", () => {
    expect(
      Value.Check(TextRunsSchema, [
        { text: "Coloured", colour: "red" },
      ]),
    ).toBe(false);
  });

  it("reports the position of a failing run", () => {
    const errors = Value.Errors(TextRunsSchema, [
      { text: "Fine." },
      { text: "" },
    ]);

    expect(errors.map((error) => error.instancePath)).toContain(
      "/1/text",
    );
  });
});

describe("TextMarkSchema", () => {
  it("accepts exactly the marks the constants declare", () => {
    const accepted = TextMarkSchema.anyOf.map((mark) => mark.const);

    expect(accepted.sort()).toEqual(Object.values(TEXT_MARKS).sort());
  });
});

describe("PlainTextSchema", () => {
  it("accepts a string with something in it", () => {
    expect(Value.Check(PlainTextSchema, "Ember and Ledger")).toBe(
      true,
    );
  });

  it("rejects an empty string, since absence says nothing instead", () => {
    expect(Value.Check(PlainTextSchema, "")).toBe(false);
  });
});
