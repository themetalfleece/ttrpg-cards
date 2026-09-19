import { TEXT_MARKS, type TextMark } from "@ttrpg-cards/text";
import type { ElementType, ReactNode } from "react";

import type { MarkedTextProps } from "./MarkedText.types";

/**
 * The element each mark is set in. Marks carry meaning rather than
 * presentation, so this is where the theme's answer to "what does strong look
 * like" starts. `satisfies` fails the build if a mark arrives without one.
 */
const ELEMENT_BY_MARK = {
  [TEXT_MARKS.strong]: "strong",
  [TEXT_MARKS.emphasis]: "em",
} satisfies Record<TextMark, ElementType>;

/**
 * One run with its marks applied, nested innermost first so a run carrying
 * both is set in both. Canonical runs list their marks in a fixed order, so
 * the same span gives the same markup every time.
 */
export function MarkedText({ run }: MarkedTextProps) {
  const marks = run.marks ?? [];
  let content: ReactNode = run.text;

  for (const mark of marks.toReversed()) {
    // The element varies, so its type is widened past the one tag each mark
    // maps to. `ELEMENT_BY_MARK` is what holds that set to the marks.
    const Element: ElementType = ELEMENT_BY_MARK[mark];
    content = <Element>{content}</Element>;
  }

  return content;
}
