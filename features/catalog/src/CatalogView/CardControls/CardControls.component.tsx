import { Box } from "@ttrpg-cards/ui/Box";
import { ChoiceGroup } from "@ttrpg-cards/ui/ChoiceGroup";
import clsx from "clsx";

import {
  SIZE_LABEL,
  SIZE_OPTIONS,
  TEXT_SIZE_LABEL,
  TEXT_SIZE_OPTIONS,
  THEME_LABEL,
  THEME_OPTIONS,
  TYPEFACE_LABEL,
  TYPEFACE_OPTIONS,
} from "./CardControls.constants";
import styles from "./CardControls.module.css";
import type { CardControlsProps } from "./CardControls.types";

/**
 * What a reader can change about the cards on the page: their color, the faces
 * they are set in, the size they are cut to, and how large that type is set.
 *
 * Each is a choice the packages already model, so the control offers whatever
 * the registries list and reports a pick. None of them holds state of its own.
 *
 * Size and text size are two controls rather than one, because they are two
 * questions: a larger card holds more, and larger type on the same card holds
 * less, and which trade a reader wants is theirs.
 */
export function CardControls({
  theme,
  onThemeChange,
  typeface,
  onTypefaceChange,
  size,
  onSizeChange,
  textSize,
  onTextSizeChange,
  className,
}: CardControlsProps) {
  return (
    <Box className={clsx(styles.controls, className)}>
      <ChoiceGroup
        label={THEME_LABEL}
        options={THEME_OPTIONS}
        value={theme}
        onValueChange={onThemeChange}
      />
      <ChoiceGroup
        label={TYPEFACE_LABEL}
        options={TYPEFACE_OPTIONS}
        value={typeface}
        onValueChange={onTypefaceChange}
      />
      <ChoiceGroup
        label={SIZE_LABEL}
        options={SIZE_OPTIONS}
        value={size}
        onValueChange={onSizeChange}
      />
      <ChoiceGroup
        label={TEXT_SIZE_LABEL}
        options={TEXT_SIZE_OPTIONS}
        value={textSize}
        onValueChange={onTextSizeChange}
      />
    </Box>
  );
}
