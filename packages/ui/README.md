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

Only the neutral theme follows the colour scheme, and only on a screen: the dark override is
scoped to `@media screen`, so a card printed from a dark page is the card a light page would have
printed. A chosen theme does not follow the scheme at all, because parchment is parchment at
midnight.

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
- **The tinted region stays a tint.** A fill heavy enough to carry a boundary by itself drinks
  ink and grays out badly, so the rule around it does that job instead.
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

`CardSetView` is the component to reach for when the content might not fit. It takes the same
card and layout, and renders the set that card makes: one card most of the time, and a card plus
its continuations when the content will not fit at the bottom of the fitting range. Nothing is
ever cut, and no word is ever broken across cards.

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

A split set is set at the bottom of the range throughout. The split happened because the floor
was not enough, so the first card is at the floor by definition, and letting a shorter
continuation grow would set one entry in two sizes.

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
