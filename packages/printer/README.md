# `@ttrpg-cards/printer`

Sheet layout, pagination, and PDF generation.

Works in **millimetres throughout**, never pixels, so the printed result matches what is on
screen. Card dimensions are read from the layout configuration in `@ttrpg-cards/card`, and this
package never hardcodes one.

Keeps a card and its continuations on the same sheet run: when text overflows onto a continuation
card, the pair must not be split across sheets.

## The sheet

`SheetLayout` is the paper cards are laid out on: which paper and which way round it goes.
Immutable, like the card layout it sits beside, so a different paper is a new sheet derived with
`with` rather than a mutation.

```ts
const sheet = SheetLayout.default().with({ size: "letter" });

sheet.contentWidthMillimetres; // what the grid has to fill
sheet.capacityFor({ layout }); // how many cards of that size come off it
sheet.fill({ items, layout, faceCounts }); // which of them actually go on
```

**This package is the one place a paper measurement is written down**, the way
[`@ttrpg-cards/card`](../card) is for a card. `PAGE_SIZE_PRESETS` holds the papers in portrait,
and `PAGE_SIZES` and `PAGE_ORIENTATIONS` are the ordered lists a picker offers, built with
`optionsFrom` from [`@ttrpg-cards/core`](../core). Adding a paper is an entry in the preset
record and the name it is picked by; `satisfies` ties the two together, so a paper added without
a name does not compile.

## The margin belongs to the paper

**There is no margin setting, and that is deliberate.** A margin here is not a preference, it is
whatever the grid does not need, and the two papers have different amounts spare.

Three standard cards down a sheet is 264mm of card plus two `CARD_GAP_MILLIMETRES` between them.
A4 is 297mm tall and can spare 8mm a side. Letter is 279.4mm, which leaves about 11mm for both
margins together, so 5mm a side is the most it takes while still holding three rows. Raising
Letter's margin to match A4's does not tighten the sheet, it costs a third of it.

So each paper carries its own `marginMillimetres` in `PAGE_SIZE_PRESETS`, and `SheetLayout`
reads it from whichever paper it is on. The gap is the other half of that arithmetic: every
millimetre between cards comes off the margin, because both are competing for what the grid
leaves.

**Nothing validates a sheet, and nothing needs to.** Every field is a name from a closed set, so
a sheet cannot be built out of measurements a caller made up. What a card layout has to check at
runtime, this checks once in `SheetLayout.test.ts`, which holds every combination the records
allow to a content area a card can sit on.

## Packing

`capacityFor` counts in **cards, not entries**. An entry whose text will not fit runs onto a
continuation card and takes a second slot with it, so the two counts are not the same number.

`fill` is what turns one into the other: hand it the entries, the card layout and how many cards
each has been measured to be, and it hands back the ones that fit. An entry nothing has measured
yet counts as the one card it is at least, and a count only ever grows from there, so the run
that fits only ever gets shorter and a consumer settles rather than flickering between two
answers.

That belongs here rather than in whatever is rendering, because "how many of these fit on me" is
the sheet's question. A consumer only has to hold the counts and hand them over.

## Boundaries

- Pure computation over the card model. No DOM assumptions beyond what generating the output
  needs, and no framework.
- Reached through a `features/*` slice. `apps/web` may not import it directly.
