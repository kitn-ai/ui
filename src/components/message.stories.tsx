import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Message, MessageAvatar, MessageContent, MessageActions } from './message';
import { Button } from '../ui/button';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Pencil } from 'lucide-solid';

const meta: Meta = {
  title: 'Components/Message',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const UserMessage: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Message class="flex flex-col items-end">
        <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
          Hello! How can I help you today?
        </MessageContent>
      </Message>
    </div>
  ),
};

export const AssistantMessage: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Message>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <MessageContent>
          I can help with a variety of tasks: answering questions, providing information,
          assisting with coding, generating creative content. What would you like help with today?
        </MessageContent>
      </Message>
    </div>
  ),
};

export const AssistantNoBg: Story = {
  name: 'Assistant (No Background)',
  render: () => (
    <div class="max-w-2xl">
      <Message>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <MessageContent class="bg-transparent p-0">
          I can help with a variety of tasks: answering questions, providing information,
          assisting with coding, generating creative content. What would you like help with today?
        </MessageContent>
      </Message>
    </div>
  ),
};

export const UserAlignedRight: Story = {
  name: 'User (Right-Aligned)',
  render: () => (
    <div class="max-w-2xl">
      <Message class="flex flex-col items-end">
        <div class="group flex flex-col items-end gap-1">
          <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
            Can you explain how SolidJS reactivity differs from React hooks?
          </MessageContent>
          <MessageActions class="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <Pencil class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <Copy class="size-3.5" />
            </Button>
          </MessageActions>
        </div>
      </Message>
    </div>
  ),
};

export const MarkdownMessage: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Message>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <MessageContent markdown class="bg-transparent p-0">
          {`Here's a **bold** statement with some \`inline code\` and a list:

- First item
- Second item
- Third item

And a code block:

\`\`\`typescript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\``}
        </MessageContent>
      </Message>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Message>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <div class="group flex w-full flex-col gap-0">
          <MessageContent class="bg-transparent p-0">
            Here is a response with hover actions below it.
          </MessageContent>
          <MessageActions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <Copy class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <ThumbsUp class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <ThumbsDown class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <RefreshCw class="size-3.5" />
            </Button>
          </MessageActions>
        </div>
      </Message>
    </div>
  ),
};

export const Conversation: Story = {
  render: () => (
    <div class="max-w-2xl space-y-4">
      {/* User — right-aligned, bubble style */}
      <Message class="flex flex-col items-end">
        <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
          What is TypeScript?
        </MessageContent>
      </Message>

      {/* Assistant — left-aligned, no background */}
      <Message>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <div class="group flex w-full flex-col gap-0">
          <MessageContent markdown class="bg-transparent p-0">
            {`**TypeScript** is a strongly typed programming language that builds on JavaScript. It adds optional static type checking and other features like interfaces, enums, and generics.

Key benefits:
- Catches errors at compile time
- Better IDE support and autocompletion
- Makes large codebases more maintainable`}
          </MessageContent>
          <MessageActions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <Copy class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <ThumbsUp class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <ThumbsDown class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full">
              <RefreshCw class="size-3.5" />
            </Button>
          </MessageActions>
        </div>
      </Message>
    </div>
  ),
};
