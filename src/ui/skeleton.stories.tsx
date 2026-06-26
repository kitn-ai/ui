import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Skeleton } from './skeleton';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A pulsing **placeholder** block used to indicate loading content. It has no shape of its own — size and rounding come from the `class` you pass.',
        '**When to use:** while content (messages, lists, cards, tool output) is loading, to preserve layout and signal progress without a spinner.',
        '**How to use:** compose one or more `Skeleton` elements and set width/height/rounding via utility classes (e.g. `class="h-4 w-3/4"`). Build skeletons that mirror the real layout they replace.',
        '**Placement:** message bubbles, conversation lists, code blocks, tool calls, input areas, and full-page loading states.',
      ]),
    },
  },
  argTypes: {
    class: {
      control: 'text',
      description: 'Utility classes that set the size and rounding of the placeholder.',
    },
  },
  args: {
    class: 'h-4 w-64',
  },
  render: (args) => <Skeleton {...args} />,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Skeleton } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — edit `class` to resize the placeholder. */
export const Playground: Story = {
  ...src(`<Skeleton class="h-4 w-64" />`),
};

export const Basic: Story = {
  render: () => (
    <div class="space-y-3 w-80">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
      <Skeleton class="h-4 w-1/2" />
    </div>
  ),
  ...src(`<div class="space-y-3 w-80">
  <Skeleton class="h-4 w-full" />
  <Skeleton class="h-4 w-3/4" />
  <Skeleton class="h-4 w-1/2" />
</div>`),
};

export const MessageBubble: Story = {
  name: 'Message Bubble',
  render: () => (
    <div class="space-y-6 w-full max-w-2xl">
      {/* User message skeleton */}
      <div class="flex justify-end">
        <Skeleton class="h-12 w-64 rounded-3xl" />
      </div>

      {/* Assistant message skeleton */}
      <div class="flex gap-3 items-start">
        <Skeleton class="h-8 w-8 rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-5/6" />
          <Skeleton class="h-4 w-2/3" />
        </div>
      </div>
    </div>
  ),
  ...src(`<div class="space-y-6 w-full max-w-2xl">
  <div class="flex justify-end">
    <Skeleton class="h-12 w-64 rounded-3xl" />
  </div>
  <div class="flex gap-3 items-start">
    <Skeleton class="h-8 w-8 rounded-full shrink-0" />
    <div class="flex-1 space-y-2">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-5/6" />
      <Skeleton class="h-4 w-2/3" />
    </div>
  </div>
</div>`),
};

export const MessageWithCode: Story = {
  name: 'Message with Code Block',
  render: () => (
    <div class="flex gap-3 items-start w-full max-w-2xl">
      <Skeleton class="h-8 w-8 rounded-full shrink-0" />
      <div class="flex-1 space-y-3">
        <div class="space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-4/5" />
        </div>
        {/* Code block skeleton */}
        <Skeleton class="h-32 w-full rounded-xl" />
        <div class="space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-3/5" />
        </div>
      </div>
    </div>
  ),
  ...src(`<div class="flex gap-3 items-start w-full max-w-2xl">
  <Skeleton class="h-8 w-8 rounded-full shrink-0" />
  <div class="flex-1 space-y-3">
    <div class="space-y-2">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-4/5" />
    </div>
    <Skeleton class="h-32 w-full rounded-xl" />
    <div class="space-y-2">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/5" />
    </div>
  </div>
</div>`),
};

export const ConversationList: Story = {
  name: 'Conversation List',
  render: () => (
    <div class="w-64 space-y-1">
      {/* Section header */}
      <Skeleton class="h-3 w-12 mb-2" />
      {[1, 2, 3].map(() => (
        <div class="flex items-center gap-2 px-2 py-2">
          <Skeleton class="h-4 w-4 rounded shrink-0" />
          <Skeleton class="h-4 flex-1" />
        </div>
      ))}
      {/* Section header */}
      <Skeleton class="h-3 w-16 mt-4 mb-2" />
      {[1, 2].map(() => (
        <div class="flex items-center gap-2 px-2 py-2">
          <Skeleton class="h-4 w-4 rounded shrink-0" />
          <Skeleton class="h-4 flex-1" />
        </div>
      ))}
    </div>
  ),
  ...src(`<div class="w-64 space-y-1">
  <Skeleton class="h-3 w-12 mb-2" />
  {[1, 2, 3].map(() => (
    <div class="flex items-center gap-2 px-2 py-2">
      <Skeleton class="h-4 w-4 rounded shrink-0" />
      <Skeleton class="h-4 flex-1" />
    </div>
  ))}
</div>`),
};

