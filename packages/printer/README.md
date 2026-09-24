# `@ttrpg-cards/printer`

Sheet layout, pagination, and PDF generation.

Works in **millimetres throughout**, never pixels, so the printed result matches what is on
screen. Card dimensions are read from the layout configuration in `@ttrpg-cards/card`, and this
package never hardcodes one.

## The sheet

`SheetLayout` is the paper cards are laid out on: which paper, which way round it goes, how many
sides of it the job prints on, the edge a duplex printer turns it about, and whether it carries
cut guides. Immutable, like the card layout it sits beside, so a different paper is a new sheet
derived with `with` rather than a mutation.

That immutability is why a consumer holds the sheet itself rather than the settings it is built
from: `with` is already the shape of a change and already normalises what it is handed, so a
reader's controls read what they show off the sheet and hand one override back.

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
a name does not compile. `pnpm verify:print` greps the workspace for those measurements and
fails if one appears anywhere but the record, the test that pins it, and the harness that
restates it.

## The paper a reader measures

`custom` is a paper like any other to everything downstream, and nothing like the others here.
A reader gives it a width and a height in millimetres, which is the only measurement on a sheet
that did not come out of a record.

```ts
const sheet = SheetLayout.default().with({
  size: CUSTOM_PAGE_SIZE,
  custom: { widthMillimetres: 148, heightMillimetres: 210 },
});
```

`SheetLayout` resolves the named paper to measurements once, in its constructor, and every getter
below reads that. **No layout code learns that a sheet can be custom**, which is the whole point:
the grid, the mirror and the pagination are the same arithmetic on a paper nobody published.

Two consequences follow from a reader typing it:

- **It is held to `CUSTOM_PAGE_SIDE_RANGE` and brought onto its step**, so a paper of nine metres
  or of `NaN` never reaches a layout or a `@page` rule. This is the one thing on a sheet that is
  validated, and it is why the old claim that a sheet needs no validation no longer holds.
- **Its margin is `PRINTER_SAFE_MARGIN_MILLIMETRES`.** A published paper carries the margin its
  own grid arithmetic came to; a paper nobody worked a grid out for has no such number behind it,
  so it gets the printer's unprintable edge. A laser's is typically 4.2mm, a sixth of an inch, and
  five clears that. Whatever the grid then leaves over is centred by the insets, so five is a
  floor rather than the answer.

The measurements are carried whichever paper is picked, the way the flip edge is carried whichever
way the job prints: picking A4 and coming back should not lose what a reader typed.

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

**One thing on a sheet is validated, and it is the only thing that can be wrong.** Every choice
is a name from a closed set except the custom paper's measurements, so that is what the
constructor checks and the rest needs nothing. What a card layout has to check at runtime, the
named papers check once in `SheetLayout.test.ts`, which holds every combination the records allow
to a content area a card can sit on.

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

## Cut guides and the printed page box

A sheet is made to be cut apart, so every card carries eight marks in the blank around it, two
running out from each corner. They reach out by exactly `CARD_GAP_MILLIMETRES`, so two
neighbours' marks meet and the cut line runs unbroken across the gutter; at the edge of the grid
the same reach goes into the margin, which every paper keeps wider than the gap.

Marks in the blank rather than an outline on the card. A drawn outline is on the card once it is
cut out and any part of it the blade misses shows, where a mark in the offcut is thrown away
whether or not the cut was exact.

**Whether a sheet carries them is `cutGuides`, and it reaches a stylesheet as a measurement.**
`cutGuideReachMillimetres` is the gap when they are on and zero when they are off:

```ts
SheetLayout.default().cutGuideReachMillimetres; // 0
SheetLayout.default().with({ cutGuides: "on" })
  .cutGuideReachMillimetres; // 2
```

A mark of no length paints nothing, so whatever draws a sheet lays the guides out at whatever
reach it is handed and never asks whether they are on. That is one set of rules rather than two,
and it is the same shape as the row inset, which is zero on a sheet printed one side.

**Off by default.** Guides are ink, and ink is the reader's to ask for: a sheet going to a
trimmer wants them, and one going anywhere else comes out marked by something nobody asked for.
Turned on they cost no paper, since they sit in the blank that goes in the bin with the offcut.

**That is why `@page` gets no margin of its own.** Nothing in the page box can be drawn in a
`@page` margin, and the outermost guides reach into exactly that blank, so the rule sets the
paper and the sheet keeps its own margin as padding. It also makes the printed geometry the
preview's rather than nearly the preview's.

## Proving it on paper

`scripts/` holds the print verification, run from the repository root with `pnpm verify:print`. It
builds the static export, serves it over loopback, drives the page in headless Chromium and
measures what was drawn in millimetres. Vitest runs in Node and in jsdom, neither of which has a
layout engine, so the step from a number of millimetres to a place on paper is checked here and
nowhere else.

Three phases, because there are three kinds of claim:

- **Every paper, printed on one side.** That a card comes out 63 by 88mm within half a
  millimetre, that a sheet holds the cards it has room for, that the run comes to the pages it
  should, that every card carries guides reaching outward, and that the file printed on the paper
  that was asked for. Driven on A4, on Letter, and on a paper typed in by hand, which is what
  says no part of the layout assumes a sheet.
- **The cut guides turned off.** That nothing is painted around a card. They come off by their
  reach going to nothing rather than by a rule being dropped, so the pseudo-elements are still
  there with their gradients in them and only a layout engine can say the marks cover no pixels.
  Its own run rather than a check inside the paper phase, because it needs the control driven and
  the page settled again, and running that per paper would buy three answers to one question.
- **Both flip edges, printed on both sides.** The mirror, the pairing, and the blank back.

Plus one claim about the source rather than the output: that a paper measurement is written down
in one place. There is no type that can stop somebody typing 210 into a stylesheet, so it is a
grep over the workspace, ignoring comments because a doc comment saying what a call returns is
documentation rather than a second copy.

Every run leaves a picture of each page and a grayscale render of the first under
`.print-verification`. The grayscale one is there because most of these sheets come off a printer
with one toner cartridge: the contrast tests prove that from the numbers, and this is the same
claim as something somebody can look at.

It lives in this package because what it checks is this package's arithmetic, and it takes the
export directory and the workspace root as arguments so that nothing here needs to know where an
app puts its build or where the repository sits.

**Its expectations are restated on purpose, and must stay that way.** `scripts/print.types.ts`
declares its own `MirrorAxis`, and `scripts/print.constants.ts` writes out which axis each flip
edge reverses, what each paper measures, what a card is cut to, and how many of them a sheet
holds, rather than importing any of it from `src/`. A harness that asks the code under test what
to expect agrees with it however wrong both are. Two similar-looking declarations in one package
is an invitation to deduplicate them: do not, or the check quietly stops checking. This is also
why `print.constants.ts` is one of the three files allowed to write a paper measurement down.

## Boundaries

- Pure computation over the card model. No DOM assumptions beyond what generating the output
  needs, and no framework. That covers `src/`, which is what ships; `scripts/` is hand-run tooling
  outside the import graph, which is why it may drive a browser.
- Reached through a `features/*` slice. `apps/web` may not import it directly.
