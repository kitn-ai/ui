import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Message, MessageAvatar, MessageContent, MessageActions } from './message';
import { Button } from '../ui/button';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Pencil } from 'lucide-solid';

const meta = {
  title: 'Components/Message',
  component: Message,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: {
        component: [
          'A horizontal message row that composes an optional `MessageAvatar`, a `MessageContent` body (plain or markdown), and an optional `MessageActions` toolbar.',
          '**When to use:** rendering any chat turn — user or assistant. Use a bubble + right alignment for user turns, and an avatar + transparent content for assistant turns.',
          '**How to use:** wrap the parts in `<Message>`. Add `MessageAvatar` for the speaker, `MessageContent` for the text (set `markdown` to render markdown), and `MessageActions` for hover actions. Layout (alignment, bubble) is controlled via `class`.',
          '**Placement:** inside a `ChatContainer`/scroll region, stacked vertically as the conversation transcript.',
        ].join('\n\n'),
      },
    },
  },
  argTypes: {
    children: {
      control: false,
      description: 'The composed message parts (avatar, content, actions).',
    },
    class: {
      control: 'text',
      description: 'Layout classes — e.g. `flex flex-col items-end` for right-aligned user turns.',
    },
  },
  args: {
    class: '',
  },
  render: (args) => (
    <div class="max-w-2xl">
      <Message {...args}>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <MessageContent>
          I can help with a variety of tasks: answering questions, providing
          information, assisting with coding, and generating creative content.
          What would you like help with today?
        </MessageContent>
      </Message>
    </div>
  ),
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Message, MessageAvatar, MessageContent, MessageActions } from '@kitn-ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — an assistant turn; tweak `class` to change layout. */
export const Playground: Story = {
  ...src(`<Message>
  <MessageAvatar src="" fallback="AI" alt="Assistant" />
  <MessageContent>I can help with a variety of tasks...</MessageContent>
</Message>`),
};

/** A user turn — right-aligned bubble, no avatar. */
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
  ...src(`<Message class="flex flex-col items-end">
  <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
    Hello! How can I help you today?
  </MessageContent>
</Message>`),
};

/** An assistant turn — avatar plus a secondary-background content block. */
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
  ...src(`<Message>
  <MessageAvatar src="" fallback="AI" alt="Assistant" />
  <MessageContent>I can help with a variety of tasks...</MessageContent>
</Message>`),
};

/** Assistant turn with a transparent, flush content block (no bubble). */
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
  ...src(`<Message>
  <MessageAvatar src="" fallback="AI" alt="Assistant" />
  <MessageContent class="bg-transparent p-0">...</MessageContent>
</Message>`),
};

/** User bubble with hover-revealed edit/copy actions. */
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
  ...src(`<Message class="flex flex-col items-end">
  <div class="group flex flex-col items-end gap-1">
    <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
      Can you explain how SolidJS reactivity differs from React hooks?
    </MessageContent>
    <MessageActions class="opacity-0 group-hover:opacity-100">
      <Button variant="ghost" size="icon-sm"><Pencil class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
    </MessageActions>
  </div>
</Message>`),
};

/** Markdown body — set `markdown` on `MessageContent` and pass a markdown string. */
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
  ...src(`<Message>
  <MessageAvatar src="" fallback="AI" alt="Assistant" />
  <MessageContent markdown class="bg-transparent p-0">
    {markdownString}
  </MessageContent>
</Message>`),
};

/** Assistant turn with a hover action row (copy / feedback / regenerate). */
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
  ...src(`<Message>
  <MessageAvatar src="" fallback="AI" alt="Assistant" />
  <div class="group flex w-full flex-col gap-0">
    <MessageContent class="bg-transparent p-0">Here is a response...</MessageContent>
    <MessageActions class="opacity-0 group-hover:opacity-100">
      <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
      <Button variant="ghost" size="icon-sm"><RefreshCw class="size-3.5" /></Button>
    </MessageActions>
  </div>
</Message>`),
};

/** A user + assistant pair showing both layouts together (showcase). */
export const Conversation: Story = {
  render: () => (
    <div class="max-w-2xl space-y-4">
      <Message class="flex flex-col items-end">
        <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
          What is TypeScript?
        </MessageContent>
      </Message>

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
  ...src(`<div class="space-y-4">
  <Message class="flex flex-col items-end">
    <MessageContent class="bg-muted text-primary rounded-3xl px-5 py-2.5">
      What is TypeScript?
    </MessageContent>
  </Message>
  <Message>
    <MessageAvatar src="" fallback="AI" alt="Assistant" />
    <MessageContent markdown class="bg-transparent p-0">{answerMarkdown}</MessageContent>
  </Message>
</div>`),
};