export const ToolCall: Story = {
  name: 'Tool Call',
  render: () => (
    <div class="w-full max-w-2xl">
      <div class="border border-border rounded-xl overflow-hidden">
        {/* Tool header */}
        <div class="flex items-center gap-2 px-3 py-2.5">
          <Skeleton class="h-4 w-4 rounded-full" />
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-5 w-20 rounded-full" />
        </div>
        {/* Tool body */}
        <div class="border-t border-border p-3 space-y-3">
          <div>
            <Skeleton class="h-3 w-10 mb-2" />
            <Skeleton class="h-20 w-full rounded" />
          </div>
          <div>
            <Skeleton class="h-3 w-12 mb-2" />
            <Skeleton class="h-16 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  ),
  ...src(`<div class="w-full max-w-2xl">
  <div class="border border-border rounded-xl overflow-hidden">
    <div class="flex items-center gap-2 px-3 py-2.5">
      <Skeleton class="h-4 w-4 rounded-full" />
      <Skeleton class="h-4 w-32" />
      <Skeleton class="h-5 w-20 rounded-full" />
    </div>
    <div class="border-t border-border p-3 space-y-3">
      <Skeleton class="h-3 w-10 mb-2" />
      <Skeleton class="h-20 w-full rounded" />
    </div>
  </div>
</div>`),
};

export const Card: Story = {
  name: 'Content Card',
  render: () => (
    <div class="w-72">
      <Skeleton class="h-40 w-full rounded-xl mb-3" />
      <div class="flex gap-3">
        <Skeleton class="h-8 w-8 rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-3 w-24" />
          <Skeleton class="h-3 w-32" />
        </div>
      </div>
    </div>
  ),
  ...src(`<div class="w-72">
  <Skeleton class="h-40 w-full rounded-xl mb-3" />
  <div class="flex gap-3">
    <Skeleton class="h-8 w-8 rounded-full shrink-0" />
    <div class="flex-1 space-y-2">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-3 w-24" />
      <Skeleton class="h-3 w-32" />
    </div>
  </div>
</div>`),
};

export const InputArea: Story = {
  name: 'Input Area',
  render: () => (
    <div class="w-full max-w-2xl">
      <div class="border border-border rounded-2xl p-3 space-y-3">
        <Skeleton class="h-10 w-full rounded-lg" />
        <div class="flex items-center justify-between">
          <div class="flex gap-2">
            <Skeleton class="h-8 w-8 rounded-full" />
            <Skeleton class="h-8 w-8 rounded-full" />
            <Skeleton class="h-8 w-8 rounded-full" />
          </div>
          <Skeleton class="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  ),
  ...src(`<div class="w-full max-w-2xl">
  <div class="border border-border rounded-2xl p-3 space-y-3">
    <Skeleton class="h-10 w-full rounded-lg" />
    <div class="flex items-center justify-between">
      <div class="flex gap-2">
        <Skeleton class="h-8 w-8 rounded-full" />
        <Skeleton class="h-8 w-8 rounded-full" />
        <Skeleton class="h-8 w-8 rounded-full" />
      </div>
      <Skeleton class="h-8 w-8 rounded-full" />
    </div>
  </div>
</div>`),
};

export const FullChat: Story = {
  name: 'Full Chat Layout',
  render: () => (
    <div class="flex w-full max-w-4xl h-96 border border-border rounded-xl overflow-hidden">
      {/* Sidebar */}
      <div class="w-56 border-r border-border p-3 space-y-3 shrink-0">
        <Skeleton class="h-8 w-full rounded-lg" />
        <div class="space-y-1 mt-4">
          <Skeleton class="h-3 w-12 mb-2" />
          {[1, 2, 3].map(() => (
            <Skeleton class="h-8 w-full rounded-lg" />
          ))}
          <Skeleton class="h-3 w-16 mt-3 mb-2" />
          {[1, 2].map(() => (
            <Skeleton class="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main */}
      <div class="flex-1 flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <Skeleton class="h-4 w-48" />
          <div class="flex gap-2">
            <Skeleton class="h-8 w-28 rounded-lg" />
            <Skeleton class="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Messages */}
        <div class="flex-1 p-4 space-y-6 overflow-hidden">
          <div class="flex justify-end">
            <Skeleton class="h-10 w-52 rounded-3xl" />
          </div>
          <div class="flex gap-3 items-start">
            <Skeleton class="h-8 w-8 rounded-full shrink-0" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-5/6" />
              <Skeleton class="h-4 w-2/3" />
            </div>
          </div>
        </div>

        {/* Input */}
        <div class="p-3">
          <Skeleton class="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  ),
  ...src(`<div class="flex w-full max-w-4xl h-96 border rounded-xl overflow-hidden">
  <div class="w-56 border-r p-3 space-y-3 shrink-0">
    <Skeleton class="h-8 w-full rounded-lg" />
  </div>
  <div class="flex-1 flex flex-col">
    <div class="flex-1 p-4 space-y-6">
      <div class="flex gap-3 items-start">
        <Skeleton class="h-8 w-8 rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-5/6" />
        </div>
      </div>
    </div>
    <div class="p-3">
      <Skeleton class="h-14 w-full rounded-2xl" />
    </div>
  </div>
</div>`),
};
