import type { Meta, StoryObj } from "@storybook/react-vite";

import { Box } from "./Box.component";

const meta = {
  title: "Primitives/Box",
  component: Box,
} satisfies Meta<typeof Box>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "A div, which is what a Box is by default." },
};

export const AsParagraph: Story = {
  args: {
    as: "p",
    children: "A paragraph, for a block of prose.",
  },
};

export const AsSpan: Story = {
  args: { as: "span", children: "A span, for a run inside a line." },
};
