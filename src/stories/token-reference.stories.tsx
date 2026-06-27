import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { TokenTable } from './docs/theme-tokens';

// Renders in the Solid preview (unlike MDX, which is React): an auto-generated
// reference of every overridable theme token, shown under Getting Started.
const meta = {
  title: 'Getting Started/Token Reference',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Auto-generated reference of every overridable token. */
export const TokenReference: Story = {
  render: () => <TokenTable />,
  parameters: { docs: { source: { code: '/* override any of these on :root or a scoped parent */', language: 'css' } } },
};
