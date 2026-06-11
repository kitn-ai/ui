// src/stories/theme-editor.stories.tsx
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { ThemeEditor } from './docs/theme-editor/theme-editor';

const meta = {
  title: 'Theming/Editor',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Full-screen live theme editor. */
export const Editor: Story = {
  render: () => <ThemeEditor />,
};
