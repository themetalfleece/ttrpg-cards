import { Box } from "@ttrpg-cards/ui/Box";
import { Button } from "@ttrpg-cards/ui/Button";
import { ChoiceGroup } from "@ttrpg-cards/ui/ChoiceGroup";
import clsx from "clsx";

import {
  ORIENTATION_LABEL,
  ORIENTATION_OPTIONS,
  PAPER_LABEL,
  PAPER_OPTIONS,
  PRINT_LABEL,
} from "./PageControls.constants";
import styles from "./PageControls.module.css";
import type { PageControlsProps } from "./PageControls.types";

/**
 * The sheet the cards are printed on, and the button that prints it.
 *
 * Both choices come from the print package's own records, so the preview and
 * the `@page` rule the sheet sets are working from the same numbers: what the
 * reader picks here is the paper that comes out of the printer.
 */
export function PageControls({
  paper,
  onPaperChange,
  orientation,
  onOrientationChange,
  className,
}: PageControlsProps) {
  const handlePrint = () => {
    window.print();
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
      <Button className={styles.print} onPress={handlePrint}>
        {PRINT_LABEL}
      </Button>
    </Box>
  );
}
