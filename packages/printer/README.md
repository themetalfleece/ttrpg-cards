# `@ttrpg-cards/printer`

Sheet layout, pagination, and PDF generation.

Works in **millimetres throughout**, never pixels, so the printed result matches what is on
screen. Card dimensions are read from the layout configuration in `@ttrpg-cards/card`, and this
package never hardcodes one.

## The sheet

`SheetLayout` is the paper cards are laid out on: which paper, which way round it goes, how many
sides of it the job prints on, and the edge a duplex printer turns it about. Immutable, like the
card layout it sits beside, so a different paper is a new sheet derived with `with` rather than a
mutation.

```ts
const sheet = SheetLayout.default().with({ size: "letter" });

sheet.contentWidthMillimetres; // what the grid has to fill
sheet.capacityFor({ layout }); // how many cards of that size come off it
sheet.paginate({ items, layout, faceCounts }); // the pages they go on
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

`paginate` is what turns one into the other: hand it the entries, the card layout and how many
cards each has been measured to be, and it hands back the pages they fill. An entry nothing has
measured yet counts as the one card it is at least, and a guess never lowers a count, so a
consumer settles rather than flickering between two answers.

That belongs here rather than in whatever is rendering, because "how many of these fit on me" is
the sheet's question. A consumer only has to hold the counts and hand them over.

**A page is not a sheet.** `paginate` hands back a `SheetPage` per printed page: the piece of
paper it is on, the side of it, and a slot index for every run of cards. Printed on one side that
is one page per sheet with the slots filling from zero.

**A sheet is only left short when the cards run out.** An entry whose cards will not all fit in
what is left puts as many as do there and carries the rest to the next sheet. The alternative
keeps an entry's cards adjacent and pays a hole in the sheet for it, which is paper spent on an
adjacency the scissors take away: the cards are cut apart before anybody reads them.

## Printing on both sides

`sides: "double"` prints an entry's continuation on the back of its own slot, so one cut gives a
card carrying the whole entry rather than two to keep together. That changes the packing:

- **Odd numbered cards take a front, even numbered ones the back of the slot before them.** A two
  card entry is one slot; a three card entry is two, with the second back blank.
- **A back slot is the mirror of its front.** A sheet turns about the axis its flip edge runs
  along, so a long edge flip reverses the columns on portrait paper and the rows on landscape.
  `mirrorAxis` reads that off the paper rather than assuming it, and `mirrorSlot` is its own
  inverse.
- **Pages come in front and back pairs, always.** A blank back is emitted like any other page,
  because one a driver skips moves every back after it onto the wrong front: that spoils the run
  rather than one card. Whatever renders these has to draw it, and whatever offers the setting has
  to tell the reader to turn off their driver's skip-blank-pages option.
- **Entries needing more than one card are laid out first.** That gathers every blank back at the
  tail of the run, so a driver still set to skip blank pages drops only trailing pages and the run
  still comes out correct. It saves no paper: the page count is the sum of the slots whatever
  order they go in. The order on the page changes; the order the caller handed the entries over in
  does not.

Which edge the printer flips on cannot be found out or set from a browser, and drivers disagree
about what they call the two, so it is a reader's choice here and the consumer says the chosen one
back to them as the setting to match.

## Proving it on paper

`scripts/` holds the print verification, run from the repository root with `pnpm verify:print`. It
builds the static export, serves it over loopback, drives the page in headless Chromium and
measures what was drawn in millimetres. Vitest runs in Node and in jsdom, neither of which has a
layout engine, so the step from a slot index to a position on paper is checked here and nowhere
else.

It lives in this package because what it checks is this package's arithmetic, and it takes the
export directory as an argument so that nothing here needs to know where an app puts its build.

**Its expectations are restated on purpose, and must stay that way.** `scripts/print.types.ts`
declares its own `MirrorAxis` and `scripts/print.constants.ts` writes out which axis each flip
edge reverses, rather than importing either from `src/`. A harness that asks the code under test
what to expect agrees with it however wrong both are. Two similar-looking declarations in one
package is an invitation to deduplicate them: do not, or the check quietly stops checking.

## Boundaries

- Pure computation over the card model. No DOM assumptions beyond what generating the output
  needs, and no framework. That covers `src/`, which is what ships; `scripts/` is hand-run tooling
  outside the import graph, which is why it may drive a browser.
- Reached through a `features/*` slice. `apps/web` may not import it directly.
