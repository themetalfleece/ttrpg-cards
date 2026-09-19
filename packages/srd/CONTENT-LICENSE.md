# Bundled catalog: provenance and attribution

The record of where the bundled data came from, what it is licensed under, and what has to be
shown to a reader. [`NOTICE.md`](../../NOTICE.md) at the repository root says which licence
covers what; this file is the detail for the data in this package.

## Provenance

Both catalogs were extracted from the licensor's own published documents, downloaded from the
URLs below and pinned by checksum. No third-party mirror, converted dataset, or scrape was used.

| Catalog     | Document            | Published at                                                            | SHA-256                                                            | Entries |
| ----------- | ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ------- |
| `srd-5.2.1` | `SRD_CC_v5.2.1.pdf` | https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` | 339     |
| `srd-5.1`   | `SRD_CC_v5.1.pdf`   | https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf   | `2504d2a0abb0a4d491a939be4f17910a2dde0312570ab8d208080225ccf0a1f0` | 319     |

## Reproducing the extraction

The documents are not redistributed here. Download each one yourself from the URL above, put it
in `.sources/` under the file name in the table, then:

```bash
pnpm --filter @ttrpg-cards/srd extract
```

The script checks every byte against the pinned hash before reading it and writes
`src/catalog/data/<catalog>.json`. A clean run reports the entry counts in the table.

**If a hash no longer matches, stop.** The document has been re-issued, or the file is not the
one we pinned. Have the new bytes reviewed and the diff understood before anything is republished.
Never update a pinned hash to make the script pass.

## Attribution: required, verbatim

Both statements are reproduced exactly as the licensor publishes them, character for character,
including the curly quotation marks. They are exported from `src/attribution/` and pinned by
`attribution.test.ts`. Never paraphrase one, never reflow one, and never let a formatter or a
codemod rewrite one.

### SRD 5.2.1

> This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards
> of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under
> the Creative Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.

### SRD 5.1

> This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards
> of the Coast LLC and available at
> https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the
> Creative Commons Attribution 4.0 International License available at
> https://creativecommons.org/licenses/by/4.0/legalcode.

The statements are quoted here for the record, and the blockquote markers are this document's
formatting rather than part of the text. The strings in `attribution.constants.ts` are the ones
that ship, and they are what the test pins.

## Modification notice

Required by §3(a)(1)(B), and shipped alongside the statements:

> The text of each entry was extracted from the published documents and restructured as card data.

## Attribution is a ceiling too

Both documents ask that no other credit to the licensor appear. Nothing beyond the statements
above may name them or imply their endorsement, anywhere in this repository or in the app. That
is our own policy as much as theirs, so do not cite CC BY 4.0 as its source.
