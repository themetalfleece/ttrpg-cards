# `@ttrpg-cards/feature-catalog`

Cards laid out on a page, with live card and page controls. The bundled catalog until the reader
brings a document of their own, and theirs after that.

This is what `apps/web` renders. The route file resolves nothing and decides nothing: it
renders `CatalogView` and stops, so everything here is testable without the framework.

```tsx
import { CatalogView } from "@ttrpg-cards/feature-catalog";
```

## A page, not a list

`CardPage` is a sheet of paper at the size a sheet is, and the cards fill it in reading order.
That is the point of the surface: what is on screen is what comes out of the printer, at the
millimetres the cards will be cut to.

The sheet's geometry is `SheetLayout` from [`@ttrpg-cards/printer`](../../packages/printer),
which is where a paper measurement is written down. Nothing here restates one.

Each entry goes through `useCardSet` rather than straight to `CardFace`, so one whose text will
not fit at the bottom of the fitting range runs onto a continuation card instead of being cut
short.

## Filling the sheet in cards, not entries

A sheet holds a number of **cards**, and an entry is not always one card. An entry that needs a
continuation takes two slots, and how many it needs is only known once the browser has measured
it, which is after the sheet has already been filled.

So the sheet fills optimistically and settles:

- `CardPageEntry` measures its entry, draws the cards of it this sheet was given, and reports
  what the whole entry cost back up.
- `usePageFill` holds those counts, and nothing else. What they mean for a sheet is
  `SheetLayout.paginate` in [`@ttrpg-cards/printer`](../../packages/printer), because "how many
  of these fit on me" is the sheet's question rather than this slice's.

That settles rather than oscillates, for two reasons kept in different places. A count only ever
grows while it is a guess, which `usePageFill` holds: an entry remounted on another sheet reports
the one card it is before it has measured, and taking that back would send it home to start
again. And a count that comes from a measurement is believed whatever it says, because a second
measurement in the real face is worked out from the top rather than from the first.

A count also survives a change of face or card size, as the starting guess for the next one.
Every entry on the page measures itself again when either changes and says what it really came
to, so a count from the last face stands in for a moment and is then replaced. Thrown away
instead, the page lays every entry out as one card and then moves each one that grew to the
sheet after it, and every one of those moves is a remount and another round of measuring.

An entry reports what **it** costs, not what this sheet drew of it. Reporting the window would
feed the pagination its own output, and the counts would never settle.

`CardPageEntry` exists so the measurement happens **once** per entry, wherever its cards fall. An
entry that straddles a sheet is mounted twice and measures twice, which is the one place a card
is paid for more than it is drawn.

Every card the reader has is on a sheet, across as many sheets as they need, and a sheet is only
left before it is full when the cards run out. The sheets arrive a few at a time so the first one
is worth looking at while the rest are still measuring, and a print waits for the whole run.

## Live, and not persisted

Every control drives state a package already models, and offers whatever that package's registry
lists, so a theme, a card size or a paper added there appears here with nothing to change:

| Control     | Comes from                                      |
| ----------- | ----------------------------------------------- |
| Color       | `CARD_THEMES`                                   |
| Card size   | `CARD_SIZES` over `CARD_LAYOUT_PRESETS`         |
| Text size   | `CARD_TEXT_SIZES` over `CARD_TEXT_SIZE_PRESETS` |
| Paper       | `PAGE_SIZES` over `PAGE_SIZE_PRESETS`           |
| Orientation | `PAGE_ORIENTATIONS`                             |
| Screen size | `SCREEN_SCALE_RANGE`, see below                 |

**Card size and text size are two controls, and one layout.** How large a card is cut and how
large its type is set are separate picks, and `CardLayout.fromPreset` takes one of each. They
share the memo that holds the layout, because either one changing is a re-measure of every entry
on the sheet: type size is exactly what decides whether an entry fits on one card.

**There is no margin control.** The margin comes with the paper, because it is whatever the grid
does not need and the two papers have different amounts spare. That arithmetic is written down
in the print package.

Every one of those registries lists a `NamedOption` from
[`@ttrpg-cards/core`](../../packages/core), and `choicesFrom` is the one place that shape
becomes a control's `{ value, label }` choices.

