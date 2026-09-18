# `@ttrpg-cards/srd`

The bundled openly-licensed catalog: the extracted entries, their provenance record, and the
verbatim attribution statements the licence requires.

## This package is dual-licensed: read before touching it

The **code** here is MIT, like the rest of the repository. The **data** is not ours and is not
MIT. It is redistributed under CC BY 4.0, whose full text is in [`LICENSE`](./LICENSE) beside
this file. The package manifest records both as `MIT AND CC-BY-4.0`.

[`NOTICE.md`](../../NOTICE.md) at the repository root is the authoritative statement of which
licence covers what, and it lists the five attribution obligations that must travel with the
data. Read it before writing anything that ships alongside the catalog. In particular:

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

## Boundaries

- Reached through a `features/*` slice. `apps/web` may not import it directly.
- Never retrieves anything at runtime. Extraction happens ahead of time; the shipped package is
  data.
