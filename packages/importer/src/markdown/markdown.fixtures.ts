import { CARD_BLOCK_KINDS, type Card } from "@ttrpg-cards/card";
import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";

/**
 * The card every document below parses to, whichever way it is spelled.
 *
 * Original material, like every fixture here. The parser has to work on what
 * people already have, and what they have is not ours to commit.
 */
export const WARD_CARD: Card = {
  id: "imported:lantern-ward",
  name: RichText.of("Lantern Ward"),
  badge: RichText.of("3"),
  subtitle: RichText.of("A ward against the dark"),
  meta: [
    {
      label: RichText.of("Casting Time"),
      value: RichText.of("1 reaction"),
    },
    { label: RichText.of("Range"), value: RichText.of("Self") },
    {
      label: RichText.of("Components"),
      value: RichText.of("V, S, M"),
    },
    {
      label: RichText.of("Duration"),
      value: RichText.of("1 minute"),
    },
  ],
  body: [
    {
      kind: CARD_BLOCK_KINDS.paragraph,
      text: RichText.joined(
        RichText.of("A ward of steady light closes over you, and "),
        RichText.marked(RichText.of("nothing"), TEXT_MARKS.emphasis),
        RichText.of(" unlit may cross it."),
      ),
    },
    {
      kind: CARD_BLOCK_KINDS.list,
      items: [
        RichText.of("A creature that enters the ward is slowed."),
        RichText.of("A light you carry cannot be snuffed."),
      ],
    },
    {
      kind: CARD_BLOCK_KINDS.callout,
      label: RichText.of("At Higher Levels"),
      text: RichText.of(
        "The ward covers one more creature for each slot level above 3.",
      ),
    },
  ],
  footer: [RichText.of("Abjuration"), RichText.of("Warden")],
};

/**
 * The same card written the several ways people write it.
 *
 * One entry per variation the parser promises to accept, so a change that
 * quietly narrows it to one editor's output fails here rather than in a
 * reader's browser. Each is named for the way it differs from the others.
 */
export const WARD_DIALECTS: Readonly<Record<string, string>> = {
  "a third level heading and a quoted aside": `### Lantern Ward [3]

*A ward against the dark*

**Casting Time:** 1 reaction
**Range:** Self
**Components:** V, S, M
**Duration:** 1 minute

A ward of steady light closes over you, and *nothing* unlit may cross it.

- A creature that enters the ward is slowed.
- A light you carry cannot be snuffed.

> **At Higher Levels.** The ward covers one more creature for each slot level above 3.

*Abjuration · Warden*
`,

  "a fourth level heading, underscores and bulleted fields": `#### Lantern Ward [3]

_A ward against the dark_

- __Casting Time:__ 1 reaction
- __Range:__ Self
- __Components:__ V, S, M
- __Duration:__ 1 minute

A ward of steady light closes over you, and _nothing_ unlit may cross it.

* A creature that enters the ward is slowed.
* A light you carry cannot be snuffed.

**At Higher Levels.** The ward covers one more creature for each slot level above 3.

_Abjuration · Warden_
`,

  "a first level heading, the colon outside the markers and a rule": `# Lantern Ward [3]

*A ward against the dark*

**Casting Time**: 1 reaction
**Range**: Self
**Components**: V, S, M
**Duration**: 1 minute

A ward of steady light closes over you, and *nothing* unlit may cross it.

+ A creature that enters the ward is slowed.
+ A light you carry cannot be snuffed.

***At Higher Levels:*** The ward covers one more creature for each slot level above 3.

*Abjuration | Warden*

---
`,

  "front matter, unlabelled fields and a numbered list": `---
tags: homebrew, wards
---

## Lantern Ward [3]

*A ward against the dark*

Casting Time: 1 reaction
Range: Self
Components: V, S, M
Duration: 1 minute

A ward of steady light closes over you, and *nothing* unlit may cross it.

1. A creature that enters the ward is slowed.
2. A light you carry cannot be snuffed.

> ***At Higher Levels.*** The ward covers one more creature for each slot level above 3.

___

*Abjuration · Warden*
`,

  "hard line breaks, a layout directive and rules instead of blank lines": `## Lantern Ward [3]
*A ward against the dark*
***
**Casting Time:** 1 reaction\\
**Range:** Self\\
**Components:** V, S, M\\
**Duration:** 1 minute
***
A ward of steady light closes over you, and *nothing* unlit may cross it.
***
- A creature that enters the ward is slowed.
- A light you carry cannot be snuffed.
\\column
> **At Higher Levels.** The ward covers one more creature for each slot level above 3.
***
*Abjuration · Warden*
`,
};
