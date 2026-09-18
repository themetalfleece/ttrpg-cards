import { describe, expect, it } from "vitest";

import { Type, Value } from "./index";

const Measurement = Type.Object({
  label: Type.String({ minLength: 1 }),
  millimetres: Type.Number({ exclusiveMinimum: 0 }),
});

describe("validation surface", () => {
  it("accepts a value that satisfies the schema", () => {
    expect(
      Value.Check(Measurement, { label: "margin", millimetres: 4 }),
    ).toBe(true);
  });

  it("rejects a value that violates a constraint", () => {
    expect(
      Value.Check(Measurement, { label: "", millimetres: 4 }),
    ).toBe(false);
  });

  it("reports the location of each failure", () => {
    const errors = [
      ...Value.Errors(Measurement, {
        label: "margin",
        millimetres: 0,
      }),
    ];

    expect(errors.map((error) => error.instancePath)).toEqual([
      "/millimetres",
    ]);
  });

  it("rejects a value that is missing a required field", () => {
    expect(Value.Check(Measurement, { label: "margin" })).toBe(false);
  });
});
