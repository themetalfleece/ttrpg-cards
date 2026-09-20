import {
  CardLayout,
  DEFAULT_CARD_LAYOUT_PRESET,
  DEFAULT_CARD_TEXT_SIZE,
  DEFAULT_CARD_THEME_ID,
  type CardLayoutPresetName,
  type CardTextSizeName,
  type CardThemeId,
} from "@ttrpg-cards/card";
import {
  DEFAULT_PAGE_ORIENTATION,
  DEFAULT_PAGE_SIZE,
  SheetLayout,
  type PageOrientation,
  type PageSizeName,
} from "@ttrpg-cards/printer";
import { SCREEN_SCALE_RANGE, clampToRange } from "@ttrpg-cards/core";
import { useCallback, useMemo, useState } from "react";

import { CATALOG_CARDS } from "./CatalogView.data";
import type { CatalogSelection } from "./CatalogView.types";

/**
 * What the reader has picked, and what the page is drawn from because of it.
 *
 * The card layout is built once per size and text size rather than per
 * render: a card measures itself against the layout it is handed, so a fresh
 * identity would re-measure every card on the page each time anything else
 * changed. The sheet is held for the same reason.
 *
 * Size and text size are one layout between them, so both go into that memo.
 * Either one changing is a re-measure and has to be, because how large the
 * type is set is exactly what decides whether an entry fits on one card.
 *
 * The two are kept apart on purpose. Changing the paper or the way round it
 * goes changes how many cards come off the sheet, but not what any one of them
 * says, so the card layout keeps its identity and nothing re-measures.
 *
 * The cards are the whole catalog, in order. Which of them fit is the sheet's
 * own question, because it is the only thing that knows what each one cost.
 *
 * Nothing is persisted. What a reader picked is theirs to pick again.
 */
export function useCatalogSelection(): CatalogSelection {
  const [theme, setTheme] = useState<CardThemeId>(
    DEFAULT_CARD_THEME_ID,
  );
  const [size, setSize] = useState<CardLayoutPresetName>(
    DEFAULT_CARD_LAYOUT_PRESET,
  );
  const [textSize, setTextSize] = useState<CardTextSizeName>(
    DEFAULT_CARD_TEXT_SIZE,
  );
  const [paper, setPaper] = useState<PageSizeName>(DEFAULT_PAGE_SIZE);
  const [orientation, setOrientation] = useState<PageOrientation>(
    DEFAULT_PAGE_ORIENTATION,
  );
  const [screenScale, setScreenScale] = useState(
    SCREEN_SCALE_RANGE.initial,
  );

  // The scale reaches CSS and is dragged by a control, so it is held to its
  // range here rather than trusted at either end.
  const chooseScreenScale = useCallback((scale: number) => {
    setScreenScale(
      clampToRange({ value: scale, range: SCREEN_SCALE_RANGE }),
    );
  }, []);
  const layout = useMemo(
    () => CardLayout.fromPreset({ preset: size, textSize }),
    [size, textSize],
  );
  const sheet = useMemo(
    () => new SheetLayout({ settings: { size: paper, orientation } }),
    [paper, orientation],
  );
  return {
    theme,
    size,
    textSize,
    layout,
    paper,
    orientation,
    sheet,
    cards: CATALOG_CARDS,
    screenScale,
    chooseTheme: setTheme,
    chooseSize: setSize,
    chooseTextSize: setTextSize,
    choosePaper: setPaper,
    chooseOrientation: setOrientation,
    chooseScreenScale,
  };
}
