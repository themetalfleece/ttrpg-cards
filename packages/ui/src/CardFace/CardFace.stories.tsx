import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CARD_THEMES,
  CARD_TYPEFACES,
  CardLayout,
} from "@ttrpg-cards/card";
import { Box } from "@ttrpg-cards/ui/Box";
import type { CSSProperties } from "react";

import { CardFace } from "./CardFace.component";
import {
  gearShapedCard,
  manyStatFieldsCard,
  minimalCard,
  unbreakableWordCard,
  longBodyCard,
  longNameCard,
  spellShapedCard,
} from "./CardFace.fixtures";

const defaultLayout = CardLayout.default();

/**
 * The range's floor used as its ceiling, so the face renders at the smallest
 * size the layout allows.
 */
const smallestTypeLayout = defaultLayout.with({
  fontSizeRange: {
    maximumMillimetres:
      defaultLayout.fontSizeRange.minimumMillimetres,
  },
});

/** The two galleries below, laid out in theme values so they hardcode nothing. */
const THEME_GALLERY_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-5)",
  alignItems: "flex-start",
};

const THEME_SWATCH_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};

const THEME_LABEL_STYLE: CSSProperties = {
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--font-size-small)",
};

const meta = {
  title: "Primitives/CardFace",
  component: CardFace,
  args: { layout: defaultLayout },
  argTypes: {
    theme: {
      control: "select",
      options: CARD_THEMES.map((theme) => theme.id),
    },
    typeface: {
      control: "select",
      options: CARD_TYPEFACES.map((typeface) => typeface.id),
    },
  },
} satisfies Meta<typeof CardFace>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SpellShaped: Story = {
  args: { card: spellShapedCard },
};

export const GearShaped: Story = {
  args: { card: gearShapedCard },
};

/**
 * The same card set as small as the layout allows.
 *
 * Body text renders at the top of the range, because until something measures
 * the content there is nothing to scale against. This is what a card of this
 * length wants instead, and what the fitting routine will settle on.
 */
export const SmallestType: Story = {
  args: { card: spellShapedCard, layout: smallestTypeLayout },
};

/** The same card at another size, to show nothing is pinned to the default. */
export const LargerCard: Story = {
  args: {
    card: spellShapedCard,
    layout: defaultLayout.with({
      size: { widthMillimetres: 89, heightMillimetres: 127 },
      margins: {
        topMillimetres: 6,
        rightMillimetres: 6,
        bottomMillimetres: 6,
        leftMillimetres: 6,
      },
    }),
  },
};

/** More stat fields than fit across, so the row wraps to a second one. */
export const WrappedStatBlock: Story = {
  args: { card: manyStatFieldsCard },
};

/** Everything optional left off. */
export const Minimal: Story = {
  args: { card: minimalCard },
};

/** Far more text than the others, which the fitting routine sets smaller. */
export const LongBody: Story = {
  args: { card: longBodyCard },
};

/** Words longer than the card is wide, which have to break to stay inside it. */
export const UnbreakableWords: Story = {
  args: { card: unbreakableWordCard },
};

/**
 * One card of a set, saying where it sits. The indicator shares the heading
 * row with the name and is set smaller, so it costs the card no height.
 */
export const OneOfASet: Story = {
  args: {
    card: spellShapedCard,
    position: { number: 1, total: 2, label: "1/2" },
  },
};

/** One card in a theme of its own, which is all choosing a theme amounts to. */
export const Themed: Story = {
  args: { card: spellShapedCard, theme: "parchment" },
};

/**
 * Every theme the app ships, side by side.
 *
 * Read from the registry rather than written out, so a theme added to it and
 * to the stylesheet appears here with nothing else to do. Storybook names its
 * stories statically, so an export per theme would be the hand-written step
 * the themes exist to avoid.
 *
 * Squint at this, or print it: the themes differ in hue and hold the same
 * shape in luminance, which is the whole of the grayscale rule.
 */
export const Themes: Story = {
  args: { card: spellShapedCard },
  render: (args) => (
    <Box style={THEME_GALLERY_STYLE}>
      {CARD_THEMES.map((theme) => (
        <Box key={theme.id} style={THEME_SWATCH_STYLE}>
          <Box as="span" style={THEME_LABEL_STYLE}>
            {theme.name}
          </Box>
          <CardFace {...args} theme={theme.id} />
        </Box>
      ))}
    </Box>
  ),
};

/**
 * Every pairing of faces the app ships, side by side.
 *
 * Read from the registry for the same reason the themes are. This is the one
 * to look at when picking: a display face is chosen by how the title reads and
 * a body face by how much of the card is left once the prose is set in it, and
 * neither is a decision anyone should make from a specimen sheet.
 */
export const Typefaces: Story = {
  args: { card: spellShapedCard },
  render: (args) => (
    <Box style={THEME_GALLERY_STYLE}>
      {CARD_TYPEFACES.map((typeface) => (
        <Box key={typeface.id} style={THEME_SWATCH_STYLE}>
          <Box as="span" style={THEME_LABEL_STYLE}>
            {typeface.name}
          </Box>
          <CardFace {...args} typeface={typeface.id} />
        </Box>
      ))}
    </Box>
  ),
};

/**
 * A name longer than the band, which steps down until it fits rather than
 * being cut off. Past the smallest step it takes a second line instead.
 */
export const LongName: Story = {
  args: { card: longNameCard },
};
