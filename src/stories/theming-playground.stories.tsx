import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { TokenTable } from './docs/theme-tokens';

// Renders in the Solid preview (unlike MDX, which is React) and is embedded
// into the Theming docs page via <Canvas of={...}>.
const meta = {
  title: 'Theming/Playground',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Auto-generated reference of every overridable token. */
export const TokenReference: Story = {
  render: () => <TokenTable />,
  parameters: { docs: { source: { code: '/* override any of these on :root or a scoped parent */', language: 'css' } } },
};
