import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

import {
  FIRST_SHEET,
  MEDIA_CHANGE_EVENT,
  PRINT_EVENT,
  PRINT_MEDIA,
  SETTLED_FRAMES,
  SHEET_GROWTH,
} from "./CardPage.constants";
import type {
  FaceCountReport,
  PageFill,
  UsePageFillOptions,
} from "./CardPage.types";

/** What has been counted before anything has been measured. */
const NOTHING_COUNTED: ReadonlyMap<string, number> = new Map();

/**
 * The entries laid out across as many sheets as they need, worked out as they
 * are measured.
 *
 * How many cards an entry becomes is only known once the browser has laid it
 * out, and by then the sheets have already been filled. So they fill
 * optimistically, every entry reports what it cost, and `SheetLayout.paginate`
 * moves whatever no longer fits onto the sheet after it.
 *
 * That settles rather than oscillates only because a guess never lowers a
 * count, which is the invariant `fill` is written against and which is
 * enforced here. An entry that has just been moved to another sheet has been
 * remounted and has measured nothing, and it says so; believing it is a loop,
 * not an update.
 *
 * The counts are held across every sheet rather than per sheet, because an
 * entry that grew on the first one is the reason a later one exists. They are
 * also held across a change of face or size, which is the one thing that keeps
 * that change cheap: what an entry cost in the last face is a far better guess
 * at what it costs in this one than the single card a fresh mount assumes, and
 * every entry on the page measures itself again and says what it really came
 * to. Thrown away instead, the page lays every entry out as one card, then
 * moves each one that grew to the sheet after it, and every move is a remount
 * and another round of measuring.
 *
 * All this holds is the counts. What they mean for a sheet is the sheet's own
 * question.
 */
export function usePageFill({
  cards,
  layout,
  sheet,
}: UsePageFillOptions): PageFill {
  const [faceCounts, setFaceCounts] =
    useState<ReadonlyMap<string, number>>(NOTHING_COUNTED);

  const reportFaceCount = useCallback((report: FaceCountReport) => {
    setFaceCounts((current) => {
      const known = current.get(report.cardId);

      // A measurement is believed whatever it says, including that the entry
      // costs less than it used to. A guess is believed only when it is larger
      // than what is already known.
      //
      // The guess is what a fresh mount draws: the one card the entry is at
      // least. An entry that grew no longer fits where it was, so it moves to
      // the next sheet, and moving sheets means moving React parents, which
      // is an unmount and a fresh mount. Believing the guess it starts with
      // would send it home, where it would measure, grow and move again,
      // forever. That loop is what a reader sees flashing.
      //
      // Believing a measurement whatever it says is also what keeps a count
      // from another face or another card size honest: it stands in until the
      // entry has been measured again, and then it is replaced rather than
      // raised. A cold load works the same way, because the faces arrive after
      // the page has drawn and the second answer can be the smaller one.
      if (
        !report.measured &&
        known !== undefined &&
        report.faceCount <= known
      ) {
        return current;
      }

      const next = new Map(current);

      next.set(report.cardId, report.faceCount);

      return next;
    });
  }, []);

  const sheets = useMemo(
    () => sheet.paginate({ items: cards, layout, faceCounts }),
    [sheet, cards, layout, faceCounts],
  );

  // Measuring has no completion event. A card reports what it costs, that
  // moves a boundary, the cards that moved report again, and the page reaches
  // its answer over several rounds. The only evidence the last round has been
  // run is that a few frames have gone by with nothing changing.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);

    let frames = 0;
    let frame = requestAnimationFrame(function tick() {
      frames += 1;

      if (frames >= SETTLED_FRAMES) {
        setSettled(true);
        return;
      }

      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [sheets, faceCounts]);

  return { sheets, reportFaceCount, settled };
}

/**
 * How many of the sheets to put on the page right now, which grows by one a
 * frame until they are all on it.
 *
 * Every card on a sheet measures itself the moment it mounts, and a measure is
 * a style write and a forced layout in a row. Mounting the lot in one commit
 * means one paint at the end of all of them, so a reader who brings a set
 * worth printing watches a blank page with the tab locked up behind it: three
 * hundred cards is nine seconds of nothing, measured. Starting at one sheet
 * and doubling puts the first on screen in the time one sheet takes, lets the
 * gaps between frames carry a scroll or a click, and still finishes in about
 * the time the whole commit took.
 *
 * A print does not wait for any of that, so this puts every sheet up the
 * moment one starts. The flush is what makes them real before the browser
 * draws pages rather than a frame afterwards.
 *
 * It makes them real, not measured. An entry works out whether it needs a
 * second card in a microtask, and nothing that runs inside the browser's own
 * print call can wait for one, so the sheets are all there while the newest
 * entries on them are still one card each. Closing that is the print button's
 * job, not this hook's: it asks first and prints once the page says it is
 * finished. A print the browser starts on its own gets the sheets and takes
 * its chances with the splits, because there is nothing to hold it with.
 *
 * A layout change is not reset back to the first sheet. Emptying the page and
 * filling it again under someone who only asked for larger type reads as a
 * fault rather than as progress. The cost is known and kept: a size change
 * re-measures everything already up in one commit, so a large set freezes
 * there the way the first load used to. It is the same problem rather than a
 * different one, and it is waiting here for whoever decides the flash is the
 * lesser evil.
 */
export function useSheetsShown(total: number): number {
  const [shown, setShown] = useState(FIRST_SHEET);

  useEffect(() => {
    if (shown >= total) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setShown((count) => count * SHEET_GROWTH);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [shown, total]);

  useEffect(() => {
    const showEveryone = () => {
      flushSync(() => {
        setShown(total);
      });
    };

    const onMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        showEveryone();
      }
    };

    const printing = printMedia();

    window.addEventListener(PRINT_EVENT, showEveryone);
    printing?.addEventListener(MEDIA_CHANGE_EVENT, onMediaChange);

    return () => {
      window.removeEventListener(PRINT_EVENT, showEveryone);
      printing?.removeEventListener(
        MEDIA_CHANGE_EVENT,
        onMediaChange,
      );
    };
  }, [total]);

  return Math.min(shown, total);
}

/**
 * The query that answers whether the browser is drawing pages, where there is
 * one to ask.
 *
 * Read through the window rather than called outright, because jsdom has no
 * media queries and a test environment without one must not take the page down
 * with it.
 */
function printMedia(): MediaQueryList | undefined {
  return window.matchMedia?.(PRINT_MEDIA);
}
