import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button.component";

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Print", onPress: () => {} },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Nothing to do, so nothing to press. */
export const Disabled: Story = {
  args: { disabled: true },
};
