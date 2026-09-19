import type { Meta, StoryObj } from "@storybook/react-vite";
import { CardLayout } from "@ttrpg-cards/card";

import { CardSetView } from "./CardSetView.component";
import { overflowingCard, settledCard } from "./CardSetView.fixtures";

const defaultLayout = CardLayout.default();

const meta = {
  title: "Primitives/CardSetView",
  component: CardSetView,
  args: { layout: defaultLayout },
} satisfies Meta<typeof CardSetView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** An entry that fits: one card, and no indicator on it. */
export const Settled: Story = {
  args: { card: settledCard },
};

/**
 * More than a card holds at the smallest type the layout allows, so it runs
 * onto a second. The continuation carries the name, `2/2` and the rest of the
 * text, and no second copy of the stat block.
 */
export const Overflowing: Story = {
  args: { card: overflowingCard },
};

/** The same entry on a card cut smaller, which moves the split by itself. */
export const SmallerCard: Story = {
  args: {
    card: overflowingCard,
    layout: defaultLayout.with({
      size: { widthMillimetres: 44, heightMillimetres: 62 },
      margins: {
        topMillimetres: 3,
        rightMillimetres: 3,
        bottomMillimetres: 3,
        leftMillimetres: 3,
      },
    }),
  },
};

/** The same entry on a larger card, which it fits on with room to spare. */
export const LargerCard: Story = {
  args: {
    card: overflowingCard,
    layout: defaultLayout.with({
      size: { widthMillimetres: 89, heightMillimetres: 127 },
      margins: {
        topMillimetres: 6,
        rightMillimetres: 6,
        bottomMillimetres: 6,
        leftMillimetres: 6,
      },
    }),
  },
};
