import type { Meta, StoryObj } from "@storybook/react-vite";

import { FilePicker } from "./FilePicker.component";

const meta = {
  title: "Primitives/FilePicker",
  component: FilePicker,
  args: {
    children: "Choose a file",
    accept: ".md,.markdown,.txt",
    onFile: () => {},
  },
} satisfies Meta<typeof FilePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Nothing to choose a file for, so nothing to open. */
export const Disabled: Story = {
  args: { disabled: true },
};
