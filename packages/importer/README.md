# `@ttrpg-cards/importer`

Parses content the user supplies (JSON and Markdown) into the card model.

```ts
import { MarkdownDocument } from "@ttrpg-cards/importer";

const document = new MarkdownDocument({ source });

document.cards; // every card the document held, checked against the model
document.issues; // what did not read as a card, each with its line number
```

## Two rules that are not style preferences

- **This package never retrieves anything.** It reads what it is handed and nothing else. No
  fetch, no remote lookup, not even behind a button the user clicks. Code that retrieves content
  from a third-party source is the problem the whole project is shaped to avoid.
- **Parsers stay forgiving.** A parser must accept a range of reasonable input shapes rather than
  tracking one tool's exact output. This is a hard requirement rather than polish: a parser that
  accepts only one product's export _is_ that product's importer, however the button is labelled.

Both are load-bearing. If a change makes either less true, it does not ship.

## What the Markdown parser accepts

The one structural assumption is that **every heading starts a card and everything under it
belongs to that card**. It holds across the documents people actually have, and it is what lets
the heading level be ignored: a writer who gives each card an `h1` and a writer who nests them
three deep under a title mean the same thing.

Everything else has several spellings, and all of them read:

| Part               | Written as                                                                             |
| ------------------ | -------------------------------------------------------------------------------------- |
| The name           | a heading at any level, `#` through `######`, closing hashes or not                    |
| The badge          | a short glyph in square brackets at the end of the heading, `## Ward [3]`              |
| The subtitle       | a single line under the heading, set entirely in italics                               |
| The rank           | that same line when it only states one, `Level 3 Abjuration` or `3rd-level abjuration` |
| A stat block field | `**Label:** value`, `**Label**: value`, `_Label:_ value`, or a bare `Label: value`     |
| A stat block       | those lines together, with a bullet (`-`, `*`, `+`, `1.`) in front of each or none     |
| A list             | any of the same bullet markers                                                         |
| An aside           | a quoted block, or a paragraph opening with a heading an aside is written under        |
| A classification   | a closing line in italics, or a labelled one (`**Wardens:** Sentinel, Lampwright`)     |
| Emphasis           | `*one*`, `_one_`, `**two**`, `__two__`, `***three***`, `___three___`                   |
| Between two cards  | a rule (`---`, `___`, `***`), or nothing at all                                        |

It reads past what a document carries for reasons of its own, too: a note's front matter, a
layout directive, a hard line break, a link or a note link (the text shows, the target does not),
an inline code span, and a picture, which a card has nowhere to put.

**A document that arrived escaped is the document it was before it travelled.** Copying out of
some editors puts a backslash in front of every marker, and `\*\*Casting Time:\*\* Action` is the
same line as the one without them. The escapes come off before anything else is read, because a
document that arrived that way has them in front of its headings and its rules as well as its
emphasis. Only punctuation is unescaped, which is what keeps `\column` and a trailing backslash
whole. The cost is a document that escaped a marker on purpose, which then reads as a marker;
the other way round costs the reader every card in the file.

Two of those are choices rather than conventions read off other documents, so they are worth
naming:

- **The badge is this app's own spelling.** Nothing in Markdown says "this is a glyph for the
  corner of the title bar". It is purely additive, so a heading without it is a card without a
  badge, and it is what lets a card written out and read back in come home whole.
- **An aside is recognised two ways.** A quoted block needs no vocabulary at all: whatever a
  writer quotes, they meant it to stand apart from the prose around it. The list in
  `ASIDE_HEADINGS` is for the far more common document that puts the heading in bold instead. It
  is the reader's vocabulary rather than ours, and nothing downstream ever sees those words. An
  aside run straight under the paragraph above it, with no blank line between, still reads as one.

### A card says what it is in two places, so the parser puts them there

A card carries a glyph in the corner of its title bar and a row of short entries along its bottom
rule. Documents state both in prose, and in two places:

- **The line under the title, when it only states a rank.** `Level 3 Abjuration` and
  `3rd-level abjuration` are the same line written two ways: the number becomes the badge and the
  rest joins the rule. Held to a short line with the number near the front, so a subtitle that is
  saying something keeps saying it: `Takes 2 hands to wield` stays a subtitle, numbers and all.
  A badge spelled out in the heading wins over one read off this line, because it was written to
  be a badge.
