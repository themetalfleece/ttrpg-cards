import {
  PAGE_ORIENTATIONS,
  PAGE_SIZES,
  type PageOrientation,
  type PageSizeName,
} from "@ttrpg-cards/printer";
import type { ChoiceGroupOption } from "@ttrpg-cards/ui/ChoiceGroup";

import { choicesFrom } from "../CatalogView.data";

/**
 * The papers and ways round on offer, in the order the print package lists
 * them. Built from those records rather than restated, so a paper added there
 * shows up here with nothing to change.
 *
 * There is no margin control, and deliberately: the margin is whatever the
 * grid does not need, which is a property of the paper rather than a
 * preference. See `PAGE_SIZE_PRESETS`.
 */
export const PAPER_OPTIONS: readonly ChoiceGroupOption<PageSizeName>[] =
  choicesFrom(PAGE_SIZES);

export const ORIENTATION_OPTIONS: readonly ChoiceGroupOption<PageOrientation>[] =
  choicesFrom(PAGE_ORIENTATIONS);

/** What each control is asking, and what the action says. */
export const PAPER_LABEL = "Paper";
export const ORIENTATION_LABEL = "Orientation";
export const PRINT_LABEL = "Print";

/**
 * What the button says while it is waiting for the page to finish.
 *
 * A print draws the page as it stands, so one asked for while cards are still
 * being measured comes out short. The button waits instead of refusing, and
 * says what it is waiting for: the reader asked once and does not have to ask
 * again. User-facing copy, so American spelling.
 */
export const PRINT_WAITING_LABEL = "Finishing the layout";

/**
 * How long the button will wait for the page before printing anyway.
 *
 * Counted in time rather than in frames. A frame here carries a sheet's worth
 * of measuring and can run for seconds on a heavy set, so a count of frames
 * buys an amount of waiting nobody can predict from reading it.
 *
 * It is a stop rather than a deadline. A set that takes longer than this is
 * one where every choice is bad, and printing the page as far as it has got
 * beats leaving a reader holding a button that does nothing.
 */
export const PRINT_WAIT_MILLISECONDS = 20_000;
