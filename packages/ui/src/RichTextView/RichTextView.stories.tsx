import type { Meta, StoryObj } from "@storybook/react-vite";
import { RichText, TEXT_MARKS } from "@ttrpg-cards/text";

import { RichTextView } from "./RichTextView.component";

const meta = {
  title: "Primitives/RichTextView",
  component: RichTextView,
} satisfies Meta<typeof RichTextView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unmarked: Story = {
  args: { text: RichText.of("Up to one minute, held.") },
};

export const Marked: Story = {
  args: {
    text: [
      { text: "1 reaction", marks: [TEXT_MARKS.strong] },
      { text: ", taken as the light goes out. Held " },
      {
        text: "only while the wick burns",
        marks: [TEXT_MARKS.emphasis],
      },
      { text: "." },
    ],
  },
};

export const BothMarks: Story = {
  args: {
    text: [
      {
        text: "Nothing crosses the line.",
        marks: [TEXT_MARKS.strong, TEXT_MARKS.emphasis],
      },
    ],
  },
};
