# `@ttrpg-cards/ui`

Presentation primitives, the card renderer, and the theme.

Wraps Radix so the rest of the workspace composes a stable interface instead of a third-party
one. **`radix-ui` is imported here and nowhere else**; switching the implementation later means
satisfying the same interface, with no change to feature or app code.

## Layout

Every primitive lives in its own directory and is imported from its named subpath:

```ts
import { CardFace } from "@ttrpg-cards/ui/CardFace";
```

That is also how a primitive reaches another primitive, including from an inner component
directory where a relative path would have to climb two levels.

The barrel re-exports all of them, so `@ttrpg-cards/ui` is the package's public surface and
nothing outside ever reaches into `src/`. Prefer the subpath at a call site anyway: it keeps
the import tree-shakeable and says which primitive is being used. A new primitive is added to
the barrel at the same time as its directory.

The document theme lives in [`src/theme.css`](./src/theme.css) and declares the colour, spacing,
typography, shape and elevation properties more than one part of the app shares, in both light
and dark. **Never hardcode a colour, a spacing or a type value.** Add a custom property instead,
**at the narrowest scope that covers everything reading it**: a property one component reads
belongs in that component's directory, not here. `apps/web/app/globals.css` imports this file and
adds only document-level resets.

What a card is drawn in is the worked example. Its colours and its type scale are read only by
the card face, so they live beside it and are bundled with the renderer rather than the document.

## The card face

Top to bottom: a band holding the title, the stat block as a strip of equal cells under it, the
body, and a footer rule with the first entry at the left and the last at the right.

The band reserves the same width at each end whether or not anything sits there, so the title is
centred on the band rather than on the room the markers left, and a card of a set measures the
same as one standing alone.

**What the reader reads is fitted, and the chrome is not.** `--card-font-size` is what the body
settled at once it was measured; `--card-font-size-chrome` is the text size the reader picked and
does not move. The band, the labels, the footer and the spaces between regions read the second,
which is what lets two cards of one entry carry different amounts of text and still read as a
pair. Two pieces of chrome move, and both only for their own width: a long name steps down until
it fits the band and takes a second line only once it has run out of room to shrink into, and the
strip's labels step down together until the longest word in each sits on one line in its cell.

## Card colour themes

A card is drawn in one of the themes listed in `CARD_THEMES`, chosen per card:

```tsx
<CardFace card={card} layout={layout} theme="parchment" />
```

The names live in [`@ttrpg-cards/card`](../card), beside the card size presets, because both are
card configuration a user picks and `@ttrpg-cards/storage` persists. What each one looks like
lives here, in [`CardFace.themes.css`](./src/CardFace/CardFace.themes.css): one block of custom
properties matched on `data-card-theme`, and nothing else. No colour value ever enters the card
package, and the face never learns a theme's name.

So **adding a theme is a block of values in `CardFace.themes.css` and an entry in
`CARD_THEMES`**, with no component to touch. It picks up the stories and every check below on its
own. Leave `theme` off and the card takes the theme of the surface it stands on, so a sheet can
be themed in one place and a card can still choose for itself.

**No theme follows the desktop's colour scheme, neutral included.** A card is paper: it sits on a
white sheet whatever the screen is set to, and it is printed on white. A palette that went dark at
night would be a dark rectangle on a white sheet, and it would print as an empty outline or a page
of solid ink. The app's own surface may go dark; what is going to be cut out may not.

## Card typefaces

A card is set in one of the pairings listed in `CARD_TYPEFACES`, on the same terms as a theme:

```tsx
<CardFace card={card} layout={layout} typeface="poster" />
```

The names live in [`@ttrpg-cards/card`](../card). The faces live in
[`src/fonts`](./src/fonts), vendored beside their OFL licences and declared once in
[`fonts.css`](./src/fonts/fonts.css); a vendored family belongs to the package rather than to the
card face, which is only its first consumer. Every URL is relative, so nothing is fetched from a
font service at build time or at run time, and
[`fonts.test.ts`](./src/fonts/fonts.test.ts) is what holds that true. A browser fetches a face
only once a rule asks for it, so the pairings nobody picked cost disk and no bandwidth.

[`CardFace.typefaces.css`](./src/CardFace/CardFace.typefaces.css) holds the pairings themselves,
which name families and never declare one. Nothing in the cascade complains when a pairing asks
for a family nobody vendored, so
[`CardFace.typefaces.test.ts`](./src/CardFace/CardFace.typefaces.test.ts) checks the two files
against each other.

