import type { Card, CardLayout } from "@ttrpg-cards/card";
import { millimetres } from "@ttrpg-cards/core";
import type { SheetLayout, SheetPage } from "@ttrpg-cards/printer";

import type { CardPageStyle, PageCell } from "./CardPage.types";

/**
 * The sheet's geometry as the custom properties its stylesheet reads.
 *
 * Takes the card layout as well as the sheet, because where the grid starts
 * depends on how wide a column is.
 *
 * @example
 * ```ts
 * cardPageStyle({
 *   sheet: SheetLayout.default(),
 *   layout: CardLayout.default(),
 * })["--page-width"]; // "210mm"
 * ```
 */
export function cardPageStyle(options: {
  sheet: SheetLayout;
  layout: CardLayout;
}): CardPageStyle {
  const { sheet, layout } = options;

  return {
    "--page-width": millimetres(sheet.widthMillimetres),
    "--page-height": millimetres(sheet.heightMillimetres),
    "--page-margin": millimetres(sheet.marginMillimetres),
    "--page-card-gap": millimetres(sheet.cardGapMillimetres),
    "--page-grid-inset": millimetres(
      sheet.gridInsetMillimetres({ layout }),
    ),
    // Centred down the sheet only when the job is two sided. A back slot is
    // the mirror of its front across the grid, so the mirror lands on the card
    // it belongs to only if the grid sits in the middle of the axis being
    // reversed. A one sided sheet has nothing to register against, and the
    // inset would move a grid that is right where it is.
    "--page-grid-row-inset": millimetres(
      sheet.duplex ? sheet.gridRowInsetMillimetres({ layout }) : 0,
    ),
    "--page-slot-width": millimetres(layout.widthMillimetres),
    "--page-slot-height": millimetres(layout.heightMillimetres),
    // How far a cut guide reaches out from a card, which is nothing at all on
    // a sheet carrying none. A measurement rather than a flag for the same
    // reason as the row inset above: the stylesheet lays the marks out at
    // whatever reach it is given, and a reach of nothing draws nothing, so
    // nothing here branches on whether the guides are on.
    "--page-guide-reach": millimetres(sheet.cutGuideReachMillimetres),
  };
}

/**
 * A page's slots with the blanks between them, in the order they are drawn.
 *
 * The page lays its cards out in reading order and wraps at the margin, so a
 * card lands at the slot it was given only if every slot before it is
 * occupied. That is free on a front page, whose slots fill from zero, and it
 * is exactly what a back page does not do: its slots are the mirror of its
 * front's, so it starts wherever the mirror put the first continuation and has
 * a hole wherever a front card had none.
 *
 * A page carrying nothing at all still gets one blank, and that one is load
 * bearing. On paper the page box supplies the height and the surface drops its
 * own, so a back with no children is an element of no height, and a browser
 * collapses the forced break before it into the one after it. The page is then
 * never put out, and every back after it lands on the wrong front. A card's
 * worth of height is enough to stop that, and far short of a page, so it
 * cannot spill onto the next one.
 *
 * @example
 * ```ts
 * pageCells({ number: 1, side: "back", slots: [{ item, from: 1, count: 1, index: 2 }] });
 * // [{ kind: "blank", index: 0 }, { kind: "blank", index: 1 }, { kind: "cards", slot }]
 * ```
 */
export function pageCells(
  page: SheetPage<Card>,
): readonly PageCell[] {
  if (page.slots.length === 0) {
    return [{ kind: "blank", index: 0 }];
  }

  const cells: PageCell[] = [];
  let next = 0;

  for (const slot of page.slots) {
    while (next < slot.index) {
      cells.push({ kind: "blank", index: next });
      next += 1;
    }

    cells.push({ kind: "cards", slot });
    next = slot.index + slot.count;
  }

  return cells;
}

/**
 * The printed page box, as the `@page` rule that sets it.
 *
 * This exists because `@page` descriptors do not resolve `var()`, so the paper
 * cannot be read from the custom property beside it and has to be written into
 * the rule as text. Without it the browser picks the paper itself, the sheet
 * re-wraps against whatever run of paper that leaves, and what prints is not
 * what the reader was shown. The number comes from the same sheet the preview
 * is drawn from, so the two cannot disagree, and the sheet has already held a
 * paper the reader measured to what a sheet can be.
 *
 * **The page box has no margin of its own, and the sheet keeps its own blank
 * instead.** A `@page` margin is unreachable: nothing in the page box can be
 * drawn in it, and the cut guides at the outside of the grid reach into
 * exactly that blank. Handing the whole paper to the sheet also makes the
 * printed geometry the same as the preview's rather than nearly the same,
 * which is one fewer thing to keep in step.
 *
 * The cost is that a reader who leaves their dialog's headers and footers
 * switched on gets them over the sheet's own margin rather than over a blank
 * the browser was holding. They land clear of every card, because the margin
 * is wider than a cut guide reaches, so what they can spoil is a guide rather
 * than a card.
 *
 * @example
 * ```ts
 * pageRule({ sheet: SheetLayout.default() });
 * // "@page { size: 210mm 297mm; margin: 0; }"
 * ```
 */
export function pageRule(options: { sheet: SheetLayout }): string {
  const { sheet } = options;
  const size = `${millimetres(sheet.widthMillimetres)} ${millimetres(sheet.heightMillimetres)}`;

  return `@page { size: ${size}; margin: 0; }`;
}
