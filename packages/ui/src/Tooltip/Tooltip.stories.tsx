import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tooltip } from "./Tooltip.component";

const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  args: {
    content:
      "Only changes how large the cards look on screen, never what prints.",
    // A plain element rather than one of the primitives here: the trigger is
    // cloned and handed a ref, and nothing in this package forwards one.
    children: <button type="button">Rest on me or tab to me</button>,
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Long enough to wrap, which is what the cap on the bubble is for. */
export const Wrapping: Story = {
  args: {
    content:
      "Only changes how large the cards look on screen, never what prints. Hold a card against the screen and drag until the two match.",
  },
};
