# `@ttrpg-cards/printer`

Sheet layout, pagination, and PDF generation.

Works in **millimetres throughout**, never pixels, so the printed result matches what is on
screen. Card dimensions are read from the layout configuration in `@ttrpg-cards/card`, and this
package never hardcodes one.

Keeps a card and its continuations on the same sheet run: when text overflows onto a continuation
card, the pair must not be split across sheets.

## Boundaries

- Pure computation over the card model. No DOM assumptions beyond what generating the output
  needs, and no framework.
- Reached through a `features/*` slice. `apps/web` may not import it directly.
