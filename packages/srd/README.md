# `@ttrpg-cards/srd`

The bundled openly-licensed catalog: the extracted entries, their provenance record, and the
verbatim attribution statements the licence requires.

## This package is dual-licensed: read before touching it

The **code** here is MIT, like the rest of the repository. The **data** is not ours and is not
MIT. It is redistributed under CC BY 4.0, whose full text is in [`LICENSE`](./LICENSE) beside
this file. The package manifest records both as `MIT AND CC-BY-4.0`.

[`NOTICE.md`](../../NOTICE.md) at the repository root is the authoritative statement of which
licence covers what, and it lists the five attribution obligations that must travel with the
data. [`CONTENT-LICENSE.md`](./CONTENT-LICENSE.md) beside this file is the provenance record:
the pinned checksums, how to reproduce the extraction, and both statements quoted in full. Read
them before writing anything that ships alongside the catalog. In particular:

- The attribution statement is reproduced **verbatim**. It is the one place in a tracked file
  where an outside product may be named, because the licence compels that exact text.
- A link to the licensor's published source must reach the reader. The checksum-pinned
  provenance record below is an internal audit trail and does **not** discharge that obligation.
- The fact that we modified the material (extracting published documents into structured data)
  must be declared.

## Provenance

Every entry records where it came from: the licensor's own published source, pinned by checksum.
No third-party mirror, converted dataset, or scrape is used, so the chain of custody is
verifiable rather than asserted.

**The documents themselves are not in this repository, and no tracked source file downloads
them.** The extraction reads them out of a gitignored `.sources/` directory, and it refuses any
bytes whose SHA-256 does not match the pin.

```bash
pnpm --filter @ttrpg-cards/srd extract
```

Fill `.sources/` by hand from the URLs in `CONTENT-LICENSE.md`, then run that. `scripts/` holds
the pipeline and never runs at build time; what ships is `src/catalog/data/*.json`, which it
wrote. Those files are in `.prettierignore`, because a formatter re-wrapping them would put the
repository out of step with what the script produces.

**The extracted data is committed, and CI proves it still matches the script.** The `Catalog
drift` job fetches both documents from the licensor, re-runs the extraction, and fails if the
output differs from what is committed. That keeps the script the single source of truth without
making the build depend on a third-party URL: the job is separate from the quality gate, so a
clone still typechecks, tests and builds with no network at all.

It tells the two failure modes apart on purpose. Real drift, or a document whose bytes no longer
match their pin, fails the job: both mean someone has to look. An unreachable CDN does not; the
job reports a warning saying the catalog was not checked and stops there, because a network
outage is not evidence about the change under test.

The fetch lives in the workflow step, not in this package. No TypeScript file here reaches the
network, so the transmission ban needs no exemption and the lint rules that enforce it stay
whole.

## The mapping

`Catalog` is the mapping layer, and the only code we ship that knows what a casting time is. An
extracted entry keeps the source document's vocabulary; `Catalog.cardFrom` turns it into a card
whose stat block is an ordered list of labels and values, so nothing downstream is named for a
game concept. The extraction in `scripts/` speaks that vocabulary too, but it runs ahead of time
and never reaches a browser.

- The level becomes the corner badge, and the school and the classes become the footer.
- The four header fields become the stat block, in a fixed order. A concentration flag goes back
  in front of the duration, which is how the source prints it.
- A casting time that names a trigger opens the body with it; the stat block keeps the short form.
- The upgrade section and the material component become callouts, which is what the card model
  calls an aside.

**Extracted files write emphasis as markup, and `runsFromMarkup` is where that stops.** The model
stores emphasis as structure, so a `**strong**` or `_emphasis_` span is parsed into runs at the
boundary and nothing downstream sees a marker. That parser lives in
[`@ttrpg-cards/importer`](../importer), because reading markup into runs is the same job whoever
wrote the markup, and one implementation is what keeps a bundled entry and a document a reader
brought reading the same text the same way. The extraction's own validator still rejects an
unbalanced or stray marker before a file is written: the parser is forgiving and would leave a
stray one as literal characters, so that check is what keeps a mistake in the pipeline visible.

**The catalog is also what the Markdown parser is held to.** `roundTrip.test.ts` writes every
bundled card out as Markdown, reads it back, and expects the card it started with. A few hundred
entries of prose, lists, asides and tables is a harder test of a forgiving parser than any
fixture written to suit it.

**A printed table becomes a caption and a list, one item per row.** The card model has no table,
and that is right for a surface this small: a grid sized for a page column does not survive being
set at card width. A two column table reads as "key: value"; a wider one writes each cell out
under its own heading.

## Boundaries

- Reached through a `features/*` slice. `apps/web` may not import it directly.
- Never retrieves anything at runtime. Extraction happens ahead of time; the shipped package is
  data.
