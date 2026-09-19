# `@ttrpg-cards/validator`

The workspace's single validation surface.

Re-exports TypeBox (`typebox` v1, **not** the legacy `@sinclair/typebox` v0) so the underlying
library is swappable in one place. Every schema and every boundary check in the workspace imports
from here; `no-restricted-imports` bans importing `typebox` anywhere else.

```ts
import { Type, Value } from "@ttrpg-cards/validator";
```

## Reporting failures

`issuesAgainst` turns `Value.Errors` into `ValidationIssue` records, each a JSON pointer into the
checked value and a message, and `describeIssues` joins a list of them into one line for an error
message. Both live here rather than beside any one model: the shape a failure is reported in is
part of the validation surface, so a boundary in the importer, the printer or the catalog reports
in the same form as one in the card model.

```ts
const issues = issuesAgainst({
  schema: CardSchema,
  value,
  pathPrefix: "",
});
throw new TypeError(describeIssues({ issues, subject: "card" }));
```

`pathPrefix` roots the pointers somewhere other than the value you handed in, which is what a
caller checking one element against its own schema needs. `subject` is what the input failed to
be, and it stands in for the path of a failure that has none.

## Using it

- **Validate every untrusted boundary**: imported files, pasted text, records read back from
  browser storage, and URL or query state.
- Define declarative schemas and check them with `Value.Check` / `Value.Errors`. Do not hand-roll
  a parallel field-by-field validator tree.
- Keep cross-field and domain assertions that a structural schema cannot express as small named
  helpers beside the schema.
- Reusable wire-format patterns belong in shared `*.schemas.ts` files and get composed into
  object schemas. Never embed a validation regex in rendering or execution code.
