import {
  CUSTOM_PAGE_SIDE_RANGE,
  CUSTOM_PAGE_SIZE,
  type CutGuidesName,
  type FlipEdgeName,
  type PageOrientation,
  type PageSizeName,
  type PrintSidesName,
} from "@ttrpg-cards/printer";
import { Box } from "@ttrpg-cards/ui/Box";
import { Button } from "@ttrpg-cards/ui/Button";
import { ChoiceGroup } from "@ttrpg-cards/ui/ChoiceGroup";
import { NumberField } from "@ttrpg-cards/ui/NumberField";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { DuplexNote } from "./DuplexNote/DuplexNote.component";
import {
  CUSTOM_HEIGHT_LABEL,
  CUSTOM_SIZE_UNIT,
  CUSTOM_WIDTH_LABEL,
  CUT_GUIDE_LABEL,
  CUT_GUIDE_OPTIONS,
  FLIP_EDGE_LABEL,
  FLIP_EDGE_OPTIONS,
  ORIENTATION_LABEL,
  ORIENTATION_OPTIONS,
  PAPER_LABEL,
  PAPER_OPTIONS,
  PRINT_LABEL,
  PRINT_WAITING_LABEL,
  PRINT_WAIT_MILLISECONDS,
  SIDES_LABEL,
  SIDES_OPTIONS,
} from "./PageControls.constants";
import styles from "./PageControls.module.css";
import type { PageControlsProps } from "./PageControls.types";

/**
 * The sheet the cards are printed on, and the button that prints it.
 *
 * Every choice comes from the print package's own records, so the preview and
 * the `@page` rule the sheet sets are working from the same numbers: what the
 * reader picks here is the paper that comes out of the printer.
 *
 * It takes the sheet itself and hands back one changed setting, rather than
 * taking ten props. The sheet already answers every question these controls
 * ask and `SheetLayout.with` is already the shape of a change, so a pair of
 * props per control would be a second copy of a surface that exists.
 *
 * One of those papers is the reader's own, and picking it brings out two
 * fields for what it measures. They are the only numbers on this panel that
 * are typed rather than picked, which is why they are the only ones held to a
 * range on the way back: everything else cannot be wrong.
 *
 * Printing on both sides brings a second control and a note with it, and both
 * only while it is on. Which edge the printer turns the sheet about decides
 * where a back slot lands, and it is not something a browser can find out or
 * set, so it is asked for here and then said back to the reader as the setting
 * to match in the print dialog.
 *
 * The button waits for the page rather than racing it. A browser draws the
 * page as it stands the moment it is asked, and the page arrives over several
 * frames, so a print asked for early comes out short, or comes out with
 * entries that have not worked out yet that they need a second card.
 *
 * Waiting, rather than telling the page to hurry. The page can be made to put
 * every sheet up at once, and a print the browser starts does exactly that
 * because it cannot be held. It is the wrong thing to do when there is a
 * choice: a set of three hundred mounted in one commit spends longer working
 * back to the right answer than the same set left to arrive at its own pace,
 * measured. So the button lets it arrive and prints what it arrives at.
 */
