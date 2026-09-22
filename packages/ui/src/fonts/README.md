# Fonts

Every face the app can set text in, vendored as a file.

**Nothing here is fetched.** No `@import`, no absolute URL, no font service, at
build time or at run time. A webfont request is the reader's browser calling
somebody else's server, and this app does not make the reader do that.
`fonts.test.ts` fails on any URL that is not relative, on a declared face with
no file beside it, and on a family with no licence.

## Adding a family

1. Put the Latin `woff2` subset in `<family>/`, named
   `<family>-latin-<weight>-<style>.woff2`.
2. Put its `OFL.txt` beside it. Redistributing a face means carrying its
   licence with it, which is why the licence sits in the family's own
   directory rather than somewhere central.
3. Declare the face in [`fonts.css`](./fonts.css), with the same
   `unicode-range` as its neighbours so a character outside the Latin subset
   falls back to a system face instead of drawing as a missing glyph.

Declaring a face costs nothing: a browser fetches one only when a rule asks for
it, so a family nobody picks costs disk and no bandwidth.

## Using one

Card pairings live in
[`../CardFace/CardFace.typefaces.css`](../CardFace/CardFace.typefaces.css) and
are named in `CARD_TYPEFACES` in `@ttrpg-cards/card`. A pairing is two family
properties, a weight and the display face's optical centring; it never declares
a face itself.

A display face needs its `--card-name-centre` measured before it reads as
centred in the band, because where a face puts its capitals inside a line box
is a property of the file. The comment at the top of that stylesheet says how
the number is arrived at.
