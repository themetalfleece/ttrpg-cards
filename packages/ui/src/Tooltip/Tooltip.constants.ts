/**
 * How long a reader has to rest on the trigger before the bubble opens.
 *
 * Long enough that a pointer crossing the trigger on its way somewhere else
 * does not flash it, short enough that resting on it feels like an answer
 * rather than a wait.
 */
export const TOOLTIP_OPEN_DELAY_MILLISECONDS = 250;

/**
 * The gap between the trigger and the bubble, in pixels.
 *
 * A pixel rather than a millimetre because this is chrome and not a card:
 * nothing here is printed, so there is no physical size to be right about.
 */
export const TOOLTIP_SIDE_OFFSET_PIXELS = 6;
