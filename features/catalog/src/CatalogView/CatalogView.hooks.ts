import {
  CardLayout,
  DEFAULT_CARD_LAYOUT_PRESET,
  DEFAULT_CARD_TEXT_SIZE,
  DEFAULT_CARD_THEME_ID,
  DEFAULT_CARD_TYPEFACE_ID,
  type CardLayoutPresetName,
  type CardTextSizeName,
  type CardThemeId,
  type CardTypefaceId,
} from "@ttrpg-cards/card";
import {
  SheetLayout,
  type SheetLayoutOverrides,
} from "@ttrpg-cards/printer";
import { SCREEN_SCALE_RANGE, clampToRange } from "@ttrpg-cards/core";
import {
  MarkdownDocument,
  type ImportIssue,
} from "@ttrpg-cards/importer";
import { useCallback, useMemo, useState } from "react";

import {
  CATALOG_ATTRIBUTIONS,
  CATALOG_CARDS,
  CATALOG_CARD_COUNT,
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
 * changed. The sheet keeps its identity for the same reason, which it gets
 * for free by being the state rather than something derived from it.
 *
 * Size and text size are one layout between them, so both go into that memo.
 * Either one changing is a re-measure and has to be, because how large the
 * type is set is exactly what decides whether an entry fits on one card.
 *
 * The layout and the sheet are kept apart on purpose. Changing the paper or
 * the way round it goes changes how many cards come off the sheet, but not
 * what any one of them says, so the card layout keeps its identity and
 * nothing re-measures.
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
  const [typeface, setTypeface] = useState<CardTypefaceId>(
    DEFAULT_CARD_TYPEFACE_ID,
  );
  // The sheet is the state rather than the settings it is built from. It is
  // an immutable value object that already answers every question about them
  // and already knows how to derive the next one, so holding the parts as
  // well would be the same thing written twice. It also puts every change
  // through the constructor, which is what holds a paper the reader typed to
  // what a sheet can be.
  const [sheet, setSheet] = useState(() => SheetLayout.default());
  const [screenScale, setScreenScale] = useState(
    SCREEN_SCALE_RANGE.initial,
  );
  const [brought, setBrought] = useState<BroughtCards | undefined>(
    undefined,
  );

  // Parsed here rather than in the panel, so the panel stays a surface and
  // the cards it produced live with everything else the page is drawn from.
  //
  // Documents add to what is already on the page rather than replacing it, so
  // a reader can build a set up a few at a time and can hand over several at
  // once. What they brought in one go counts as one import, because that is
  // the question the summary answers.
  //
  // Through the updater rather than off `brought`, because a file is read
  // asynchronously and the handler that started it would otherwise add to
  // whatever was there when the reader picked it.
  const importMarkdown = useCallback((sources: readonly string[]) => {
    setBrought((current) => {
      const cards = [...(current?.cards ?? [])];
      const issues: ImportIssue[] = [];
      const before = cards.length;

      // One document at a time, each told what the ones before it already
      // spoke for, so two files naming a card the same thing both keep
      // theirs rather than the second replacing the first.
      for (const source of sources) {
        const document = new MarkdownDocument({
          source,
          reservedIdentifiers: cards.map((card) => card.id),
        });

        cards.push(...document.cards);
        issues.push(...document.issues);
      }

      return {
        cards,
        addedCount: cards.length - before,
        issues,
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
  // One way in for every sheet setting. `with` gives back a new sheet, which
  // is the identity a renderer needs to re-run anyway, and it normalises what
  // it was handed on the way, so a paper the reader typed comes back out at a
  // size a sheet can be.
  //
  // It builds one every time it is called, including when the override
  // changes nothing, so what keeps a re-pick of the value already showing
  // from re-laying the page out is the control staying quiet rather than the
  // sheet. A control that reports a pick it was already on wants comparing
  // here first.
  const changeSheet = useCallback(
    (overrides: SheetLayoutOverrides) => {
      setSheet((current) => current.with(overrides));
    },
    [],
  );
  const layout = useMemo(
    () => CardLayout.fromPreset({ preset: size, textSize }),
    [size, textSize],
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
    typeface,
    size,
    textSize,
    layout,
    sheet,
    cards,
    attributions: showsBundledCards
      ? CATALOG_ATTRIBUTIONS
      : NO_ATTRIBUTIONS,
    importSummary,
    bundled: {
      shown: CATALOG_CARDS.length,
      total: CATALOG_CARD_COUNT,
    },
    screenScale,
    chooseTheme: setTheme,
    chooseTypeface: setTypeface,
    chooseSize: setSize,
    chooseTextSize: setTextSize,
    changeSheet,
    chooseScreenScale,
    importMarkdown,
    clearImport,
  };
}
