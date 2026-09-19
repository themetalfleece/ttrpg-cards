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

A card too long even at the bottom of the range stays overflowing. Splitting it across a second
card is a different routine's decision, and nothing here ever cuts a word.

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
