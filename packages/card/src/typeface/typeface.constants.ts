import type { CardTypeface, CardTypefaceId } from "./typeface.types";

/**
 * The typeface pairings the app ships, in the order a picker should offer
 * them.
 *
 * A pairing is a display face for the title, the badge and the footer, and a
 * workhorse for everything the reader actually reads. Keeping the display face
 * out of the body is what lets the fitted body size stay large: display faces
 * run wide, and every millimetre one of them spends on a paragraph comes off
 * the type size the card settles at.
 *
 * **This is the one place a pairing is named.** Which faces it draws is the
 * renderer's business, the same way a theme is named here and coloured there.
 *
 * @example
 * ```ts
 * CARD_TYPEFACES.map((typeface) => typeface.id); // ["rounded", "soft", ...]
 * ```
 */
export const CARD_TYPEFACES = [
  { id: "rounded", name: "Rounded" },
  { id: "soft", name: "Soft" },
  { id: "poster", name: "Poster" },
  { id: "futuristic", name: "Futuristic" },
  { id: "medieval", name: "Medieval" },
] as const satisfies readonly CardTypeface[];

/**
 * The pairing a card is set in when nothing has chosen another.
 *
 * The rounded one, because its workhorse is condensed: it fits the most text
 * per card of the three, and how much a card holds is the thing every other
 * decision here is trading against.
 */
export const DEFAULT_CARD_TYPEFACE_ID: CardTypefaceId = "rounded";

const TYPEFACE_IDS: ReadonlySet<string> = new Set(
  CARD_TYPEFACES.map((typeface) => typeface.id),
);

/**
 * Whether a value names a pairing the app ships. The guard a stored preference
 * is read back through, since a pairing that was dropped leaves a stale id
 * behind in a browser that saved it.
 *
 * @example
 * ```ts
 * isCardTypefaceId("poster"); // true
 * isCardTypefaceId("copperplate"); // false
 * ```
 */
export function isCardTypefaceId(
  value: unknown,
): value is CardTypefaceId {
  return typeof value === "string" && TYPEFACE_IDS.has(value);
}
