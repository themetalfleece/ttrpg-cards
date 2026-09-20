// The tooltip opens on a pointer and on focus, so it runs in the browser.
"use client";

import clsx from "clsx";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import {
  TOOLTIP_OPEN_DELAY_MILLISECONDS,
  TOOLTIP_SIDE_OFFSET_PIXELS,
} from "./Tooltip.constants";
import styles from "./Tooltip.module.css";
import type { TooltipProps } from "./Tooltip.types";

/**
 * An aside attached to a control, shown when a reader rests on it or tabs to
 * it.
 *
 * For what a control does not say for itself and does not need to say all the
 * time. Anything a reader has to know to use the control at all belongs in the
 * label or beside it, because a tooltip is hover and focus only and a touch
 * reader may never see this one at all.
 *
 * The provider is inside rather than around the app. Radix wants one ancestor
 * so that opening a second tooltip after a first skips the delay, and a lone
 * aside in a row of controls has nothing to coordinate with. Should this ever
 * be several in a row, the provider moves up and this component takes the one
 * above it instead, which is what Radix does when it finds one.
 */
export function Tooltip({
  content,
  children,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={TOOLTIP_OPEN_DELAY_MILLISECONDS}
    >
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={clsx(styles.bubble, className)}
            sideOffset={TOOLTIP_SIDE_OFFSET_PIXELS}
          >
            {content}
            <TooltipPrimitive.Arrow className={styles.arrow} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
