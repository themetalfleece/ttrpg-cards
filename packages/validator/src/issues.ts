import type { TSchema } from "typebox";
import * as Value from "typebox/value";

import type { ValidationIssue } from "./issues.types";

/** Every failure of `value` against `schema`, rooted at `pathPrefix`. */
export function issuesAgainst(options: {
  schema: TSchema;
  value: unknown;
  pathPrefix: string;
}): ValidationIssue[] {
  return Value.Errors(options.schema, options.value).map((error) => ({
    path: `${options.pathPrefix}${error.instancePath}`,
    message: error.message,
  }));
}

/**
 * One line naming every failure, for an error message. `subject` is what the
 * input failed to be, such as a card or a card layout, and stands in for the
 * path of a failure that has none.
 */
export function describeIssues(options: {
  issues: ValidationIssue[];
  subject: string;
}): string {
  const described = options.issues
    .map((issue) => {
      const location =
        issue.path.length > 0 ? issue.path : `the ${options.subject}`;
      return `${location}: ${issue.message}`;
    })
    .join(", ");

  return described.length > 0
    ? `Not a ${options.subject}. ${described}`
    : `Not a ${options.subject}.`;
}
