import { Box } from "@ttrpg-cards/ui/Box";
import { RichTextView } from "@ttrpg-cards/ui/RichTextView";
import clsx from "clsx";
import { useRef, type CSSProperties } from "react";

import {
  opensRow,
  statBlockStyle,
  stripColumns,
} from "./StatBlock.data";
import { useFittedLabelScale } from "./StatBlock.hooks";
import styles from "./StatBlock.module.css";
import type { StatBlockProps } from "./StatBlock.types";

/**
 * The stat block, set as a strip of equal cells: a label in small caps over
 * its value, cell after cell, separated by rules.
 *
 * Cells rather than running text because a reader looking for one field is
 * looking in a place, and a strip puts every field in the same place on every
 * card. A value too long for its cell wraps inside it and the strip grows
 * taller; nothing is ever shortened to make a row fit, because a card that
 * understates what it says is worse than one line less body.
 *
 * The fields are whatever the card carries: nothing here knows what kind of
 * card it is on, which is why one component sets out a casting time and a
 * carried weight alike.
 *
 * The labels step down to fit their cells, which is measured here rather than
 * by the card. That also settles the order the card is put together in: a
 * child's effects run before its parent's, so the labels have taken their step
 * by the time the card is fitted against the room the strip leaves.
 */
export function StatBlock({ fields, typeface }: StatBlockProps) {
  const stripRef = useRef<HTMLDListElement>(null);
  const columns = stripColumns(fields.length);
  // React types `style` as the properties it knows about, so the custom
  // property the stylesheet reads needs the assertion.
  const style = statBlockStyle({ columns }) as CSSProperties;

  useFittedLabelScale({ fields, typeface, stripRef });

  return (
    <dl ref={stripRef} className={styles.statBlock} style={style}>
      {fields.map((field, index) => (
        <Box
          key={index}
          className={clsx(
            styles.statField,
            opensRow({ index, columns }) && styles.statFieldRowStart,
          )}
        >
          <dt className={styles.statLabel}>
            <RichTextView text={field.label} />
          </dt>
          <dd className={styles.statValue}>
            <RichTextView text={field.value} />
          </dd>
        </Box>
      ))}
    </dl>
  );
}
