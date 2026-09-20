import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextArea } from "./TextArea.component";

const meta = {
  title: "Primitives/TextArea",
  component: TextArea,
  args: {
    label: "Paste a document",
    value: "",
    onValueChange: () => {},
  },
} satisfies Meta<typeof TextArea>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Empty, with a hint at the shape of the answer.
 *
 * The sample is a card a consumer's parser would read, rather than something
 * that only looks like one. Two samples of the same format disagreeing is how
 * one of them quietly comes to advertise a shape nothing accepts.
 */
export const Default: Story = {
  args: {
    placeholder:
      "## Lantern Ward\n\n**Range:** Self\n**Duration:** 1 minute",
  },
};

export const Filled: Story = {
  args: {
    value:
      "## Lantern Ward\n\n**Range:** Self\n**Duration:** 1 minute\n\nIt holds.",
  },
};

/** Short, for a field that sits in a row of controls. */
export const Compact: Story = {
  args: { rows: 3 },
};
