import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Skeleton } from './skeleton';

const meta: Meta = {
  title: 'UI/Skeleton',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <div class="space-y-3 w-80">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
      <Skeleton class="h-4 w-1/2" />
    </div>
  ),
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
};
