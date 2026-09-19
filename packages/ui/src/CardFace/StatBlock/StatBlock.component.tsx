import { Box } from "@ttrpg-cards/ui/Box";
import { RichTextView } from "@ttrpg-cards/ui/RichTextView";

import styles from "./StatBlock.module.css";
import type { StatBlockProps } from "./StatBlock.types";

/**
 * The stat block, set as running text: label then value, field after field,
 * wrapping when the line runs out.
 *
 * Running text rather than a row of cells because how many fields a card
 * carries and how long each one is are the card's business. A short stat block
 * takes one line and a long one takes three, and neither has to agree with a
 * column width chosen before either was read.
 *
 * The fields are whatever the card carries: nothing here knows what kind of
 * card it is on, which is why one component sets out a casting time and a
 * carried weight alike.
 *
 * The space between a label and its value is a real space rather than a
 * margin. A margin is a gap the eye sees and the line breaker does not, so a
 * label and value set with one are a single unbreakable word that runs off the
 * edge of the card instead of wrapping.
 */
export function StatBlock({ fields }: StatBlockProps) {
  return (
    <dl className={styles.statBlock}>
      {fields.map((field, index) => (
        <Box key={index} className={styles.statField}>
          <dt className={styles.statLabel}>
            <RichTextView text={field.label} />
          </dt>{" "}
          <dd className={styles.statValue}>
            <RichTextView text={field.value} />
          </dd>
        </Box>
      ))}
    </dl>
  );
}
