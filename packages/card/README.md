# `@ttrpg-cards/card`

The card domain model, its schemas, and the layout and theme configuration.

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

## The layout configuration

`CardLayout` is the geometry a card is laid out at: its size, the margins kept inside each edge,
and the range the fitting routine may scale body text within. Every length is millimetres, so
screen and print agree; nothing in a layout is ever a pixel.

**A layout is handed to a consumer, never imported as a number.** `CardLayout.default()` is the
standard card size and is where everything starts; the renderer, the fitting routine and the
print pipeline read `widthMillimetres`, `contentWidthMillimetres` and the rest off the layout they
are given. That is what makes the dimensions live: a different size chosen at runtime reaches all
three without any of them changing.

**It is immutable, deliberately.** Several consumers lay out against the same layout at once, and
one of them mutating it would change the geometry under the others with nothing to tell them it
had happened. Changing a size means deriving the next layout and handing that one out:

```ts
const resized = layout.with({ size: { widthMillimetres: 70 } });
```

Anything left out of the overrides keeps the value it had, so a size changes without restating
margins that have nothing to do with it.

**A layout is a size and a text size, picked separately.** `CARD_LAYOUT_PRESETS` in
`layout.constants.ts` is the one place a card measurement is written down: the dimensions a card
is cut to and the margins that keep content off the trimmed edge. `CARD_TEXT_SIZE_PRESETS` is the
band the fitting routine may set type within. `CardLayout.fromPreset({ preset, textSize,
overrides })` combines one of each, and either may be left out for its default.

They are two records because they answer two questions. How large a card is cut is a property of
the card, and a reader who wants a smaller stack picks a smaller box. How large its type is set
is a property of the reader, and someone who cannot read 9 point across a table wants it larger
whatever the card. Neither answer tells you the other, and a preset holding both would make
every combination a new entry.

Adding either is an entry in its record and the name a picker calls it by, and nothing else. The
name lives beside the record rather than inside the preset, because the layout schema rejects a
field it does not know and a label sitting in one would make it fail its own validation.
`CARD_SIZES` and `CARD_TEXT_SIZES` are each the two together, ordered, which is what a picker
offers.

**The smallest type is the one the reader picked, everywhere on the card.** `small` floors at
2.38mm, which is 9 CSS pixels, and that is the default: it is the setting that fits the most on a
card and splits the fewest entries. Every region of a card is a ratio of the body size, and a
ratio cannot hold a floor because it moves with what it multiplies, so the renderer clamps every
region that sets type smaller than the body to this minimum. Raising the setting raises the
smallest text anywhere on the card, not only in its body. What a larger card buys is not a
different floor but more room before an entry has to run onto a second card.

**Every instance is a usable geometry.** The constructor holds its input to the schema and to the
relations between fields that a schema cannot state, then copies it, so a consumer reading the
geometry never has to check it again. `CardLayout.from` is the entry point for untrusted input,
such as a stored preference read back, and `CardLayout.validate` reports each failure with its
path for a settings form to show. Rejected: a dimension that is zero, negative or not finite, a
negative margin, margins that leave no content area, and a font size range that runs backwards.

## The card set

`CardSet` is one entry laid out across as many cards as its content needs. Most entries are a set
of one: a card gives up type size first, and a second card is the answer only when the bottom of
the fitting range was not enough. **Nothing is ever cut to fit.**

**The first card is the whole card. Every card after it is a continuation**, carrying the name,
the position indicator and the rest of the body. It repeats neither the stat block, which would
spend the room the split exists to reclaim, nor the badge, subtitle or footer, which would spend
it on a second copy of what the first card already says. The source travels with the content,
because the content is what carries its terms.

**Every card of a split set shows where it sits** (`1/2`, `2/2`). A set of one shows nothing:
there is nothing to count it against. That is `positionAt(index)`, which is `undefined` for a set
of one, and `faces`, which pairs each card with its position ready for a renderer.

**The set is the unit**, addressed by `id`, the id of the card it was made from. Continuations are
`<id>~2`, `<id>~3` and so on, so every card stays addressable and the print pipeline can keep the
set together.

### Where a split falls

`CardSet.split({ card, fits })` knows how a card may be divided and nothing about how tall
anything is. The caller answers one question about one candidate card, measured as it will be
rendered, and that is what makes a card cut to another size move the split with no code change.
`fits` has to be monotonic: content that fits implies less of the same content fits.

- **Block boundaries first**, which includes between the items of a list. Each card takes as much
  as it will hold before the next one starts, so a set is as short as the content allows.
- **A sentence end** when one block is too tall for a card of its own and there is no block
  boundary left to use.
- **A word end** only when no sentence end is early enough.
- **Never a word.** A block with no usable boundary left goes on whole and overflows, which is at
  least visible.
- **Nothing is dropped.** The whitespace at a cut stays with the opening half, so the halves laid
  end to end are the text that came in, character for character.
- **No block is left alone on the last card** while the block before it can be pulled forward and
  still fit. Block count stands in for the orphan line the rule is about: nothing here measures
  lines.

The search halves the range rather than stepping through it, because every answer costs the caller
a measurement. `MAXIMUM_CARDS_PER_SET` is the ceiling: a predicate that answers "no" to everything
stops there with the rest of the text on the last card, rather than dividing an entry down to
single words.

## The themes

`CARD_THEMES` names the colour themes a card can be drawn in, and `isCardThemeId` is the guard a
stored preference is read back through, since a theme that was dropped leaves a stale id behind
in a browser that saved it.

**Names only. No colour value is ever written here.** What a theme looks like is a block of
custom properties in `@ttrpg-cards/ui`, beside the card face that reads them, and the renderer
is the only thing that knows what "parchment" is made of.

This sits next to `CARD_LAYOUT_PRESETS` for the same reason the sizes do: a theme and a size are
both card configuration the user picks and `@ttrpg-cards/storage` persists, and storage validates
what it read back against this package rather than taking a dependency on the renderer.

## Boundaries

- Imported by `features/*` and by other packages. Never imports a feature slice or `apps/web`.
- Schemas are defined with `@ttrpg-cards/validator`, never by importing the validation library
  directly.
