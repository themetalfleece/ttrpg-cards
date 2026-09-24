import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { NumberField } from "./NumberField.component";
import type { NumberFieldProps } from "./NumberField.types";

/**
 * The field is controlled and reports an unchecked number, so a story holds
 * the value and the range the way a consumer does. `value` is where it starts.
 */
function ControlledNumberField({
  label,
  value,
  minimum,
  maximum,
  step,
  unit,
  className,
}: Omit<NumberFieldProps, "onValueChange">) {
  const [held, setHeld] = useState(value);

  const handleValueChange = (asked: number) => {
    setHeld(Math.min(Math.max(asked, minimum), maximum));
  };

  return (
    <NumberField
      label={label}
      value={held}
      minimum={minimum}
      maximum={maximum}
      step={step}
      onValueChange={handleValueChange}
      unit={unit}
      className={className}
    />
  );
}

const meta = {
  title: "Primitives/NumberField",
  component: ControlledNumberField,
  args: {
    label: "Width",
    value: 150,
    minimum: 50,
    maximum: 1200,
    step: 0.1,
    unit: "mm",
  },
} satisfies Meta<typeof ControlledNumberField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No unit, for a count rather than a measurement. */
export const WithoutUnit: Story = {
  args: {
    label: "Copies",
    value: 3,
    minimum: 1,
    maximum: 99,
    step: 1,
    unit: undefined,
  },
};

/**
 * Past the range, to show what the field does about it: nothing until the
 * reader has finished, and then it shows what the caller settled on. Type
 * 9000 and leave the field.
 */
export const HeldToItsRange: Story = {
  args: { value: 1200 },
};
