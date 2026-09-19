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

The theme lives in [`src/theme.css`](./src/theme.css) and declares every colour, spacing,
typography, shape and elevation custom property, in both light and dark. **Never hardcode a
colour, a spacing or a type value.** Add a variable there instead. `apps/web/app/globals.css`
imports this file and adds only document-level resets.

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
