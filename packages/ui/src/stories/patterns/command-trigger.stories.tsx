import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import '../../web-components/register/register'; // side effect: registers every kai-* element
import { patternStory } from '../docs/pattern-story';
import html from '../../../../blocks/patterns/command-trigger/command-trigger.html?raw';
import js from '../../../../blocks/patterns/command-trigger/command-trigger.js?raw';

// Patterns: the command trigger, rendered from the exact files `kai add
// command-trigger` writes into a project.

const meta = {
  title: 'Patterns/Command Trigger',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: patternStory(html, js),
  parameters: {
    docs: {
      source: {
        language: 'bash',
        code: 'npx kai add command-trigger',
      },
    },
  },
};
