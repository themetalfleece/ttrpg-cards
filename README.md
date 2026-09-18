# TTRPG Cards

Lay out and print tabletop reference cards, entirely in your browser.

- Ships a bundled, openly-licensed catalog you can print straight away.
- Import your own content from JSON or Markdown.
- Real physical dimensions in millimetres, so what you print matches what you see.
- No accounts, no server, no network: the app is a static site and your content never leaves your device.

## Getting started

### 1. Node.js

The required version is pinned in [`.nvmrc`](./.nvmrc). Install [Node.js](https://nodejs.org)
directly, or (better, since the pinned version will move) use a version manager and let it read
that file:

- **macOS / Linux / WSL:** [nvm](https://github.com/nvm-sh/nvm), then `nvm install` in this
  directory (with no argument, it reads `.nvmrc`).
- **Windows:** [nvm-windows](https://github.com/coreybutler/nvm-windows). It does not read
  `.nvmrc`, so pass the version: `nvm install <version>` then `nvm use <version>`.
- [fnm](https://github.com/Schniz/fnm) and [Volta](https://volta.sh) work too; fnm reads `.nvmrc`
  as well.

### 2. pnpm

The package manager and its exact version are pinned in the `packageManager` field of
[`package.json`](./package.json). [Corepack](https://nodejs.org/api/corepack.html) ships with
Node and will read that field, so you get the right pnpm without choosing a version:

```bash
corepack enable
```

That is the whole setup. The first `pnpm` command in this directory downloads the pinned version
and uses it. If your Node build does not include Corepack, install it (`npm install -g corepack`)
or install pnpm directly by any method on the
[pnpm installation page](https://pnpm.io/installation); if you do, match the pinned version so
you are not resolving dependencies differently from everyone else.

### 3. Run it

```bash
pnpm install
pnpm dev
```

`pnpm build` produces a static site in `apps/web/out/`, deployable to any static host. There is
no `pnpm start`: the output is a directory of files, served by any static host rather than by a
Node process.

## Layout

```
apps/web/     Next.js App Router app (thin wrapper: routes, layouts, static-export config)
features/     feature slices, testable without the framework
packages/     @ttrpg-cards/* workspace packages
```

Each package under `packages/` has its own `README.md` describing what it owns and the boundaries
it keeps.

## Dependency versions: what `catalog:` means

Manifests in this repo declare third-party dependencies like this:

```json
"dependencies": {
  "react": "catalog:"
}
```

`catalog:` is a [pnpm catalog](https://pnpm.io/catalogs) reference. Instead of repeating a version
range in every manifest that needs the package, the version is declared once, in the `catalog`
block of [`pnpm-workspace.yaml`](./pnpm-workspace.yaml), and each manifest points at it. At
install time pnpm substitutes the real version.

The point is that a version is pinned in exactly one place, so nine packages cannot drift onto
four different versions of React. To change a version, edit `pnpm-workspace.yaml` and run
`pnpm install`; never write a literal version into a package manifest.

There is one **named** catalog, `catalog:lint`, holding a second TypeScript major that only the
lint toolchain resolves. [`AGENTS.md`](./AGENTS.md) explains why that split exists.

## Contributing

Read [`AGENTS.md`](./AGENTS.md) first. It is the single source of truth for the stack, the architectural boundaries, the content rules, and the quality gate every change must pass:

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Contributions are accepted under the MIT License.

## Licence

The software is MIT. See [`LICENSE`](./LICENSE).

The bundled catalog is **not** MIT. It is reference content redistributed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and carries its own attribution, which
ships verbatim alongside the data. [`NOTICE.md`](./NOTICE.md) sets out exactly which licence
covers what, and applies to anything you import as well.
