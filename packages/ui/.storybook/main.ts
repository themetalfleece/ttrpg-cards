import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // The project does not transmit anything; that includes its tooling.
  core: {
    disableTelemetry: true,
  },
};

export default config;
