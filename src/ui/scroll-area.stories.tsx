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
        'A vertically scrollable container with thin, themed scrollbars (`scrollbar-thin` + muted thumb, transparent track). A thin styling layer over native overflow — no custom scroll hijacking, so momentum, keyboard, and accessibility behave exactly like the platform expects. Constrain it with a height (or let a flex parent bound it) and overflow content scrolls.',
        '**When to use:** any bounded region whose content can exceed its height — the conversation/history sidebar, a long menu, a tall card body.',
        '**How to use:** set a height via `class` and drop the scrollable content inside. All other div props (e.g. `aria-label`) are forwarded.',
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
