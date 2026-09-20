import type {
  CardLayoutPresetName,
  CardTextSizeName,
  CardThemeId,
} from "@ttrpg-cards/card";

/** What a reader can change about the cards on the page, live. */
export interface CardControlsProps {
  /** The colour theme the cards are drawn in. */
  theme: CardThemeId;
  /** Called with the theme the reader picked. */
  onThemeChange: (theme: CardThemeId) => void;
  /** The size the cards are cut to. */
  size: CardLayoutPresetName;
  /** Called with the size the reader picked. */
  onSizeChange: (size: CardLayoutPresetName) => void;
  /** How large the type on those cards is set, everywhere on them. */
  textSize: CardTextSizeName;
  /** Called with the text size the reader picked. */
  onTextSizeChange: (textSize: CardTextSizeName) => void;
  /** Passed through for a consumer that positions the controls. */
  className?: string | undefined;
}
