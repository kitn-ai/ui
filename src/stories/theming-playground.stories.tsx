import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { TokenTable, ThemeEditor } from './docs/theme-tokens';

// These render in the Solid preview (unlike MDX, which is React) and are
// embedded into the Theming docs page via <Canvas of={...}>.
const meta = {
  title: 'Theming/Playground',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Live editor — click a swatch to override a token; the preview re-skins. */
export const LiveEditor: Story = {
  render: () => <ThemeEditor />,
  parameters: { docs: { source: { code: ':root { --color-primary: #7c3aed; /* … */ }', language: 'css' } } },
};

/** Auto-generated reference of every overridable token. */
export const TokenReference: Story = {
  render: () => <TokenTable />,
  parameters: { docs: { source: { code: '/* override any of these on :root or a scoped parent */', language: 'css' } } },
};
