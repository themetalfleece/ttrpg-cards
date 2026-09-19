import type { Meta, StoryObj } from "@storybook/react-vite";
import { CardLayout } from "@ttrpg-cards/card";

import { CardFace } from "./CardFace.component";
import {
  gearShapedCard,
  manyStatFieldsCard,
  minimalCard,
  unbreakableWordCard,
  longBodyCard,
  spellShapedCard,
} from "./CardFace.fixtures";

const defaultLayout = CardLayout.default();

/**
 * The range's floor used as its ceiling, so the face renders at the smallest
 * size the layout allows.
 */
const smallestTypeLayout = defaultLayout.with({
  fontSizeRange: {
    maximumMillimetres:
      defaultLayout.fontSizeRange.minimumMillimetres,
  },
});

const meta = {
  title: "Primitives/CardFace",
  component: CardFace,
  args: { layout: defaultLayout },
} satisfies Meta<typeof CardFace>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SpellShaped: Story = {
  args: { card: spellShapedCard },
};

export const GearShaped: Story = {
  args: { card: gearShapedCard },
};

/**
 * The same card set as small as the layout allows.
 *
 * Body text renders at the top of the range, because until something measures
 * the content there is nothing to scale against. This is what a card of this
 * length wants instead, and what the fitting routine will settle on.
 */
export const SmallestType: Story = {
  args: { card: spellShapedCard, layout: smallestTypeLayout },
};

/** The same card at another size, to show nothing is pinned to the default. */
export const LargerCard: Story = {
  args: {
    card: spellShapedCard,
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

/** More stat fields than fit across, so the row wraps to a second one. */
export const WrappedStatBlock: Story = {
  args: { card: manyStatFieldsCard },
};

/** Everything optional left off. */
export const Minimal: Story = {
  args: { card: minimalCard },
};

/** Far more text than the others, which the fitting routine sets smaller. */
export const LongBody: Story = {
  args: { card: longBodyCard },
};

/** Words longer than the card is wide, which have to break to stay inside it. */
export const UnbreakableWords: Story = {
  args: { card: unbreakableWordCard },
};
