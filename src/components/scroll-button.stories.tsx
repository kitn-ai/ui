import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For } from 'solid-js';
import { ScrollButton } from './scroll-button';
import { ChatContainerRoot, ChatContainerContent } from './chat-container';
import { componentDescription } from '../stories/docs/element-controls';

/**
 * `ScrollButton` reads scroll state from the surrounding `ChatContainerRoot`
 * context, so every story wraps it in a scrollable container. It is hidden
 * (faded out) while pinned to the bottom and appears once you scroll up.
 */
function ScrollDemo(props: { variant?: 'outline' | 'ghost' | 'default'; size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'; class?: string }) {
  return (
    <div class="relative h-64 w-80 overflow-hidden rounded-lg border">
      <ChatContainerRoot class="h-full p-4">
        <ChatContainerContent class="gap-2">
          <For each={Array.from({ length: 20 })}>
            {(_, i) => (
              <div class="rounded-md bg-muted/40 px-3 py-2 text-sm">Message {i() + 1}</div>
            )}
          </For>
        </ChatContainerContent>
        {/* ScrollButton must live INSIDE ChatContainerRoot (it reads that
            context); it's absolutely positioned relative to the outer .relative
            box, so it stays pinned and doesn't scroll with the content. */}
        <div class="absolute inset-x-0 bottom-3 flex justify-center">
          <ScrollButton variant={props.variant} size={props.size} class={props.class} />
        </div>
      </ChatContainerRoot>
    </div>
  );
}

const meta = {
  title: 'Components/Elements/ScrollButton',
  component: ScrollButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A floating "scroll to bottom" button that reads scroll state from the enclosing `ChatContainerRoot`. Render it inside that context; it fades out while pinned to the bottom and reappears once the user scrolls up. Position it with absolute layout and restyle via `variant` / `size`.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'ghost', 'outline'],
      description: 'Underlying button visual emphasis.',
      table: { defaultValue: { summary: 'outline' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon', 'icon-sm'],
      description: 'Underlying button size preset.',
      table: { defaultValue: { summary: 'sm' } },
    },
    class: {
      control: 'text',
      description: 'Additional classes merged onto the button.',
    },
  },
  args: {
    variant: 'outline',
    size: 'sm',
  },
  render: (args) => <ScrollDemo variant={args.variant} size={args.size} class={args.class} />,
} satisfies Meta<typeof ScrollButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ScrollButton, ChatContainerRoot, ChatContainerContent } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: scroll up to reveal the button; tweak `variant`/`size`. */
export const Playground: Story = {
  ...src(`<div class="relative">
  <ChatContainerRoot class="h-full overflow-y-auto">
    <ChatContainerContent>{/* messages */}</ChatContainerContent>
    {/* inside the Root (reads its context); absolutely positioned to stay pinned */}
    <div class="absolute inset-x-0 bottom-3 flex justify-center">
      <ScrollButton />
    </div>
  </ChatContainerRoot>
</div>`),
};

/** Ghost variant overlaid in a chat area (showcase). */
export const Ghost: Story = {
  args: { variant: 'ghost' },
  ...src(`<ScrollButton variant="ghost" />`),
};
