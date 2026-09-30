import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import '../../web-components/register/register'; // side effect: registers every kai-* element
import { patternStory } from '../docs/pattern-story';
import html from '../../../../blocks/patterns/conversation-rail/conversation-rail.html?raw';
import js from '../../../../blocks/patterns/conversation-rail/conversation-rail.js?raw';

// Patterns: the conversation rail, rendered from the exact files `kai add
// conversation-rail` writes into a project.

const meta = {
  title: 'Patterns/Conversation Rail',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: patternStory(html, js),
  parameters: {
    docs: {
      source: {
        language: 'bash',
        code: 'npx kai add conversation-rail',
      },
    },
  },
};
