/**
 * A scale as a reader reads it.
 *
 * @example
 * ```ts
 * scaleReadout(1.425); // "143%"
 * ```
 */
export function scaleReadout(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
