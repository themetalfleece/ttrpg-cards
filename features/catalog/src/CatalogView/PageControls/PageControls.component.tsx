import { Box } from "@ttrpg-cards/ui/Box";
import { Button } from "@ttrpg-cards/ui/Button";
import { ChoiceGroup } from "@ttrpg-cards/ui/ChoiceGroup";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import {
  ORIENTATION_LABEL,
  ORIENTATION_OPTIONS,
  PAPER_LABEL,
  PAPER_OPTIONS,
  PRINT_LABEL,
  PRINT_WAITING_LABEL,
  PRINT_WAIT_MILLISECONDS,
} from "./PageControls.constants";
import styles from "./PageControls.module.css";
import type { PageControlsProps } from "./PageControls.types";

/**
 * The sheet the cards are printed on, and the button that prints it.
 *
 * Both choices come from the print package's own records, so the preview and
 * the `@page` rule the sheet sets are working from the same numbers: what the
 * reader picks here is the paper that comes out of the printer.
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
  paper,
  onPaperChange,
  orientation,
  onOrientationChange,
  printable,
  className,
}: PageControlsProps) {
  const [waiting, setWaiting] = useState(false);

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
        value={paper}
        onValueChange={onPaperChange}
      />
      <ChoiceGroup
        label={ORIENTATION_LABEL}
        options={ORIENTATION_OPTIONS}
        value={orientation}
        onValueChange={onOrientationChange}
      />
      <Button
        className={styles.print}
        onPress={handlePrint}
        disabled={waiting}
      >
        {waiting ? PRINT_WAITING_LABEL : PRINT_LABEL}
      </Button>
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
