import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For } from 'solid-js';
import { ScrollArea } from './scroll-area';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A bounded container with thin, themed scrollbars over native overflow (no scroll hijacking). Set a height via `class`; overflowing content scrolls.',
      ]),
    },
  },
  render: () => (
    <ScrollArea class="h-56 w-72 rounded-lg border border-border p-2">
      <ul class="space-y-1">
        <For each={Array.from({ length: 24 }, (_, i) => i + 1)}>
          {(n) => (
            <li class="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted">
              Conversation {n}
            </li>
          )}
        </For>
      </ul>
    </ScrollArea>
  ),
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ScrollArea } from '@kitn.ai/ui';`;

/** A bounded list that scrolls. Note macOS hides overlay scrollbars until you scroll. */
export const Playground: Story = {
  parameters: {
    docs: {
      source: {
        code: `${IMPORT}
import { For } from 'solid-js';

const conversations = Array.from({ length: 24 }, (_, i) => \`Conversation \${i + 1}\`);

<ScrollArea class="h-56 w-72 rounded-lg border p-2">
  <ul class="space-y-1">
    <For each={conversations}>
      {(title) => (
        <li class="rounded-md px-3 py-2 text-sm hover:bg-muted">{title}</li>
      )}
    </For>
  </ul>
</ScrollArea>`,
        language: 'tsx',
      },
    },
  },
};
