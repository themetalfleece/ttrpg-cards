# `@ttrpg-cards/core`

The card domain model, its schemas, and the layout configuration.

Owns the shape of a card and the dimensions it is laid out at. **The default card dimensions are
declared here and nowhere else.** They initialise a live, runtime-changeable property that the
renderer, the text-fitting routine and the print pipeline all read from. If you find yourself
typing a card measurement into a component or a stylesheet, read it from the layout configuration
instead.

Nothing here knows about rendering, persistence, printing, or the framework.

## Boundaries

- Imported by `features/*` and by other packages. Never imports a feature slice or `apps/web`.
- Schemas are defined with `@ttrpg-cards/validator`, never by importing the validation library
  directly.
