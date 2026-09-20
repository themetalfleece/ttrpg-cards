import type { NamedOption } from "./option.types";

/**
 * A record of names as the ordered list a picker offers.
 *
 * The record is the source of truth for both the set and its order, so a value
 * added to it appears wherever it is offered with nothing else to change.
 *
 * `Object.keys` widens a key back to `string`, and the record's own type is
 * what makes narrowing it again sound: a caller holds it to exactly its closed
 * set with `satisfies`, so there is no key here that is not one. That
 * narrowing is done once here rather than at each of the sets that needs it.
 *
 * @example
 * ```ts
 * optionsFrom({ a4: "A4", letter: "US Letter" });
 * // [{ id: "a4", name: "A4" }, { id: "letter", name: "US Letter" }]
 * ```
 */
export function optionsFrom<Id extends string>(
  names: Readonly<Record<Id, string>>,
): readonly NamedOption<Id>[] {
  const ids = Object.keys(names) as Id[];

  return ids.map((id) => ({ id, name: names[id] }));
}
