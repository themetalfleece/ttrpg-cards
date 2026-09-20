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
