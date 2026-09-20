// The controls change what is on the page as the reader picks, so this runs
// in the browser.
"use client";

import { Box } from "@ttrpg-cards/ui/Box";
import clsx from "clsx";
import type { CSSProperties } from "react";

import { AttributionNotice } from "./AttributionNotice/AttributionNotice.component";
import { CardControls } from "./CardControls/CardControls.component";
import { CardPage } from "./CardPage/CardPage.component";
import { PageControls } from "./PageControls/PageControls.component";
import { ScreenCalibration } from "./ScreenCalibration/ScreenCalibration.component";
import {
  CATALOG_ATTRIBUTIONS,
  screenScaleStyle,
} from "./CatalogView.data";
import { useCatalogSelection } from "./CatalogView.hooks";
import styles from "./CatalogView.module.css";
import type { CatalogViewProps } from "./CatalogView.types";

/**
 * The bundled catalog laid out on a sheet, with everything about that sheet a
 * reader can change.
 *
 * Picking a colour repaints the cards, picking a card size reflows the sheet,
 * and picking a paper or a way round changes how much of it there is to fill.
 * All of it without a reload, because each is a live property the packages
 * already model and the renderer already reads.
 *
 * The screen scale is set here rather than on the sheet, because it is the
 * whole preview that has to be drawn at it: a reader matching a card they are
 * holding against one on the page is matching the page, not a single card.
 */
export function CatalogView({ className }: CatalogViewProps) {
  const selection = useCatalogSelection();

  // React types `style` as the properties it knows about, so the custom
  // property the stylesheets read needs the assertion.
  const style = screenScaleStyle({
    scale: selection.screenScale,
  }) as CSSProperties;

  return (
    <Box className={clsx(styles.view, className)} style={style}>
      <Box className={styles.chrome}>
        <CardControls
          theme={selection.theme}
          onThemeChange={selection.chooseTheme}
          size={selection.size}
          onSizeChange={selection.chooseSize}
          textSize={selection.textSize}
          onTextSizeChange={selection.chooseTextSize}
        />
        <PageControls
          paper={selection.paper}
          onPaperChange={selection.choosePaper}
          orientation={selection.orientation}
          onOrientationChange={selection.chooseOrientation}
        />
        <ScreenCalibration
          scale={selection.screenScale}
          onScaleChange={selection.chooseScreenScale}
        />
      </Box>
      <CardPage
        cards={selection.cards}
        layout={selection.layout}
        sheet={selection.sheet}
        theme={selection.theme}
      />
      <AttributionNotice attributions={CATALOG_ATTRIBUTIONS} />
    </Box>
  );
}
