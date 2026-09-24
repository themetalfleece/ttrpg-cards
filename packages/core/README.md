# `@ttrpg-cards/core`

Generic building blocks that do not belong to another package.

Small on purpose. The card model lives in [`@ttrpg-cards/card`](../card) and rich text in
[`@ttrpg-cards/text`](../text), because both have an owner and a name that says what they are.

## Before you put something here

"Core" is the name most likely to accrete unrelated code, because nobody can argue that something
does not belong in it. So the bar is: **name the concept first**. If you can name it, it wants its
own package or a home in the one that owns the concept. If two packages need the same helper and
neither owns it, that is what this package is for.

## What is here

One module per concept, because the bar above is to name the concept and the module should be
able to say it.

### `millimetres`

The whole app measures in them. `Dimensions` is how wide and how tall something is, which a card
is cut to and a paper is published at, so a sheet comparing the two needs no translation.
`millimetres` turns a number into a CSS length, which three components were each writing out as
the same template literal before it lived here.

### `range`

`NumericRange` is the bounds a number may take and where it starts, and `clampToRange` holds a
value to them. `NumericRange` rather than `Range`, because the DOM already has one and a
consumer importing ours would shadow it.

`snapToRange` is the same thing plus the step, and it is separate because most callers want only
the clamp: a dragged control already moves in steps, and rounding a value that is merely being
held in bounds would move it for no reason. Reach for it where a reader **types** a measurement,
which is the one case where a number arrives at whatever precision they felt like and then goes
into text a browser reads. It answers at the precision the range is written at, read off how the
range's own numbers are spelled rather than computed, because a step of 0.25 needs two places and
its logarithm says one.

**The range wins over the step.** A range whose span is not a whole number of steps has no step
sitting on its own maximum, so rounding to the nearest one would carry a value past it. The
answer comes back on the end instead: what reads this is deciding whether something fits, and a
value it was told is in range had better be.

### `screen`

`SCREEN_SCALE_RANGE`, which exists because **a CSS millimetre is not a millimetre**: an inch is
fixed at 96 pixels, so a length in `mm` is only physical on a 96 ppi display, and nothing in the
browser reports what a display really is. The only way to find out is to have the reader match
something they are holding against a card on screen. The range is what their answer may be.

**It has one consumer today, which is short of this package's own bar, and it is here anyway.**
The reason is the dependency direction: the scale is a reader preference, and when
`@ttrpg-cards/storage` persists it, it will have to validate what it reads back against that
range. `packages/*` may never import `features/*`, so a range living in the slice is one no
package could ever check against. The contract between the control that produces a value and
whatever reads it back cannot live inside the control.

If persistence never arrives, it moves to the slice and nothing else changes.

### `option`

One value a reader picks from a closed set: an `id` the code and a stored preference use, and a
`name` a picker shows.

```ts
const PAGE_SIZE_NAMES = {
  a4: "A4",
  letter: "US Letter",
} as const satisfies Record<PageSizeName, string>;

export const PAGE_SIZES: readonly PageSizeOption[] =
  optionsFrom(PAGE_SIZE_NAMES);
```

It is here rather than in a package because four closed sets already take this shape: card sizes
in `card`, and papers and orientations in `printer`. Neither owns the idea, and a feature
composing both had to invent a third name for it before this existed, which was the tell.

`optionsFrom` turns a record of names into the ordered list a picker offers, so the record stays
the single source of both the set and its order. It also narrows `Object.keys` back to the
record's own key type in one place instead of once per set. That narrowing is sound because each
caller holds its record to exactly its closed set with `satisfies`, so a value added without a
name does not compile.

## Boundaries

- Imported by `packages/*` and `features/*`. Never imports a feature slice or `apps/web`.
- Nothing here knows about cards. Card-shaped code goes in `@ttrpg-cards/card`.
- Schemas are defined with `@ttrpg-cards/validator`, never by importing the validation library
  directly.
