/**
 * How wide and how tall something is, in millimetres.
 *
 * Here rather than in one of the packages that has a size, because several of
 * them do: a card is cut to one, a paper is published at one, and a sheet
 * works out what fits by comparing the two. One shape means the comparison
 * needs no translation.
 */
export interface Dimensions {
  /** How wide it is. */
  readonly widthMillimetres: number;
  /** How tall it is. */
  readonly heightMillimetres: number;
}
