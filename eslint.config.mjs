import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

const SOURCE_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.mjs"];
const REACT_FILES = [
  "apps/web/**/*.tsx",
  "features/**/*.tsx",
  "packages/ui/**/*.tsx",
];

/**
 * Import bans keyed by name so each scope can compose the list it needs.
 * `no-restricted-imports` replaces rather than merges its options, so the
 * patterns are assembled here instead of being restated per override.
 */
const IMPORT_BANS = {
  deepParent: {
    group: ["../../*", "../../**"],
    message:
      "No parent-relative imports two or more levels up. Reach for the workspace package or feature instead.",
  },
  packageInternals: {
    group: ["@ttrpg-cards/*/src", "@ttrpg-cards/*/src/*"],
    message:
      "Import a package through its `exports` map (e.g. `@ttrpg-cards/ui/Card`), never through its source path.",
  },
  validationLibrary: {
    group: ["typebox", "typebox/*"],
    message:
      "Import schemas and checks from `@ttrpg-cards/validator`, the single validation surface.",
  },
  uiPrimitives: {
    group: ["radix-ui", "radix-ui/*", "@radix-ui/*"],
    message:
      "Primitives are owned by `@ttrpg-cards/ui`. Compose that package instead.",
  },
  framework: {
    group: ["next", "next/*"],
    message:
      "Only `apps/web` may depend on the framework. Features and packages stay testable without it.",
  },
  app: {
    group: ["@ttrpg-cards/web", "@ttrpg-cards/web/*"],
    message:
      "Dependencies point inward. Nothing may import the app shell.",
  },
  features: {
    group: ["@ttrpg-cards/feature-*"],
    message:
      "Dependencies point inward. A package may not import a feature slice.",
  },
  cardModel: {
    group: ["@ttrpg-cards/card", "@ttrpg-cards/card/*"],
    message:
      "Text is a leaf and knows nothing about cards. The card model depends on it, not the other way round.",
  },
  domainPackages: {
    group: [
      "@ttrpg-cards/card",
      "@ttrpg-cards/card/*",
      "@ttrpg-cards/core",
      "@ttrpg-cards/core/*",
      "@ttrpg-cards/importer",
      "@ttrpg-cards/importer/*",
      "@ttrpg-cards/printer",
      "@ttrpg-cards/printer/*",
      "@ttrpg-cards/srd",
      "@ttrpg-cards/srd/*",
      "@ttrpg-cards/storage",
      "@ttrpg-cards/storage/*",
      "@ttrpg-cards/text",
      "@ttrpg-cards/text/*",
    ],
    message:
      "`apps/web` composes feature slices. Reach domain packages through a `features/*` slice instead.",
  },
};

const BASE_IMPORT_BANS = [
  "deepParent",
  "packageInternals",
  "validationLibrary",
  "uiPrimitives",
  "framework",
  "app",
];

const PACKAGE_IMPORT_BANS = [...BASE_IMPORT_BANS, "features"];

const APP_IMPORT_BANS = [...BASE_IMPORT_BANS, "domainPackages"];

/** Builds a `no-restricted-imports` option set from {@link IMPORT_BANS} keys. */
function restrictImports(keys) {
  return ["error", { patterns: keys.map((key) => IMPORT_BANS[key]) }];
}

/** Returns `keys` with `dropped` removed, for the scope that owns a banned dependency. */
function without(keys, dropped) {
  return keys.filter((key) => !dropped.includes(key));
}

/** Browser storage is reached only through `@ttrpg-cards/storage`. */
const RESTRICTED_STORAGE_GLOBALS = [
  {
    name: "indexedDB",
    message: "Card data is persisted through `@ttrpg-cards/storage`.",
  },
  {
    name: "localStorage",
    message:
      "Small UI preferences are persisted through `@ttrpg-cards/storage`.",
  },
  {
    name: "sessionStorage",
    message:
      "Browser storage is reached only through `@ttrpg-cards/storage`.",
  },
];

const TRANSMISSION_MESSAGE =
  "The app never transmits. Nothing may reach the network.";

/**
 * The transmission ban is enforced, not merely documented. It is the constraint
 * the project exists under, so it gets a rule like every other ownership boundary.
 */
const RESTRICTED_NETWORK_GLOBALS = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
].map((name) => ({ name, message: TRANSMISSION_MESSAGE }));

/**
 * Mirrors `no-restricted-globals` entries onto member access, because
 * `no-restricted-globals` only sees bare identifiers and `window.fetch` is the
 * idiom people reach for first.
 */