- **A labelled line at the end**, `**Wardens:** Sentinel, Lampwright`. The label is dropped,
  because the rule is a row of short entries rather than a second stat block. A classification
  lists things and never says anything, so a value holding sentence punctuation is left in the
  body: a card closing on `**Failed Save:** the target drops.` keeps that as prose.

**A run of labelled lines at the end is a stat block, not a row of classifications.** Dropping
the label off each of `**Damage:** 2d6`, `**Reach:** 5 feet` and `**Weight:** 3 stone` would
leave a rule reading `2d6 · 5 feet · 3 stone` and nothing saying what any of it is. Two or more
of them are read as the stat block the document wrote at the end, which is the same rule the top
of the card is read by, and it has to be: those same three lines above the body are already a
stat block with their labels intact.

Both are shape rules rather than vocabulary. Neither knows what a rank or a category means, only
that a short line naming a number and a thing is a card saying where it sits. Two things the
shapes cost, both named where the code decides them:

- A rank line and the line an item card opens with are the same length with the number in the
  same place, so the comma in `Rare, 500 coins` is what keeps the price out of the badge. Written
  without one it reads as a rank.
- A card closing on a single labelled line goes to the rule even when it was meant as prose, so
  long as it holds no sentence punctuation.

### What it deliberately does not do

- **A bold opening is not an aside** unless it names one. Turning every bold lead-in into an aside
  would set half a card's prose apart from the other half.
- **A stat block sits at the top of a card.** Once a block reads as something else, a colon after
  that is punctuation. Without the rule, a sentence like `**Failed Save:** the light goes out`
  ends up in the stat block.
- **One line holding a colon is prose.** Two in a row is a stat block. A card with a single field
  is rare; a sentence with a colon in it is not.
- **An unmarked field is told from a sentence by both of its halves at once.** With no markers to
  go on, the words are all there is, and hard wrapping is normal in the notes this parser is
  aimed at: `The light dims: nothing happens.` has to stay prose. But either signal alone is
  ordinary in a real stat block. `Casting time: 1 action` has a label that is not a title, and
  `Range: 60 ft.` has a value ending in a full stop, because that is how a unit is abbreviated.
  So a line is only refused when **both** agree: the label is not written as a title _and_ the
  value ends a sentence. A title carries its particles, so `Area of Effect` is one and `It is so`
  is not. The cost is a lead-in that reads as a title in front of a wrapped sentence,
  `Note: the light dims.`, which comes out as a field. It takes two such lines running, ahead of
  any prose, to be read that way at all. The marked spellings are unaffected throughout.
- **Nesting is not resolved.** A strong span wrapping an emphasised one reads as strong
  throughout, because a card sets the two apart by weight and the inner mark has nothing left to
  say.

## What did not read as a card

Reported, with the line it starts at, and never dropped. A reader who pasted forty cards and got
thirty-nine has no other way to find the one that went missing, and a parser that quietly loses
it is worse than one that refuses the lot.

A heading with nothing under it is passed over quietly while more cards follow, because that is a
title or a group rather than a card. The last one is reported: there is nothing after it for it to
have been grouping.

## Where the markup parser lives, and why it lives here

`runsFromMarkup` is the one place in the workspace that turns inline markup into runs, and the
reason nothing downstream has to know a marker exists.

[`@ttrpg-cards/srd`](../srd) uses it as well. Its extracted files write emphasis as markup, and
reading markup into runs is the same job whoever wrote the markup, so a second implementation
would be two parsers to keep in step and one of them would drift. That package's extraction still
validates its own markers before writing a file, because this parser is forgiving and leaves a
stray one as literal characters rather than reporting it.

`packages/srd/src/catalog/roundTrip.test.ts` is where the two meet: every bundled card is written
out as Markdown, read back here, and expected to be the card it started as. A few hundred entries
of real prose, lists, asides and tables is a harder test of a forgiving parser than any fixture
written to suit it.

## Boundaries

- Every card is checked against the model in `@ttrpg-cards/card` before it is handed over, since
  a pasted document is an untrusted boundary like any other.
- Reached through a `features/*` slice. `apps/web` may not import it directly.
- A `MarkdownDocument` is a value: it reads its source once, keeps the answer, and never changes.
- Naming a card is the document's job, not a section's, because uniqueness is a property of the
  set. A caller adding a document to cards it already has passes `reservedIdentifiers` so two
  documents that name a card the same thing both keep theirs.
