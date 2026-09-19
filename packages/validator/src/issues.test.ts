import { describe, expect, it } from "vitest";

import { Type } from "./index";
import { describeIssues, issuesAgainst } from "./issues";

const NamedThingSchema = Type.Object(
  { name: Type.String({ minLength: 1 }) },
  { additionalProperties: false },
);

describe("issuesAgainst", () => {
  it("reports nothing for a value that matches", () => {
    expect(
      issuesAgainst({
        schema: NamedThingSchema,
        value: { name: "Emberwake Sigil" },
        pathPrefix: "",
      }),
    ).toEqual([]);
  });

  it("reports the path and a message for each failure", () => {
    const issues = issuesAgainst({
      schema: NamedThingSchema,
      value: { name: "" },
      pathPrefix: "",
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("/name");
    expect(issues[0]?.message.length).toBeGreaterThan(0);
  });

  it("roots every path at the prefix", () => {
    const issues = issuesAgainst({
      schema: NamedThingSchema,
      value: { name: "" },
      pathPrefix: "/body/2",
    });

    expect(issues[0]?.path).toBe("/body/2/name");
  });

  it("leaves the path at the prefix for a failure of the whole value", () => {
    const issues = issuesAgainst({
      schema: NamedThingSchema,
      value: 42,
      pathPrefix: "",
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.path).toBe("");
  });
});

describe("describeIssues", () => {
  it("names the subject alone when there is nothing wrong", () => {
    expect(describeIssues({ issues: [], subject: "card" })).toBe(
      "Not a card.",
    );
  });

  it("names every failure and where it is", () => {
    expect(
      describeIssues({
        issues: [
          { path: "/id", message: "must be string" },
          { path: "/name", message: "must not be empty" },
        ],
        subject: "card",
      }),
    ).toBe(
      "Not a card. /id: must be string, /name: must not be empty",
    );
  });

  it("stands the subject in for a failure with no path", () => {
    expect(
      describeIssues({
        issues: [{ path: "", message: "must be object" }],
        subject: "card layout",
      }),
    ).toBe("Not a card layout. the card layout: must be object");
  });
});
