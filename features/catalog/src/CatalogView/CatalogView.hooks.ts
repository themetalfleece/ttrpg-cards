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
import { MarkdownDocument } from "@ttrpg-cards/importer";
import { useCallback, useMemo, useState } from "react";

import {
  CATALOG_ATTRIBUTIONS,
  CATALOG_CARDS,
  NO_ATTRIBUTIONS,
} from "./CatalogView.data";
import type {
  BroughtCards,
  CatalogSelection,
} from "./CatalogView.types";

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
 * The cards are everything the page could lay out, in order. Which of them fit
 * is the sheet's own question, because it is the only thing that knows what
 * each one cost. They are the reader's own once they bring a document, and the
 * bundled ones until then: their cards are cards, and there is nothing about
 * one to draw differently.
 *
 * Nothing is persisted, and nothing is transmitted. What a reader picked is
 * theirs to pick again, and the document they brought is read where they
 * handed it over.
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
  const [brought, setBrought] = useState<BroughtCards | undefined>(
    undefined,
  );

  // Parsed here rather than in the panel, so the panel stays a surface and
  // the cards it produced live with everything else the page is drawn from.
  //
  // Each document adds to what is already on the page rather than replacing
  // it, so a reader can build a set up a few cards at a time. The identifiers
  // already spoken for go in with it, which is what lets two documents that
  // name a card the same thing both keep theirs.
  //
  // Through the updater rather than off `brought`, because a file is read
  // asynchronously and the handler that started it would otherwise add to
  // whatever was there when the reader picked it.
  const importMarkdown = useCallback((source: string) => {
    setBrought((current) => {
      const kept = current?.cards ?? [];
      const document = new MarkdownDocument({
        source,
        reservedIdentifiers: kept.map((card) => card.id),
      });

      return {
        cards: [...kept, ...document.cards],
        addedCount: document.cards.length,
        issues: document.issues,
      };
    });
  }, []);
  const clearImport = useCallback(() => {
    setBrought(undefined);
  }, []);

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
  // One identity per set of cards, for the same reason the layout has one per
  // size: a fresh array would re-measure every card on the sheet. The cards
  // themselves keep their identity across an addition, so only the new ones
  // are measured.
  const cards = useMemo(() => {
    const kept = brought?.cards ?? [];

    return kept.length > 0 ? kept : CATALOG_CARDS;
  }, [brought]);
  // The credit is owed for the bundled content, so it follows exactly what is
  // laid out rather than a second condition that could come to disagree.
  const showsBundledCards = cards === CATALOG_CARDS;
  const importSummary = useMemo(() => {
    if (brought === undefined) {
      return undefined;
    }

    return {
      totalCount: brought.cards.length,
      addedCount: brought.addedCount,
      issues: brought.issues,
    };
  }, [brought]);

  return {
    theme,
    size,
    textSize,
    layout,
    paper,
    orientation,
    sheet,
    cards,
    attributions: showsBundledCards
      ? CATALOG_ATTRIBUTIONS
      : NO_ATTRIBUTIONS,
    importSummary,
    screenScale,
    chooseTheme: setTheme,
    chooseSize: setSize,
    chooseTextSize: setTextSize,
    choosePaper: setPaper,
    chooseOrientation: setOrientation,
    chooseScreenScale,
    importMarkdown,
    clearImport,
  };
}
