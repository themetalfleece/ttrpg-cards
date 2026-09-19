# `@ttrpg-cards/card`

The card domain model, its schemas, and the layout configuration.

Owns the shape of a card and the dimensions it is laid out at. **The default card dimensions are
declared here and nowhere else.** They initialise a live, runtime-changeable property that the
renderer, the text-fitting routine and the print pipeline all read from. If you find yourself
typing a card measurement into a component or a stylesheet, read it from the layout configuration
instead.

Nothing here knows about rendering, persistence, printing, or the framework.

## The card model

One shape represents every kind of reference card. **No field is named for a game concept.**
Everything that varies from one kind of card to another lives in `meta`, an ordered list of
`{ label, value }` pairs rendered as the stat block. A spell's card lists a casting time, a range
and a duration; a piece of gear lists a type, a rarity and a weight; the renderer is handed the
same list either way and never branches on what the card describes. Adding a kind of card means
writing different labels, not changing this package.

- `id` and `name` identify the card; `subtitle` is the line under the name.
- `badge` is the glyph in the corner of the title bar. It has no length of its own: what fits is
  the fitting routine's call against live dimensions, not a number typed into a schema.
- `meta` is the ordered stat block. It may be empty.
- `body` is the ordered content: `paragraph`, `list`, and `callout` blocks, the last being the
  aside a card sets apart from its main text. How it is set apart, a tinted block or a bold label
  run ahead of the text, is the renderer's decision. It may be empty.
- `footer` is the ordered list of short entries along the bottom rule.
- `tags` and `source` are optional. `source` records where content came from and the terms it
  carries, under the key `license`, the spelling every manifest and licence identifier uses even
  though our prose writes "licence".

**Text the reader sees is rich text; identifiers, keys and attribution are plain strings.** That
is the whole rule, and it is what decides where a new field goes. `name`, `badge`, `subtitle`,
both halves of every `meta` entry, a callout's `label`, every `footer` entry and all body prose
are `TextRuns`, so any of them can carry emphasis and every consumer handles one shape. `id` and
`tags` are keys that never render. `source` is plain because the attribution has to be reproduced
exactly as the licensor wrote it, and text that must not be altered does not belong in a structure
built to merge and normalise runs.

`TextRuns` and `RichText` come from [`@ttrpg-cards/text`](../text), a package of their own rather
than a folder in here, because the importer, the renderer, the printer and the fitting routine all
need them and none of them should depend on the card model to get them. `CardModel.from` applies
`RichText.canonical` to every span on a card, so two imports of the same content give the same
card no matter how a parser split its runs.

**No field names a position on the card.** `meta` and `footer` are ordered lists and the theme
decides how to set them out, the same way one card stacks its stat block in four cells and another
runs it inline in two. A card cannot pin a footer entry to one end; if that turns out to matter,
it is a theme option, not a field.

**Emphasis is structured, and markdown is an import format rather than a storage format.** A run
carries marks; nothing carries markup. The reasoning lives with the type, in
[`@ttrpg-cards/text`](../text).

**A card is classified twice, for two different readers.** `footer` prints on the card, `tags` are
for finding it in the library and never render, so `faceText` leaves them out. There is no
separate `category`: a card whose primary type matters is a card with one tag.

**The face lays out the name, the badge, the subtitle, the stat block, the body and the footer.**

Two rules the schemas enforce, worth knowing before you build a card:

- **An empty string is never a value.** A field that has nothing to say is left off. `meta` and
  `body` are always present and may be empty; an optional list says "none" by being absent, so an
  empty `tags` or `footer` is rejected rather than giving one state two spellings.
- **An optional field is omitted, never set to `undefined`.** `Static` resolves `Type.Optional` to
  `subtitle?: string` with no `| undefined`, and `exactOptionalPropertyTypes` is on, so the inline
  `key: condition ? value : undefined` form does not typecheck here (TS2375). Assign it after the
  literal instead: `if (subtitle !== undefined) draft.subtitle = subtitle;`. Never reach for the
  conditional spread, which `AGENTS.md` bans, and never relax the compiler flag.

`CardModel` wraps a card with the values derived from it: how many blocks and meta fields it has,
whether it is empty, the body text on its own, and the full face text the fitting routine
measures. Construction from untrusted input goes through
`CardModel.from`, `CardModel.isCard`, and `CardModel.validate` rather than a separate parser.
`from` copies what it validates; the constructor takes the caller's card as given.

`validate` holds a block to the schema its own `kind` names rather than to the whole union, so a
paragraph with empty text reports one failure at `/body/0/text` instead of every way it fails to
be each of the three kinds. That is what an importer needs to tell a user which line of their
file to fix.

**Adding a block kind means touching three places**: the constant, its schema in the per-kind
record, and the union's member list, all in `card.constants.ts` and `card.schemas.ts`. A missing
schema fails to compile and a missing union member fails a test, so the set cannot quietly drift
apart.

## Boundaries

- Imported by `features/*` and by other packages. Never imports a feature slice or `apps/web`.
- Schemas are defined with `@ttrpg-cards/validator`, never by importing the validation library
  directly.
