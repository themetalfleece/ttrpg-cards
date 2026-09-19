# `@ttrpg-cards/core`

Generic building blocks that do not belong to another package.

Empty on purpose. The card model moved to [`@ttrpg-cards/card`](../card) and rich text to
[`@ttrpg-cards/text`](../text), because both have an owner and a name that says what they are.
This package is for the genuinely cross-cutting thing that turns up later and fits nowhere else.

## Before you put something here

"Core" is the name most likely to accrete unrelated code, because nobody can argue that something
does not belong in it. So the bar is: **name the concept first**. If you can name it, it wants its
own package or a home in the one that owns the concept. If two packages need the same helper and
neither owns it, that is what this package is for.

## Boundaries

- Imported by `packages/*` and `features/*`. Never imports a feature slice or `apps/web`.
- Nothing here knows about cards. Card-shaped code goes in `@ttrpg-cards/card`.
- Schemas are defined with `@ttrpg-cards/validator`, never by importing the validation library
  directly.
