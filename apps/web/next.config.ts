import type { NextConfig } from "next";

/**
 * Static export: `next build` writes a self-contained `out/` directory and the
 * app never runs a server, so no route may depend on request-time behaviour.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@ttrpg-cards/card",
    "@ttrpg-cards/core",
    "@ttrpg-cards/feature-catalog",
    "@ttrpg-cards/importer",
    "@ttrpg-cards/printer",
    "@ttrpg-cards/srd",
    "@ttrpg-cards/storage",
    "@ttrpg-cards/text",
    "@ttrpg-cards/ui",
    "@ttrpg-cards/validator",
  ],
};

export default nextConfig;