A sheet with room for nothing says so rather than rendering blank. It is a dead end otherwise:
nothing renders, so nothing measures, so the count never changes until the reader picks
differently, and a blank sheet does not tell them that is what to do.

## Making a card on screen its real size

**A CSS millimetre is not a millimetre.** The specification fixes an inch at 96 pixels, so a
63mm card always paints 238 CSS pixels wide. On a 109 ppi display that is 55mm, noticeably
smaller than the card in your hand; on a 92 ppi one it is 66mm, slightly larger. The error is
the ratio between the display's real density and 96, and **nothing in the browser reports that
density**. `devicePixelRatio` is device pixels per CSS pixel, which is a different thing and
does not help.

So the app asks. `ScreenCalibration` is a slider, and the reader drags it until a card they are
holding matches a card on the sheet. The ratio that comes out is `--screen-scale`, which the
whole preview is drawn at, so a match on any one card is a match on all of them.

**The cards are the reference, rather than an outline beside the slider.** An outline at the size
of a bank card was the obvious way to do this and it was the wrong one: it is a second thing to
look at that says no more than the cards already on the page, and it has to be drawn life sized,
so on a calibrated display it grew past any column the controls wanted to be.

The slider carries an aside rather than a paragraph under it. It says the two things a reader
needs and would not guess: that this changes the preview and never the print, and that the way
to use it is to hold a card against the glass. Both are help rather than the label, so they are
there when asked for and out of the way otherwise.

Three things about how it is applied:

- **`transform`, not `zoom`.** A zoom changes the lengths the sheet is laid out in, so the
  browser lays every card on it out again for each step of the control: about a fifth of a second
  of locked page per step on a set worth printing, for an arrangement that cannot have changed. A
  transform draws what is already laid out, which costs a composite. It reserves no room on its
  own, which is what the sheet's `margin-right` and `margin-bottom` are for: the sheet below and
  the credit under it land where the drawing ends rather than where the box does.
- **`@media screen` only.** On paper the millimetres are already physical. Scaling there would
  be the one thing that makes the print wrong.
- **Nothing else changes.** The layout arithmetic, what fits on a sheet and the `@page` rule all
  stay in true millimetres. The correction is how the sheet is drawn, never what it is.

`contentFitsInside` in [`@ttrpg-cards/ui`](../../packages/ui) had to learn about this: a scale
above a card scales its rectangles but not its computed lengths, so the fitting would have read
an unscaled padding off a scaled edge and handed the card room it does not have. It divides the
two out now, and a calibrated screen sets text at exactly the size an uncalibrated one does.

**It is not remembered.** The ticket does not persist anything, so the scale resets on reload
like every other pick here. When `@ttrpg-cards/storage` lands it should persist this alongside
the theme and the card size, and the control says so rather than leaving a reader to discover
it.

`useCatalogSelection` holds the picks and builds **one `CardLayout` per card size and one
`SheetLayout` per page choice**. A card measures itself against the layout it is handed, so a
fresh identity on every render would re-measure every card on the page each time anything else
changed. Keeping the two apart matters for the same reason: changing the paper changes how many
cards come off the sheet, but not what any one of them says, so nothing re-measures.

Nothing is stored. What a reader picked is theirs to pick again.

## Cards the reader brings

`ImportPanel` is where a reader pastes a document or opens one off their disk.
[`@ttrpg-cards/importer`](../../packages/importer) reads it, and what comes out goes onto the
**same sheet**, through the same renderer, at whatever the reader has the controls set to. A card
they wrote is a card, and there is nothing about one to draw differently. There is no second
renderer here and there is not going to be.

**The document is read where it was handed over.** It is not uploaded, nothing about it is sent
anywhere, and the panel offers no way for that to change. Reading a chosen file happens in the
browser through `File.text`, which is the whole of it.

**Each document adds to the cards already on the page.** A reader builds a set up a few at a time,
so a second paste joins the first rather than replacing it, and the identifiers already spoken for
go into the parser with it: two documents are entitled to name a card the same thing and the page
has to tell them apart. The field empties once its contents have been taken, because left where it
was the next press of the button would add the same cards again. **Clear and show the bundled
cards** takes the whole set off.

