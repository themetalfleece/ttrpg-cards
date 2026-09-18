# `@ttrpg-cards/importer`

Parses content the user supplies (JSON and Markdown) into the card model.

## Two rules that are not style preferences

- **This package never retrieves anything.** It reads what it is handed and nothing else. No
  fetch, no remote lookup, not even behind a button the user clicks. Code that retrieves content
  from a third-party source is the problem the whole project is shaped to avoid.
- **Parsers stay forgiving.** A parser must accept a range of reasonable input shapes rather than
  tracking one tool's exact output. This is a hard requirement rather than polish: a parser that
  accepts only one product's export _is_ that product's importer, however the button is labelled.

Both are load-bearing. If a change makes either less true, it does not ship.

## Boundaries

- Validates every input through `@ttrpg-cards/validator`, since imported files and pasted text are
  untrusted boundaries.
- Reached through a `features/*` slice. `apps/web` may not import it directly.