A pairing carries two corrections as well as its faces, because a face does not draw where the
nominal size says it will. `--card-name-centre` moves the title so it is centred on its capitals
rather than on its line box, and `--card-figure-scale` sets the rank so it is drawn the same
height whichever face it is in: Almendra's figures come out a quarter shorter than Fredoka's at
the same size. Both are measured in a browser rather than worked out, and both belong to the
file, so a face revendored at another weight is re-measured and the rest are left alone.

**A pairing is not a theme, in one way that matters.** It changes how wide the text runs, so it
changes where an entry splits: `useCardSet` takes it and hands it to the off-page card every
measurement is made in. Set it on a surface above the cards and the renders would be right while
every split was measured in the fallback face.

The property labels are the single place the card does not use the display face. A cell is a
quarter of a card and a label can be one word of ten letters; a display face at that size does not
fit that word into that width, and what gives is the word breaking in half.

They do not fit in the workhorse at the general floor either, which is why the strip fits its own
labels: `StatBlock.hooks.ts` measures the longest word in each cell and steps every label on the
strip down together until it sits on one line. Every label takes the same step, because a row of
labels at four sizes reads as a mistake. The floor they stop at is `--card-scale-label-floor` of
the card's legibility floor, because a word in bold capitals holds at a size prose does not, and
below it they wrap and hyphenate as before.

Themes are cut for paper, and
[`CardFace.themes.test.ts`](./src/CardFace/CardFace.themes.test.ts) holds every one of them to it
by reading the stylesheets rather than a copy of their values. It measures each theme on a light
screen, on a dark screen and on paper, working out which blocks reach each from the media
conditions themselves:

- **WCAG AA on every colour a card sets text on.** Contrast comes from relative luminance and
  ignores hue, so a pair that passes reads in grayscale too. That is one measurement, not two.
- **Every boundary between regions separated by luminance**, to WCAG's 3:1 for non-text, met
  either across the two fills or along the rule drawn between them. This is the check that
  matters on a mono laser printer: a theme separating its stat block from its body by hue alone
  prints as one flat gray rectangle.
- **The card carries one fill, and it is the position pill.** Nothing sits behind the properties
  or the body, so every boundary on the card is a rule and the check above is measuring the rule
  rather than a step between two tints. A fill heavy enough to carry a boundary by itself drinks
  ink and grays out badly on the printer most of these come off.
- **On paper, the card's fills clear a luminance floor.** Contrast is symmetric and scores a
  black card with white text exactly as well as the white card we meant, so it cannot tell a
  printable card from an unprintable one. The floor can.

## Dragging a value

`Slider` is the control for a quantity with no meaningful steps to name, which is the other half
of what `ChoiceGroup` covers. Controlled, like every other picker here, and it takes an optional
`readout` so a consumer can say where the value is in whatever units mean something to it.

It also takes an optional `hint`, which puts a `Tooltip` on a small mark beside the label.
Beside the label and not on the track, because the track is dragged and a bubble opening under a
pointer mid drag is in the way of the one thing the control is for.

## Saying more when asked

`Tooltip` is an aside about the thing it is attached to, shown on hover and on keyboard focus.
It renders its child as the trigger rather than wrapping it, so it adds nothing to a layout;
that child has to be a single element that takes a ref, which rules out the primitives here
because none of them forwards one.

**What goes in one is help, never the only place something is said.** A tooltip answers a
pointer and a focus ring and nothing else, so a reader on a touch screen may never open it. A
control that cannot be used without reading its tooltip wants a better label instead.

The provider sits inside the component rather than around the app. Radix wants one ancestor so
that a second tooltip opened straight after a first skips the delay, and a lone aside in a row of
controls has nothing to coordinate with. If several ever stand together, the provider moves up
and this takes the one above it, which is what Radix does when it finds one.

## Lining controls up

A segmented track, a slider and a button are made of different parts and, left alone, land within
a pixel or two of each other: close enough to read as crooked rather than as varied. `theme.css`
declares `--control-height`, and all three honour it, so a row of controls lines up whatever is
in it. A control added later joins the row by honouring the same property.

## Pressing something

`Button` is a plain button and nothing more: it takes what it says and what pressing it does.
It reports `onPress`, the action, rather than a pointer event, so a consumer never has to know
what kind of event reached it. It is always `type="button"`, because nothing here submits a form
and a bare button inside one would.

## Choosing one of a few

`ChoiceGroup` is the control for a short, closed set of options where exactly one is picked: a
colour theme, a card size. It is a segmented control with radio semantics, because a reader
comparing two options should not have to open anything to see them both. A longer set wants a
select instead, and does not have one yet.

