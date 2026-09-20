import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ChoiceGroup } from "./ChoiceGroup.component";
import type { ChoiceGroupProps } from "./ChoiceGroup.types";

/**
 * The group is controlled, so a story holds the pick the way a consumer does.
 * `value` is what it starts on.
 */
function ControlledChoiceGroup({
  label,
  options,
  value,
  className,
}: Omit<ChoiceGroupProps<string>, "onValueChange">) {
  const [picked, setPicked] = useState(value);

  return (
    <ChoiceGroup
      label={label}
      options={options}
      value={picked}
      onValueChange={setPicked}
      className={className}
    />
  );
}

const meta = {
  title: "Primitives/ChoiceGroup",
  component: ControlledChoiceGroup,
} satisfies Meta<typeof ControlledChoiceGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two choices, which is the shortest set worth a segmented control. */
export const Default: Story = {
  args: {
    label: "Orientation",
    value: "portrait",
    options: [
      { value: "portrait", label: "Portrait" },
      { value: "landscape", label: "Landscape" },
    ],
  },
};

/** Enough choices to wrap, which is what the track does rather than scroll. */
export const ManyOptions: Story = {
  args: {
    label: "Weight",
    value: "regular",
    options: [
      { value: "thin", label: "Thin" },
      { value: "light", label: "Light" },
      { value: "regular", label: "Regular" },
      { value: "medium", label: "Medium" },
      { value: "bold", label: "Bold" },
      { value: "black", label: "Black" },
    ],
  },
};
