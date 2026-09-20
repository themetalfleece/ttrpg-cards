/**
 * A measurement as a CSS length.
 *
 * The app works in millimetres everywhere, so this is the one place a number
 * becomes a length a stylesheet can read. Three components were writing the
 * same template literal before it was here.
 *
 * @example
 * ```ts
 * millimetres(63); // "63mm"
 * ```
 */
export function millimetres(value: number): string {
  return `${value}mm`;
}