A file that cannot be read says so: a reader whose disk or permissions refused them has no other
way to tell that apart from a document that held no cards. The count of what the last document
added is kept alongside the total, because a reader who already has cards on the page needs to be
told when the one they just added brought none.

**What did not read as a card is listed with the line it starts at.** A reader who pasted forty
cards and got thirty-nine has no other way to find the one that went missing.

The parsing happens in `useCatalogSelection` rather than in the panel, so the panel stays a
surface and the cards it produced live with everything else the page is drawn from. The card list
keeps one identity per set for the same reason the layout keeps one per size: a fresh array
re-measures every card on the sheet. The cards themselves keep theirs across an addition, so only
the new ones are measured.

Nothing is stored. The set is in memory for as long as the tab is open.

## Attribution

`AttributionNotice` carries all of what CC BY 4.0 asks for the bundled content: the statement
reproduced **verbatim**, a reachable link to the licensor's published source, the licence named
and linked, and our declaration that the material was modified. A notice missing one of them is
not compliant, so none of it is decoration that can be trimmed to fit. It is on screen from the
first render, which is where the app shares the material and so where the obligation lands. See
**Printing** below for why it does not follow a sheet onto paper.

It is a ceiling as well as a floor: nothing here credits the licensor beyond the statement or
suggests they endorse this.

**It comes off the page when the bundled cards do.** The obligation attaches to the material
being shared, and a page showing only cards the reader wrote is sharing none of it. The ceiling
says the same thing from the other side: a credit standing under somebody's own homebrew reads as
the licensor having had a hand in it, which is exactly what may not be implied. It comes back the
moment the bundled cards do.

## Printing

The Print button hands the page to the browser, and what comes out is the sheet that was on
screen.

**`@page` is what holds those two together.** It is the only way to tell the browser which paper
to print on and how much margin to leave; without it the browser picks both, the sheet re-wraps
against whatever run of paper is left, and a three-across grid prints as two. `pageRule` builds
it from the same `SheetLayout` the preview is drawn from, so the two cannot disagree. It has to
be text rather than a custom property, because `@page` descriptors do not resolve `var()`, and
every number in it comes from a closed preset record rather than from anything a reader typed.

**A printed sheet is cards and nothing else.** The controls, the page's own title and the credit
all come off. The sheet drops the outline and the shadow that made it look like paper on a
screen, and the page box `@page` sets takes over from the margin the preview was padded with. It
paints itself `--color-paper` rather than going transparent, because what shows through
otherwise is the app's own background and the sheet comes out tinted. A set gets
`break-inside: avoid`, so a card is never cut across a printed page.

`print-color-adjust: exact` is what makes any of that colour survive. A browser drops background
colours when printing unless the reader finds the background graphics option, which is off by
default, so without it the theme they picked prints as white paper with black text.

**The grid is inset, not centred.** A wrapping flex container centres each line on its own, so a
short last row stops lining up with the columns above it, which is the one thing a sheet about
to be cut must not do. The sheet insets the whole grid by half the blank its columns leave, and
every row starts on the same column. The inset sits on the left only, and the right keeps the
plain margin: the grid still comes out centred, and the row keeps that inset as slack, which it
needs because a row asked to be exactly as wide as its cards drops its last column on a
sub-pixel rounding.

Taking the credit off is a deliberate call, not an oversight. The licence obligation attaches to
where the material is shared, which is the app, and the notice is in full there. What a reader
prints is their own copy. If printed sheets ever need to stand on their own, the answer is a
short per-sheet credit alongside the cut guides, not the full block under the grid.

Cut guides, bleed, a gutter the reader sets, and the headless-browser check that the PDF really
is the right size are the print pipeline's, not this slice's.

## Layout

`CatalogView` is the only thing this package exports. Everything else is an inner component of
it and stays that way: `CardPage`, `CardControls`, `PageControls`, `ImportPanel` and
`AttributionNotice` have no barrel, so none of them is a resolvable import from outside.
