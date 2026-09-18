# TTRPG Cards

A browser app for laying out and printing tabletop reference cards. Fully static: `next build` emits `out/` and there is no server. Monorepo built with pnpm workspaces + Turborepo, Next.js (App Router) and TypeScript.

**All project conventions live in [`AGENTS.md`](./AGENTS.md).** Read it before writing any code. It is the single source of truth for the stack, monorepo layout, content rules, architecture boundaries, code style, testing, and the required quality-gate commands.

## Writing style

Write in natural language and use no em dashes, anywhere. Keep comments and documentation concise. The full rule is in [`AGENTS.md`](./AGENTS.md#writing-style).

## Quality gate

Before finishing any task, run the full gate and resolve every issue:

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Convention Management

When you establish or receive a new project convention, record it in `AGENTS.md` (or the most specific nested `AGENTS.md`/`CLAUDE.md` whose scope covers it) so it is enforced in future sessions.
