import { CARD_BLOCK_KINDS } from "@ttrpg-cards/card";
import { Box } from "@ttrpg-cards/ui/Box";
import { RichTextView } from "@ttrpg-cards/ui/RichTextView";

import styles from "./BodyBlock.module.css";
import type { BodyBlockProps } from "./BodyBlock.types";

/**
 * One block of a card's body, set out according to its kind.
 *
 * The branch is on what the block is, never on what the card is: a list of
 * effects and a list of contents are the same block and read the same way.
 */
export function BodyBlock({ block }: BodyBlockProps) {
  if (block.kind === CARD_BLOCK_KINDS.list) {
    return (
      <ul className={styles.list}>
        {block.items.map((item, index) => (
          <li key={index} className={styles.listItem}>
            <RichTextView text={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === CARD_BLOCK_KINDS.callout) {
    return (
      <aside className={styles.callout}>
        {block.label !== undefined && (
          <Box as="p" className={styles.calloutLabel}>
            <RichTextView text={block.label} />
          </Box>
        )}
        <Box as="p" className={styles.calloutText}>
          <RichTextView text={block.text} />
        </Box>
      </aside>
    );
  }

  return (
    <Box as="p" className={styles.paragraph}>
      <RichTextView text={block.text} />
    </Box>
  );
}
