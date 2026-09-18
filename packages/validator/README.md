# `@ttrpg-cards/validator`

The workspace's single validation surface.

Re-exports TypeBox (`typebox` v1, **not** the legacy `@sinclair/typebox` v0) so the underlying
library is swappable in one place. Every schema and every boundary check in the workspace imports
from here; `no-restricted-imports` bans importing `typebox` anywhere else.

```ts
import { Type, Value } from "@ttrpg-cards/validator";
```

## Using it

- **Validate every untrusted boundary**: imported files, pasted text, records read back from
  browser storage, and URL or query state.
- Define declarative schemas and check them with `Value.Check` / `Value.Errors`. Do not hand-roll
  a parallel field-by-field validator tree.
- Keep cross-field and domain assertions that a structural schema cannot express as small named
  helpers beside the schema.
- Reusable wire-format patterns belong in shared `*.schemas.ts` files and get composed into
  object schemas. Never embed a validation regex in rendering or execution code.
