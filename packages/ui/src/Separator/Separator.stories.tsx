import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@ttrpg-cards/ui/Box";

import { Separator } from "./Separator.component";

const meta = {
  title: "Primitives/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <Box>
      <Box as="p">Above the rule.</Box>
      <Separator {...args} />
      <Box as="p">Below the rule.</Box>
    </Box>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <Box
      style={{
        display: "flex",
        gap: "var(--space-3)",
        height: "var(--space-6)",
      }}
    >
      <Box as="span">Left of the rule.</Box>
      <Separator {...args} />
      <Box as="span">Right of the rule.</Box>
    </Box>
  ),
};
