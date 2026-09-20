import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Slider } from "./Slider.component";
import type { SliderProps } from "./Slider.types";

/**
 * The slider is controlled, so a story holds the value the way a consumer
 * does. `value` is where it starts.
 */
function ControlledSlider({
  label,
  value,
  minimum,
  maximum,
  step,
  readout,
  hint,
  className,
}: Omit<SliderProps, "onValueChange">) {
  const [dragged, setDragged] = useState(value);

  return (
    <Slider
      label={label}
      value={dragged}
      minimum={minimum}
      maximum={maximum}
      step={step}
      onValueChange={setDragged}
      readout={readout ?? `${Math.round(dragged * 100)}%`}
      hint={hint}
      className={className}
    />
  );
}

const meta = {
  title: "Primitives/Slider",
  component: ControlledSlider,
  args: {
    label: "Screen size",
    value: 1,
    minimum: 0.6,
    maximum: 3.2,
    step: 0.005,
  },
} satisfies Meta<typeof ControlledSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No readout, for a quantity where the position is the whole story. */
export const WithoutReadout: Story = {
  args: { readout: "" },
};

/** With an aside, for a control that does something other than it appears to. */
export const WithHint: Story = {
  args: {
    hint: "Only changes how large the cards look on screen, never what prints. Hold a card against the screen and drag until the two match.",
  },
};
