# Notices

This repository contains material under more than one licence. The `LICENSE` file covers the
software; it does **not** cover the bundled catalog data, which carries its own terms.

## The software: MIT

Everything in this repository except the bundled catalog data is licensed under the MIT License.
See [`LICENSE`](./LICENSE). That includes the app, the workspace packages, the build tooling,
the theme, and the documentation.

## The bundled catalog: Creative Commons Attribution 4.0 International

`@ttrpg-cards/srd` ships reference content that is **not ours** and is **not MIT-licensed**. It is
redistributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which permits
redistribution and commercial use provided that, alongside the material, we:

- reproduce the licensor's attribution statement **verbatim**;
- retain, where the licensor supplied them, the copyright notice, the notice referring to this
  licence, and the warranty disclaimer;
- include a URI or hyperlink to the licensed material itself, meaning the licensor's published
  source rather than our copy of it. Recording provenance internally does not discharge this:
  the link has to reach the reader, alongside the attribution;
- state that the material is licensed under CC BY 4.0 and include the licence text or a link to
  it; and
- **indicate that we modified it, and retain any indication of previous modification.** We convert
  the licensor's published documents into structured data. That is a modification, and
  §3(a)(1)(B) requires it to be declared. A complete-looking attribution that omits this is
  still non-compliant.

All five travel with the data, not just the first.

§3(a)(2) lets these be satisfied in any manner reasonable for the medium: a URI pointing at a
resource that carries the required information is explicitly contemplated. On a card-sized
surface, then, a short credit linking to one page that holds the full set is the sanctioned
pattern. Cramming the block onto the card is not required and dropping it is not permitted.
What is never optional is that the full set exists somewhere the reader can reach.

Three further rules follow, and none of them are optional:

- **The attribution statement is the sole exemption to the no-names rule.** The licence compels
  that exact text, so it is the one place in a tracked file where an outside product may be
  named. Never paraphrase it, reflow it, or let a formatter or codemod rewrite it.
- **Attribution is a ceiling as well as a floor.** Nothing beyond the required statement may
  credit the licensor or imply their endorsement. This is our own policy, reinforced by the
  licensor's published guidance. It is _not_ a CC BY 4.0 requirement, so do not cite the licence
  as its source.
- **MIT does not reach this material.** Do not relicense it, do not fold it into the `LICENSE`
  file, and do not describe the project as wholly MIT once it ships.

The extraction pipeline records provenance for every entry: the licensor's own published source,
pinned by checksum. No third-party mirror, converted dataset, or scrape is used, so the chain of
custody is verifiable rather than asserted.

## Content you import

Content a user imports is theirs and is covered by whatever terms already apply to it. This
project claims no rights over it, and (because the app never transmits) never receives a copy
of it. Imported content is parsed and stored in the user's own browser and goes nowhere else.

## Contributing

Contributions are accepted under the MIT License on the same terms as the rest of the software.
Contributors keep their copyright; the `LICENSE` file is not a contributor list.