export function PageControls({
  sheet,
  onSheetChange,
  printable,
  className,
}: PageControlsProps) {
  const [waiting, setWaiting] = useState(false);
  const custom = sheet.size === CUSTOM_PAGE_SIZE;
  // What the reader measured, as the sheet settled on it rather than as they
  // typed it, so a number past the range shows corrected in the field.
  const customPaper = sheet.customMillimetres;

  // Each control reports its own setting and nothing else, which is what
  // lets the sheet keep the rest. A control takes a value of its own type,
  // so these are what turn one into a change to the sheet.
  const handlePaperChange = (size: PageSizeName) => {
    onSheetChange({ size });
  };

  const handleOrientationChange = (orientation: PageOrientation) => {
    onSheetChange({ orientation });
  };

  const handleSidesChange = (sides: PrintSidesName) => {
    onSheetChange({ sides });
  };

  const handleFlipEdgeChange = (flipEdge: FlipEdgeName) => {
    onSheetChange({ flipEdge });
  };

  const handleCutGuidesChange = (cutGuides: CutGuidesName) => {
    onSheetChange({ cutGuides });
  };

  // One side at a time, because the fields are separate and the sheet takes a
  // paper. The other side comes from what the sheet already holds.
  const handleCustomWidthChange = (widthMillimetres: number) => {
    onSheetChange({
      custom: { ...customPaper, widthMillimetres },
    });
  };

  const handleCustomHeightChange = (heightMillimetres: number) => {
    onSheetChange({
      custom: { ...customPaper, heightMillimetres },
    });
  };

  // The latest answer, readable from a callback that outlives the render it
  // was made in. The button's wait is a loop over frames, and each turn of it
  // has to see the page as it is now rather than as it was when it started.
  const latestPrintable = useRef(printable);

  useEffect(() => {
    latestPrintable.current = printable;
  }, [printable]);

  const handlePrint = () => {
    if (latestPrintable.current) {
      window.print();
      return;
    }

    setWaiting(true);
    printWhenReady({
      printable: latestPrintable,
      waitMilliseconds: PRINT_WAIT_MILLISECONDS,
      done: () => {
        setWaiting(false);
      },
    });
  };

  return (
    <Box className={clsx(styles.controls, className)}>
      <ChoiceGroup
        label={PAPER_LABEL}
        options={PAPER_OPTIONS}
        value={sheet.size}
        onValueChange={handlePaperChange}
      />
      {custom ? (
        <Box className={styles.customPaper}>
          <NumberField
            label={CUSTOM_WIDTH_LABEL}
            value={customPaper.widthMillimetres}
            minimum={CUSTOM_PAGE_SIDE_RANGE.minimum}
            maximum={CUSTOM_PAGE_SIDE_RANGE.maximum}
            step={CUSTOM_PAGE_SIDE_RANGE.step}
            onValueChange={handleCustomWidthChange}
            unit={CUSTOM_SIZE_UNIT}
          />
          <NumberField
            label={CUSTOM_HEIGHT_LABEL}
            value={customPaper.heightMillimetres}
            minimum={CUSTOM_PAGE_SIDE_RANGE.minimum}
            maximum={CUSTOM_PAGE_SIDE_RANGE.maximum}
            step={CUSTOM_PAGE_SIDE_RANGE.step}
            onValueChange={handleCustomHeightChange}
            unit={CUSTOM_SIZE_UNIT}
          />
        </Box>
      ) : null}
      <ChoiceGroup
        label={ORIENTATION_LABEL}
        options={ORIENTATION_OPTIONS}
        value={sheet.orientation}
        onValueChange={handleOrientationChange}
      />
      <ChoiceGroup
        label={SIDES_LABEL}
        options={SIDES_OPTIONS}
        value={sheet.sides}
        onValueChange={handleSidesChange}
      />
      {sheet.duplex ? (
        <ChoiceGroup
          label={FLIP_EDGE_LABEL}
          options={FLIP_EDGE_OPTIONS}
          value={sheet.flipEdge}
          onValueChange={handleFlipEdgeChange}
        />
      ) : null}
      <ChoiceGroup
        label={CUT_GUIDE_LABEL}
        options={CUT_GUIDE_OPTIONS}
        value={sheet.cutGuides}
        onValueChange={handleCutGuidesChange}
      />
      <Button
        className={styles.print}
        onPress={handlePrint}
        disabled={waiting}
      >
        {waiting ? PRINT_WAITING_LABEL : PRINT_LABEL}
      </Button>
      {sheet.duplex ? <DuplexNote flipEdge={sheet.flipEdge} /> : null}
    </Box>
  );
}

/**
 * Prints as soon as `printable` says the page is finished, and prints anyway
 * once the wait has run out.
 *
 * Outside the component because it reads a clock and a ref, and neither of
 * those belongs anywhere a render could reach them.
 *
 * Giving up and printing beats waiting forever: a set that takes longer than
 * this is one where every choice is bad, and a reader who asked to print
 * should not be left holding a button that does nothing. What goes to the
 * printer then still holds every sheet, because the browser's own print
 * announces itself on the way out and the page puts the rest up when it does.
 */
function printWhenReady(options: {
  printable: { readonly current: boolean };
  waitMilliseconds: number;
  done: () => void;
}): void {
  const deadline = performance.now() + options.waitMilliseconds;

  const tick = () => {
    requestAnimationFrame(() => {
      if (
        !options.printable.current &&
        performance.now() < deadline
      ) {
        tick();
        return;
      }

      options.done();
      window.print();
    });
  };

  tick();
}