function restrictOnGlobalHosts(globals) {
  return ["window", "globalThis"].flatMap((object) =>
    globals.map(({ name, message }) => ({
      object,
      property: name,
      message,
    })),
  );
}

/** The `window.x` / `globalThis.x` forms of the network globals. */
const RESTRICTED_NETWORK_PROPERTIES = restrictOnGlobalHosts(
  RESTRICTED_NETWORK_GLOBALS,
);

/**
 * `no-restricted-properties` matches only a bare identifier as the object, so
 * `window.navigator.sendBeacon` slips past it. Matching the member name on any
 * object catches every chain that reaches these two.
 */
const RESTRICTED_NETWORK_SYNTAX = ["sendBeacon", "serviceWorker"].map(
  (member) => ({
    selector: `MemberExpression[property.name="${member}"]`,
    message: TRANSMISSION_MESSAGE,
  }),
);

/**
 * Builds a `no-restricted-syntax` option set. Like `no-restricted-imports`, this rule
 * replaces rather than merges its options, so a scope or a future style selector added
 * over the top would silently drop the transmission ban. Add selectors *through* this.
 */
function restrictSyntax(...selectors) {
  return ["error", ...RESTRICTED_NETWORK_SYNTAX, ...selectors];
}

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/.turbo/**",
    "**/out/**",
    "**/storybook-static/**",
    "**/coverage/**",
    "**/dist/**",
    "**/next-env.d.ts",
  ]),

  {
    name: "ttrpg-cards/base",
    files: SOURCE_FILES,
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-nested-ternary": "error",
      "no-restricted-globals": [
        "error",
        ...RESTRICTED_STORAGE_GLOBALS,
        ...RESTRICTED_NETWORK_GLOBALS,
      ],
      "no-restricted-imports": restrictImports(BASE_IMPORT_BANS),
      "no-restricted-properties": [
        "error",
        ...restrictOnGlobalHosts(RESTRICTED_STORAGE_GLOBALS),
        ...RESTRICTED_NETWORK_PROPERTIES,
      ],
      "no-restricted-syntax": restrictSyntax(),
      "no-underscore-dangle": [
        "error",
        { enforceInMethodNames: true },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
    },
  },

  {
    name: "ttrpg-cards/react",
    files: REACT_FILES,
    extends: [reactHooks.configs.flat["recommended-latest"]],
  },

  {
    name: "ttrpg-cards/app",
    files: ["apps/web/**/*.ts", "apps/web/**/*.tsx"],
    extends: [nextPlugin.configs["core-web-vitals"]],
    rules: {
      "no-restricted-imports": restrictImports(
        without(APP_IMPORT_BANS, ["framework"]),
      ),
    },
  },

  {
    name: "ttrpg-cards/packages",
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    rules: {
      "no-restricted-imports": restrictImports(PACKAGE_IMPORT_BANS),
    },
  },

  {
    name: "ttrpg-cards/packages/validator",
    files: ["packages/validator/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictImports(
        without(PACKAGE_IMPORT_BANS, ["validationLibrary"]),
      ),
    },
  },

  {
    // The card model is the obvious thing to reach for when a text helper
    // wants context, so the leaf stays a leaf by rule rather than by habit.
    name: "ttrpg-cards/packages/text",
    files: ["packages/text/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictImports([
        ...PACKAGE_IMPORT_BANS,
        "cardModel",
      ]),
    },
  },

  {
    name: "ttrpg-cards/packages/ui",
    files: ["packages/ui/**/*.ts", "packages/ui/**/*.tsx"],
    rules: {
      "no-restricted-imports": restrictImports(
        without(PACKAGE_IMPORT_BANS, ["uiPrimitives"]),
      ),
    },
  },

  {
    // The owning package drops the storage ban only. The transmission ban has no owner
    // and is never relaxed, so it is restated rather than switched off wholesale.
    name: "ttrpg-cards/packages/storage",
    files: ["packages/storage/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...RESTRICTED_NETWORK_GLOBALS,
      ],
      "no-restricted-properties": [
        "error",
        ...RESTRICTED_NETWORK_PROPERTIES,
      ],
    },
  },

  {
    // Build tooling a person runs by hand, never bundled and never shipped.
    // Reporting what it did on stdout is its whole interface, so `no-console`
    // is off here and nowhere else. The transmission ban still applies: these
    // scripts read files that were downloaded by hand, they do not fetch.
    name: "ttrpg-cards/package-scripts",
    files: ["packages/*/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  {
    name: "ttrpg-cards/stories",
    files: ["**/*.stories.ts", "**/*.stories.tsx"],
    extends: [storybook.configs["flat/recommended"]],
  },
]);
