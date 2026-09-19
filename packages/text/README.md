# `@ttrpg-cards/text`

Rich text: the runs every card field is written in.

Text the reader sees is an ordered list of runs rather than a string. A run is `{ text, marks? }`,
and the marks are `strong` and `emphasis`. Unmarked text is one run.

```ts
import { RichText } from "@ttrpg-cards/text";

RichText.of("Plain prose."); // [{ text: "Plain prose." }]
```

Nothing here knows about cards. It is a package rather than a folder inside the card model
because the importer, the renderer, the printer and the fitting routine all need it, and none of
them should reach through the card package to get it.

## Why runs and not markdown

A string holding `**bold**` makes every reader of the model a parser. The renderer, the fitting
routine, and anything that measures or searches the text would each have to strip the syntax, and
whichever one forgot would be quietly wrong. Splitting prose across a continuation card is the
case that hurts most: slicing a list of runs keeps the marks, while slicing a markdown string
means re-parsing and re-serialising both halves without cutting inside a `**...**` pair.

Markdown is an **import format**. `@ttrpg-cards/importer` parses it into runs on the way in, and
nothing downstream ever sees markup. Marks carry meaning rather than appearance, so what `strong`
looks like stays the theme's decision.

## `RichText`

The one place that builds, normalises and flattens runs. Everything goes through it rather than
walking the list its own way.

- **`RichText.of(text)`** builds the common case, a single unmarked run. It refuses an empty
  string rather than building something the schema rejects: a field with nothing to say is left
  off, so the caller that might hold nothing is the one that decides.
- **`RichText.canonical(text)`** produces the one spelling of a span: neighbours carrying the same
  marks merged, marks in a fixed order. The schema cannot express "adjacent runs differ", so a
  split or reordered list validates rather than failing, and normalising it is this package's job.
  Without it the same text has unboundedly many valid spellings and nothing can tell two identical
  cards apart.
- **`RichText.plain(text)`** flattens runs back to characters, for measuring and searching.

## Boundaries

- Imported by `packages/*` and `features/*`. Never imports a feature slice, the app, or the card
  model.
- Schemas are defined with `@ttrpg-cards/validator`, never by importing the validation library
  directly.
- `PlainTextSchema` lives here too. It is the non-empty-string rule that a run's text, and any
  field that stays a plain string, are both held to.