It is controlled and narrows on the way out, so a caller holding a union gets its own type
back rather than a bare `string` it has to assert:

```tsx
<ChoiceGroup
  label="Card size"
  options={CARD_SIZES.map((size) => ({
    value: size.id,
    label: size.name,
  }))}
  value={size}
  onValueChange={chooseSize}
/>
```

## The card face

`CardFace` takes a card and a `CardLayout` and nothing else. It never asks what kind of card it
is holding: everything that varies between one kind and another is a meta field, so a spell and a
piece of gear go through the same regions in the same order.

Every length is a custom property set from the layout (`cardFaceStyle` builds them), and the
stylesheet works in ratios of the card's own type size. That is what lets a card render at any
configured size with nothing to change.

Text is set at whatever size the content fits at. The decision is `CardLayout.fittedFontSize`,
which is pure and tested on its own; `CardFace.hooks.ts` answers the one question it asks by
setting a candidate size on the real element and reading back whether the content still sits
inside the card, and re-measures when the card's box changes. The card's own box never moves: a
card is cut to a size and the type gives way.

**The measurement is scale invariant**, because a consumer may draw the card larger or smaller
than it is laid out. A `zoom` or a `transform` above the card scales what
`getBoundingClientRect` reports but leaves the computed lengths alone, so `contentFitsInside`
divides the two back out before comparing them. Without that it would read an unscaled padding
off a scaled edge and hand the card room it does not have, and a reader who had scaled their
preview would get overflowing cards with nothing to tell them why.

`CardFace` renders one card. A card that is one of a set takes a `position` and says where it
sits beside its name; the indicator shares the heading row and is set smaller than the name, so
showing it costs the card no height. A `fontSizeMillimetres` skips the measurement for a caller
that has already decided a size.

## The card set

`useCardSet` is what answers "how many cards is this entry", and `CardSetView` draws the answer
for a caller that wants the set read as a set: a preview, a story, one entry beside its
continuations. It takes the same card and layout, and renders one card most of the time, and a
card plus its continuations when the content will not fit at the bottom of the fitting range.
Nothing is ever cut, and no word is ever broken across cards.

A sheet takes the hook and not the component, because a sheet places cards rather than entries:
an entry's cards fill the room that is left and the rest carry to the next sheet, so there is
nothing there for a set to be drawn as.

Where the split falls is `CardSet.split` in [`@ttrpg-cards/card`](../card), which is pure and
tested on its own. `CardSetView.hooks.ts` answers the one question it asks the honest way:
it renders the candidate as a real card off the side of the page, at the bottom of the layout's
range, and reads back whether the content sits inside it. The renders are synchronous, so the
whole search happens in one pass and the reader never sees a candidate. It runs in a microtask
just after the commit, because React will not render a root of its own in the middle of one.

**One off-page card serves the whole page.** It holds nothing between measurements and no two
searches interleave, since each runs to completion inside its own microtask, so the node and its
root are built on first use and emptied rather than torn down. A sheet of a hundred cards would
otherwise allocate a fiber root and a DOM node each, most of them only to be told the card fits.

**Split first, size second.** The split is settled at the floor, and then every card of the set
fits itself, the first one included. A continuation carrying two sentences is set large rather
than left at the floor in a mostly empty card. The chrome does not move with it, so two cards of
one entry still read as a pair, and nothing in the sizing pass can move content between cards,
because by then each card is a card of its own.

**A caller that already knows the set hands it over**, through the `set` prop, and the view
draws it rather than working one out. That is the same escape hatch `CardFace` keeps for its
font size, and it is there for the same reason: a sheet has to know what an entry costs before
it can know how many entries fit on it, so it calls `useCardSet` itself, and without the prop
every entry on the sheet would be measured twice.

## Working here

- Never render a bare `div`, `p` or `span`. `Box` is the generic container: a `div` by default,
  `as="p"` or `as="span"` for the other two. Elements that carry meaning stay themselves.
- Add a new primitive to `src/<PrimitiveName>/`, never to `apps/web`. A primitive is anything
  feature-agnostic; if two features would share a building block, it belongs here with a story
  and tests.
- Run `pnpm storybook` when adding or changing a primitive so the variant is visually
  verifiable, and add a `.stories.tsx` alongside it.
- Layout knobs go on the primitive's props, not on consumer CSS.
- Tests run in `jsdom`, configured in [`vitest.config.ts`](./vitest.config.ts). The rest of the
  workspace runs in Vitest's default Node environment.
