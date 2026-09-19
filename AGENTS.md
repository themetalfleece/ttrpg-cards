<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `apps/web/node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# TTRPG Cards

A browser app for laying out and printing tabletop reference cards. It ships a bundled, openly-licensed catalog, lets a user bring their own content, and produces print-ready sheets at real physical dimensions.

The app is **fully static**. `next build` emits an `out/` directory of HTML, CSS, and JS; there is no server, no API, and no backend. Everything (parsing, layout, storage, print generation) happens in the browser.

Monorepo built with pnpm workspaces + Turborepo, Next.js (App Router) and TypeScript, plain CSS via CSS Modules, and Radix primitives wrapped in `@ttrpg-cards/ui`. Domain logic lives in workspace packages (`@ttrpg-cards/*`) and feature slices (`features/*`); `apps/web` is a thin, enforced wrapper.

## Stack

- **Framework**: Next.js App Router, **static export** (`output: "export"`)
- **Language**: TypeScript
- **UI primitives**: **Radix** (`radix-ui`) wrapped in `@ttrpg-cards/ui`
- **Styling**: Plain CSS Modules with native CSS nesting (no Tailwind, no Sass, no styled-components)
- **Runtime validation**: **TypeBox** (`typebox`, v1) re-exported via `@ttrpg-cards/validator`
- **Persistence**: **IndexedDB** for card data, local preferences for small UI state, both behind `@ttrpg-cards/storage`
- **Package manager**: pnpm + Turborepo
- **Node**: see `.nvmrc` for the required version
- **Testing**: Vitest
- **Component workshop**: Storybook, hosted in `@ttrpg-cards/ui`

All third-party packages are pinned to the **latest stable** at add-time. Versions live in the `catalog` in `pnpm-workspace.yaml` and are referenced from manifests as `catalog:`, so a version is declared in exactly one place.

## Monorepo Layout

```
ttrpg-cards/
  apps/
    web/          # Next.js App Router app (thin wrapper: static export config, routes, layouts)
  features/       # feature slices: UI + logic, testable without the framework
  packages/       # @ttrpg-cards/* workspace packages (each with an explicit `exports` surface)
    card/ core/ srd/ importer/ printer/ storage/ text/ ui/ validator/
```

| Package                  | Owns                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `@ttrpg-cards/card`      | card domain model, schemas, layout configuration                     |
| `@ttrpg-cards/core`      | generic building blocks that do not belong to another package        |
| `@ttrpg-cards/srd`       | bundled openly-licensed catalog, extraction, provenance, attribution |
| `@ttrpg-cards/importer`  | JSON and Markdown parsing into the card model                        |
| `@ttrpg-cards/printer`   | sheet layout, pagination, PDF generation                             |
| `@ttrpg-cards/storage`   | IndexedDB persistence, local preferences                             |
| `@ttrpg-cards/text`      | rich text runs, the marks they carry, and their canonical form       |
| `@ttrpg-cards/ui`        | Radix-based primitives, card renderer, themes                        |
| `@ttrpg-cards/validator` | TypeBox re-export, the single validation surface                     |

**Dependency direction points inward:** `apps/web` → `features/*` → `packages/*`. `packages/*` never import `features/*` or app code; `features/*` never import `apps/web`. This keeps the app shell swappable and the logic testable in isolation.

A feature slice is a workspace package named `@ttrpg-cards/feature-<slice>` living in `features/<slice>/`. A capability becomes a `packages/*` entry instead when it wraps a third-party dependency we want swappable, or when it is reused across features and must not drift.

**Packages hold domain logic, not only third-party wrappers.** The card model and its schemas are `@ttrpg-cards/card` because `srd`, `importer`, `printer`, `storage` and `ui` all depend on them, and `packages/*` may never import `features/*`. Putting the model in a feature would invert the dependency direction for five packages at once. A feature slice is a slice of the app's UI and behaviour; it is not the home for the vocabulary every slice speaks.

## Content Rules (non-negotiable)

These are the constraints the project exists under. They are not style preferences and they are not negotiable in a review.

- **Nothing the app ships ever transmits.** No server call, no remote fetch of content, no share link, no analytics, no telemetry, no error reporting. The app is static and stays that way. A feature that needs the network does not ship. Lint-enforced, not merely documented: `no-restricted-globals`, `no-restricted-properties`, and `no-restricted-syntax` together ban `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, and `serviceWorker` (including behind a `window.`, `globalThis.`, or `navigator.` prefix), and no package is exempt, `@ttrpg-cards/storage` included. The ban extends to tooling: Storybook, Next, and Turborepo telemetry are all switched off, in the package scripts and again in CI. A name-based rule cannot catch an alias or a computed property, so treat it as a guardrail rather than a proof; the proof is that nothing in `out/` opens a connection.
- **The hosting layer is outside this rule; the user's browser is not.** Analytics a host derives from its own request logs add no code to the bundle and ask nothing of the visitor's machine: that is a deployment decision and this rule does not reach it. A client-side beacon is a different thing entirely: it makes the _user's browser_ transmit, which is precisely what the rule forbids, and it stays off no matter who injects it or how convenient the toggle is. Hosts routinely sell both under one product name, so check which one is switched on rather than trusting the label.
- **Local persistence is expected and correct.** The user's full card set is stored in their own browser so it survives a reload. Transmission is the line, not persistence.
- **Never fetch content from a third-party source**, not even client-side, not even behind a button the user clicks. The importer reads what it is handed and nothing else.
- **Import parsers stay forgiving.** A parser must accept a range of reasonable input shapes rather than tracking one tool's exact output. This is a hard requirement, not polish.
- **No game-system names in tracked files**, not in identifiers, strings, comments, tests, fixtures, file names, docs, or user-facing copy. The one carve-out is the licence attribution statements, which must be reproduced **verbatim** and are therefore exempt.
- **Fixtures are bundled licensed content or original material.** Never a third-party product's file.
- **No trade dress.** Do not imitate any published product's visual identity.

## Licensing

- **The software is MIT; the bundled catalog is not.** [`LICENSE`](./LICENSE) covers the code. The reference content in `@ttrpg-cards/srd` is redistributed under CC BY 4.0 and keeps its own terms. [`NOTICE.md`](./NOTICE.md) is the authoritative split. Read it before touching anything licence-shaped.
- **The copyright holder is `Iason Athanasoglou`, and that spelling is deliberate.** It is the legal name, and it does not match the git identity configured on the authoring machine. Never "correct" `LICENSE` to agree with a commit author, a git config value, or a GitHub handle; the legal name is the one that governs and the others are free to differ.
- **The licensor's attribution statement is reproduced verbatim** and ships alongside the data it covers. This is the sole exemption to the no-names rule above. Never paraphrase it, never reflow it, and never let a formatter or a codemod rewrite it.
- **The shipped attribution carries all five CC BY 4.0 obligations, not just the statement**: the verbatim attribution; the retained copyright, licence-reference and warranty notices; **a link to the licensor's published source** (an internal provenance record does not discharge this); the licence identification and link; **and a declaration that we modified the material** (extracting published documents into structured data is a modification). See [`NOTICE.md`](./NOTICE.md) for the list and for §3(a)(2), which permits a short credit linking to one page that carries the full set. That is the answer for surfaces too small to hold it. An attribution that looks complete but omits the source link or the modification notice is still non-compliant.
- **Attribution is a ceiling as well as a floor.** Nothing beyond the required statement may credit the licensor or imply their endorsement. This is our own policy, reinforced by the licensor's published guidance. It is not a CC BY 4.0 requirement, so do not cite the licence as its source.
- **Never fold the bundled content into `LICENSE`**, never describe the project as wholly MIT once the catalog ships, and never add contributor names to `LICENSE`. Contributors keep their copyright and that file is not a roster.
- **Check a new dependency's licence before adding it.** Permissive (MIT, ISC, BSD, Apache-2.0) is fine. A copyleft licence that would reach our source is not, and is worth raising rather than working around.
- **`packages/srd/LICENSE` holds the CC BY 4.0 text verbatim** and travels with the data it covers. §3(a)(1)(C) allows a link, but this app runs offline, so the text ships. Never edit that file; it is the licence, not our prose. Our explanation of the split lives in `NOTICE.md` and `packages/srd/README.md`.

## Project Conventions

### Styling

- Use CSS Modules exclusively (`.module.css` files) with native CSS nesting.
- No CSS utility libraries (Tailwind, etc.). No preprocessors (no Sass/SCSS); plain CSS covers all our needs (nesting, variables, media queries).
- **The theme lives in `packages/ui/src/theme.css`** and declares every colour, spacing, typography, shape, and elevation custom property. `apps/web/app/globals.css` imports it and adds only document-level resets.
- **Never hardcode colours, spacing, or typography.** All values must use custom properties from the theme. Add new variables there when needed.
- **The ambient module declaration for `*.module.css` lives once, in `types/css-modules.d.ts`.** Any package that imports a stylesheet adds that path to its tsconfig `include` (`"../../types/css-modules.d.ts"`). Never re-declare it per package: six copies of the same declaration is exactly the duplication that drifts. `apps/web` is the exception: `next-env.d.ts` already supplies it.

### Component Structure

Feature/component-based structure. Each component lives in its own directory with only the files it needs:

```
ComponentName/
  ComponentName.component.tsx   # React component, render-only
  ComponentName.module.css      # Scoped CSS module styles
  ComponentName.types.ts        # TypeScript types and interfaces (props, data shapes)
  ComponentName.constants.ts    # Constants and static data
  ComponentName.hooks.ts        # Custom hooks and side-effects (useEffect, etc.)
  ComponentName.data.ts         # Computation and data-shaping logic
  ComponentName.schemas.ts      # TypeBox schemas guarding this component's boundaries
  ComponentName.stories.tsx     # Storybook story (primitives in @ttrpg-cards/ui)
  index.ts                      # Public export barrel
```

Not every file is required. Only create what the component needs.

### File Placement Rules

- **Types and interfaces** (e.g. props like `CardFaceProps`) go in the component's `.types.ts` file. Never define types inline in `.component.tsx`.
- **Next.js route files are the exception**: `layout.tsx`, `page.tsx`, and friends keep their props inline, because the framework owns that signature and the file is an adapter rather than a component.
- **`useEffect` hooks** and other side-effects (click-outside handlers, resize observers) go in `.hooks.ts`, never inline in `.component.tsx`.
- **Standalone functions** (encoding helpers, validators, formatters) go in `.hooks.ts` (behaviour helpers) or `.data.ts` (computation). Keep `.component.tsx` focused on rendering.
- **Large computation** (text measurement, overflow splitting, sheet pagination) goes in the owning package, not in a component file.
- **Keep one domain class per implementation file.** Name the file for the class and expose related construction, codec, and query-building behaviour as class statics rather than adjacent `build*` / `encode*` / `decode*` free functions.
- **SVG icons** are extracted into their own component files in `@ttrpg-cards/ui` and consumed from there. Never embed raw SVG markup in a feature component's JSX, and never reintroduce app-local icon components in `apps/web`.
- **`.test.ts` is reserved for tests**, never for data/computation modules.
- **Every workspace package carries a `README.md`** covering what it owns, the rules specific to it, and the boundaries it keeps. The `src/index.ts` barrel keeps a one-line TSDoc pointing there, enough to show on hover, with the prose somewhere a reader browsing the repo will actually find it. Prose that explains a whole package does not belong in a barrel file.

### Inner Components

- Use inner components for repeated or distinct UI fragments within a feature directory. Inner components drop the parent's prefix (file `TitleRow.component.tsx`, export `TitleRow`) since the surrounding directory conveys scope; only re-add the parent prefix when an inner name would otherwise be too generic to read at a glance.
- Inner components live in the same directory as their parent, not in a separate top-level directory.

### Imports

- **No parent-relative imports two or more levels up.** Never import from `../../` (or deeper).
- Use `@/...` for cross-directory imports **inside `apps/web`** (the alias resolves to `apps/web/`). Reach feature slices and packages by their workspace names (`@ttrpg-cards/feature-<slice>` and `@ttrpg-cards/<package>`), never through a relative path or a `src/` path.
- Import package primitives from their named subpath: `import { Card } from "@ttrpg-cards/ui/Card"`. Each package's `exports` map keeps the surface explicit and tree-shakeable.
- Sibling imports (`./foo`) and one-level parent-relative imports (`../foo`) are both fine. The latter is how an inner component reaches a sibling inner component within the same parent feature directory.
- The `no-restricted-imports` ESLint rule enforces these boundaries, including the direction of dependencies and the ownership rules below.

### Runtime Validation

- **Use TypeBox for all runtime JSON-boundary validation.** All schemas import from **`@ttrpg-cards/validator`**, which re-exports TypeBox (`typebox` v1, **not** the legacy `@sinclair/typebox` v0) so we have a single, swappable validation surface. Never import `typebox` directly outside `@ttrpg-cards/validator`.
- Define declarative schemas and validate with `Value.Check` / `Value.Errors`; do not build parallel field-by-field validator trees by hand.
- **Validate every untrusted boundary**: imported files, pasted text, stored records read back from the browser, and URL/query state. Then keep any cross-field/domain assertions a structural schema cannot express as small named helpers.
- **Text the reader sees is rich text; identifiers, keys and attribution are plain strings.** A field rendered on a card is `TextRuns` from `@ttrpg-cards/text`, so any of it can carry emphasis and every consumer handles one shape rather than asking which kind of text it was handed. Ids and search keys never render, and an attribution has to be reproduced exactly as the licensor wrote it, so neither belongs in a structure built to merge and normalise runs.
- **Markup is never stored in a string.** Emphasis is structured, and markdown is an import format: the importer parses it into runs on the way in. A string holding syntax makes every reader of the model a parser, and the one that forgets is quietly wrong.
- **A wire-format key follows the ecosystem's spelling, not our prose's.** Our documentation writes "licence"; the JSON key is `license`, because that is what manifests, licence identifiers and other tools write. Schemas reject unknown fields, which turns a spelling difference into a rejected file rather than an ignored key.
- **Keep reusable wire-format patterns in shared `*.schemas.ts` files** (or a package-level validation module) and compose them into object schemas. Never embed validation regexes in execution or rendering code.

### Dependency Encapsulation & Package Boundaries

- **Every third-party dependency is owned by exactly one package** and reached through that package's stable interface, never imported directly by features or the app. Validation goes through `@ttrpg-cards/validator` (TypeBox), primitives through `@ttrpg-cards/ui` (Radix), persistence through `@ttrpg-cards/storage` (IndexedDB).
- Switching an implementation later means satisfying the same interface; feature and app code never changes. **Enforced by `no-restricted-imports`**, which bans the owned dependency everywhere except its owning package.
- **Only `apps/web` may import the framework.** `next` and `next/*` are banned in `features/*` and `packages/*` so every slice stays unit-testable without Next.js.

### `apps/web` Is a Thin Wrapper (enforced, not asserted)

- `apps/web` owns **only** what is intrinsically Next.js: the route tree (`app/`), root layouts, `next.config.ts`, and the document-level stylesheet.
- Every `page.tsx` is a thin adapter: resolve params → validate (TypeBox) → render a `features/*` component. Route files stay well under ~50 lines.
- **No domain logic and no third-party dependency calls live in `apps/web`.** Quick test: if a piece of code could be unit-tested _without_ Next.js, it belongs in a feature or package, not the app.
- **The app may import only `@ttrpg-cards/ui` and `@ttrpg-cards/validator`**, which is what a thin adapter and the root layout actually need. `no-restricted-imports` bans the domain packages (`core`, `importer`, `printer`, `srd`, `storage`) inside `apps/web`; reach them through a `features/*` slice. They stay in `apps/web/package.json` regardless, because `transpilePackages` needs them resolvable.
- There are **no environment variables and no secrets**. The build produces static files; anything configurable is either a build-time constant in a package or a user preference in `@ttrpg-cards/storage`.

### Card Geometry and Units

- **Dimensions are a live property, not a constant.** Card width and height initialise from the default declared in `@ttrpg-cards/card` and can be changed at runtime; the renderer, the text-fitting routine, and the print pipeline all read from that property.
- **Nothing outside that default declaration may hardcode a card dimension.** If you find yourself typing a card measurement into a component or a stylesheet, read it from the layout configuration instead.
- **Physical units throughout**: millimetres, never pixels, so screen and print agree.
- **The domain model carries content, never layout.** No field names a position on the card, and no schema caps a length because a region looks small. Ordered lists let the theme decide how to set them out, and what actually fits is the fitting routine's call against live dimensions. A `maxLength` written for a layout reason is a card measurement in disguise, and it rejects a user's content for something the model is not entitled to know.
- Structure work so additional card sizes can be added without touching the renderer.

### Storage

- **IndexedDB for card data. Local preferences only for small UI state** (selected theme, chosen card size, last view). Preference storage caps at a few megabytes, is synchronous, and stores strings only; the catalog alone is far too large for it.
- **No feature or app code touches a storage API directly.** Everything goes through `@ttrpg-cards/storage`. ESLint `no-restricted-globals` and `no-restricted-properties` rules enforce this, so `window.localStorage` and `globalThis.indexedDB` are blocked alongside the bare globals.
- Handle quota exhaustion explicitly: a large import can hit it. Offer a real "clear stored data" control.

### Class-Based Data Encapsulation

When a single conceptual entity has many associated computations or derivations that would otherwise be passed as raw fields to a sprawl of helper functions, **wrap it in a class** with the data on the constructor and the derivations as getters / methods (e.g. a `CardSet` or `SheetLayout` value object).

- **Trigger**: more than ~5 free functions all read the same shape of input, or call sites repeatedly destructure the same fields and pass them around.
- **Don't trigger** for one-off helpers, pure transforms, or anything without persistent context.
- Place the class in its owning package with a co-located `<entity>.test.ts`. Public API gets TSDoc.
- **Constructor takes a single options object** so the call site reads as `new SheetLayout({ dimensions, margins })`, not positional args.
- **Use `private` or `#` on a declared field for internal state**, never the underscore-prefixed convention, and never a constructor parameter property (`constructor(private readonly x: T)`), which `erasableSyntaxOnly` rejects. Declare the field, then assign it in the constructor body.
- Expose getters for derived values (`get overflows()`) and methods only for actions or parameterised reads; statics for construction helpers.

### UI Package (Radix)

- **Use `@ttrpg-cards/ui` whenever a primitive exists** (Button, Card, Dialog, Select, Tabs, Toast, Input, …). Feature components compose these. Never reimplement a primitive in `apps/web` or a feature if the UI package already ships one.
- **Add new primitives to `packages/ui/src/<PrimitiveName>/`, not to `apps/web`.** A "primitive" is anything feature-agnostic; if two features would share the same building block, lift it into the UI package with a story and tests.
- Layout knobs go on the primitive's props, not on consumer CSS.
- **Run Storybook (`pnpm storybook`) when adding or modifying a primitive** so the new variant is visually verifiable, and add a `.stories.tsx` alongside it.

### Code Style

- **TypeScript only. There is no JavaScript in this repo, and `allowJs` stays off.** Next's generated `tsconfig.json` sets it; it has been removed deliberately and must not come back. A `.js` or `.jsx` source file is a mistake, not a shortcut. Config files that must be JS (`eslint.config.mjs`) are linted like everything else.
- **Compiler strictness is a floor, not a preference.** `tsconfig.base.json` turns on `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noImplicitOverride`, `noUnused*`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, and disallows unreachable code and unused labels. Do not relax one to make a change compile; fix the code. (`noPropertyAccessFromIndexSignature` is the one deliberate omission: CSS Modules are typed as an index signature, so it would force `styles["card"]` at every call site and fight the styling convention.)
- **`erasableSyntaxOnly` is on: enums, parameter properties, and namespaces are not available.** Packages ship TypeScript source that is type-stripped rather than compiled, so a construct that needs a runtime transform cannot survive the pipeline. The error is `TS1294`, and the answer is never to switch the flag off:
  - Instead of an enum, use a `const` object with a derived union: `const PAPER_ORIENTATIONS = { portrait: "portrait", landscape: "landscape" } as const; type PaperOrientation = keyof typeof PAPER_ORIENTATIONS`. It stays a plain object at runtime and new entries are additive. Use it only where the set really is closed; card dimensions are not, so see Card Geometry before reaching for it there.
  - Instead of `constructor(private readonly x: T)`, declare the field and assign it in the constructor body.
  - Instead of a namespace, use a module.
- **Never use nested ternaries.** Extract a function with clear `if`/`return` paths. A single ternary is fine; nesting one inside another is not.
- **Add TSDoc comments** to exported functions and non-trivial helpers. Don't overdo it, and skip comments for obvious one-liners.
- **Keep comments concise.** A comment states, briefly, _what_ the code does and _why_ it exists, nothing else. Don't explain how a framework works, don't narrate history ("used to X, now Y"), and describe only the current state. Reserve verbosity for a special-case branch, a non-obvious invariant, or a gotcha a future reader must know.
- **Use full variable names.** Never abbreviate (`sourceEntry` not `srcEntry`, `cardIdentifier` not `cardId` where ambiguous).
- **No underscore-prefixed private fields.** Use `private` or `#` on a declared class field, assigned in the constructor body, not a parameter property.
- **Use object params for ambiguous signatures.** Two or more parameters of the same type, or any boolean parameter, get wrapped in a single options object so call sites are self-documenting.
- **No chained `??` for multi-step selection.** Assign each fallback candidate to a named `const` and return it with an early `if (x) return x;` guard.
- **No conditional object spread for optional fields.** Never build a literal with `...(cond ? { key: value } : {})`. Set the field inline (`key: cond ? value : undefined`) or assign it after the literal so the object's full shape stays readable. Because `exactOptionalPropertyTypes` is on, a property you assign `undefined` to must be declared to accept it: `note?: string | undefined`, not `note?: string`. Declare it that way whenever the inline form is used; if you hit `TS2375`, that is this rule talking, and the fix is the property's type, never a conditional spread.
- **Use `clsx`** for merging class names. Never concatenate class strings manually.
- **No inline functions in JSX** (e.g. `onChange={(e) => ...}`). Define handlers in the component body or `.hooks.ts`. Don't reach for `useCallback` unless passing the function to a child that needs a stable identity.
- **Code must not acknowledge the review/task process.** Comments, identifiers, strings, and tests describe _what_ the code does and _why_, in product terms, never a reviewer, a task/issue tracker id, or "the former X we migrated from". A requirement is documented as the code's own rationale.

### Writing Style

Applies to everything written here: comments, docs, READMEs, identifiers, and user-facing copy.

- **Write in natural language**, the way a person would explain it out loud.
- **No em dashes anywhere.** Not in comments, not in docs, not in identifiers or strings. Use a comma, a colon, parentheses, or a second sentence instead.
- **Keep comments concise.** Say what the code does and why it exists, then stop. One line is usually enough. (The comment rules under **Code Style** above are the detail.)
- **Keep documentation concise.** Lead with the rule, skip the preamble, and do not restate what the reader just read.
- **No filler, hedging, or throat-clearing.** If a sentence adds no information, delete it.

### Testing

- **Test framework**: Vitest. Tests live next to the file they cover, using the `.test.ts` suffix (`fitting.ts` → `fitting.test.ts`).
- **All utility functions, helpers, parsers, and pure hooks must have thorough unit tests.** Every exported function in a package's `src/**/*.ts`, and in `.data.ts` / `.hooks.ts` files, should be covered.
- Use `describe` blocks grouped by function/class with clear `it` descriptions. Mock external dependencies (storage, `fetch`, timers) with `vi.spyOn` / `vi.mock` and restore in `afterEach`.
- **Edge cases are mandatory**: zero/empty inputs, malformed input, missing data, error paths, boundary conditions, not just the happy path.
- **Sample data shared by more than one test file goes in `<module>.fixtures.ts`** beside those tests, never in a `.test.ts` that another test imports. Keep fixtures out of the package barrel: they are test input, not public API.
- Packages run in Vitest's default Node environment. `@ttrpg-cards/ui` runs in `jsdom`, configured in `packages/ui/vitest.config.ts`.

## Code Quality (Required)

- **Before finishing any task**, run the full quality gate and resolve every issue:

  ```bash
  pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
  ```

- Fix any errors before submitting for review. Unformatted, unlinted, untyped, or failing code will be rejected in review.
- Lint runs with `--max-warnings 0`, so any ESLint warning fails the gate. Resolve or `--fix` it.

## Tooling

- **Turborepo orchestrates workspace tasks.** `pnpm lint`, `pnpm typecheck`, and `pnpm test` route through `turbo run`; single-package and long-running/mutating tasks (`dev`, `build`, `format`) stay on plain pnpm. Only those three tasks are defined in `turbo.json`; a task with no matching root script does not belong there.
- **Every file that defines a rule belongs in `globalDependencies`.** `eslint.config.mjs`, `tsconfig.base.json`, and the rest listed in `turbo.json` are in the global hash, so relaxing a boundary invalidates every cached task result. Without that, the gate replays a stale pass at the exact moment it matters most. Add new root-level config there when you introduce it.
- **Always install the latest stable version** of a new package, and record it in the `catalog` in `pnpm-workspace.yaml` rather than in the consuming manifest.
- **CI runs the same gate as `Pre-submit Checks`, on every pull request and every push to `main`** (`.github/workflows/ci.yml`), plus `build-storybook`. There is one definition of the gate: when you add a command here, add it there, and keep the order the same so a CI failure maps onto a command you can run locally.
- **Pin a GitHub Action to a full commit SHA**, with the version in a trailing comment (`uses: owner/action@<40-char-sha> # v1.2.3`). A tag, even an exact one, can be re-pointed by whoever owns the action, and CI runs third-party code over a checkout of this repo. A new action is a new dependency: the latest-stable rule applies, and so does the supply-chain caution behind `minimumReleaseAge`.
- **A new version waits out `minimumReleaseAge` before it is installed**, so a compromised publish has time to be caught and pulled. Bypassing it means adding an exact `name@version` to `minimumReleaseAgeExclude` with a reason, not lowering the floor.
- Two deliberate toolchain splits exist because upstream support lags. Revisit each when the upstream packages catch up:
  - **TypeScript**: packages compile and typecheck with the current major (`catalog: typescript`). The lint toolchain resolves an older major (`catalog:lint`) because typescript-eslint refuses to load against the newer compiler API.
  - **ESLint**: the config is composed only from plugins that support the installed ESLint major. React and accessibility plugins are not yet compatible, so `react/*` and `jsx-a11y/*` rules are **not currently enforced** even though the conventions above still apply, so review for them by hand. **Pinning ESLint back to regain those rules is settled and rejected.** The import and transmission boundaries are what this config exists for and they need the current major; losing some rules is the accepted price. Restore the plugins when upstream ships support, and do not re-open the trade.

## Convention Management

When you establish or receive a new project convention (coding style, performance rule, architectural decision, etc.), add it to this `AGENTS.md` under the appropriate section (or to the most specific nested `AGENTS.md`/`CLAUDE.md` whose scope covers it) so it is enforced in future sessions.

## Commands

```bash
pnpm dev              # Start the dev server (apps/web)
pnpm build            # Production build, emits apps/web/out as static files
pnpm lint             # Run ESLint across the workspace (--max-warnings 0)
pnpm format           # Run Prettier with --write
pnpm format:check     # Check formatting without fixing
pnpm typecheck        # Run tsc --noEmit across the workspace
pnpm test             # Run all unit tests (Vitest)
pnpm test:watch       # Run the UI package's tests in watch mode
pnpm storybook        # Start the UI Storybook
pnpm build-storybook  # Build the static Storybook
```

There is no `pnpm start`: the build output is a static directory, so it is served by any static host rather than by a Node process.

## Pre-submit Checks (Required)

Before marking any task complete, run all five locally and resolve every issue:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
