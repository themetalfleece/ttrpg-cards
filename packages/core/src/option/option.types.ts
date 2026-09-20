/**
 * One value a reader picks from a closed set: what it is called in code, and
 * what a picker shows for it.
 *
 * Here rather than in one of the packages that has a set, because several of
 * them do (card sizes, papers, margins, orientations) and none of them owns
 * the idea. Every one of those lists this shape, which is what lets a control
 * take any of them without knowing which it was handed.
 */
export interface NamedOption<Id extends string> {
  /** Identifies the value in a stored preference and to the code that uses it. */
  readonly id: Id;
  /** What a picker shows. */
  readonly name: string;
}
