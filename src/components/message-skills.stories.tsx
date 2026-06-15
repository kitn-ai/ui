import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { MessageSkills } from "./message-skills";
import { Message, MessageContent, MessageActions } from "./message";
import { ChatConfig } from "../primitives/chat-config";
import { Copy, ThumbsUp, ThumbsDown } from "lucide-solid";
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: "SolidJS (advanced)/Components/MessageSkills",
  component: MessageSkills,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      controls: { exclude: ["use:eventListener"] },
      description: componentDescription([
        "A row of small badges that label which **skills** were active when a message was generated.",
        "**When to use:** above an assistant message whose response was shaped by one or more skills (e.g. `Concise`, `ELI5`). Renders nothing when the `skills` array is empty.",
        "**How to use:** pass a `skills` array of `{ id, name }`; each `name` is shown as a badge. Add `class` (e.g. `mb-1`) to space it from the message body.",
        "**Placement:** directly above `MessageContent` inside an assistant `Message`.",
      ]),
    },
  },
  argTypes: {
    skills: {
      control: "object",
      description: "Active skills to display as badges. Each is `{ id, name }`.",
    },
    class: {
      control: "text",
      description: "Extra classes for the badge row container.",
    },
  },
  args: {
    skills: [
      { id: "1", name: "Concise" },
      { id: "2", name: "ELI5" },
    ],
  },
  render: (args) => <MessageSkills {...args} />,
} satisfies Meta<typeof MessageSkills>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { MessageSkills } from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: "tsx" } } },
});

/** Interactive playground — edit the `skills` array to see the badges update. */
export const Playground: Story = {
  ...src(`<MessageSkills skills={[{ id: '1', name: 'Concise' }, { id: '2', name: 'ELI5' }]} />`),
};

/** A single active skill. */
export const SingleSkill: Story = {
  args: { skills: [{ id: "1", name: "Caveman" }] },
  ...src(`<MessageSkills skills={[{ id: '1', name: 'Caveman' }]} />`),
};

/** Several active skills wrap onto multiple lines if needed. */
export const MultipleSkills: Story = {
  args: {
    skills: [
      { id: "1", name: "Concise" },
      { id: "2", name: "ELI5" },
    ],
  },
  ...src(`<MessageSkills
  skills={[
    { id: '1', name: 'Concise' },
    { id: '2', name: 'ELI5' },
  ]}
/>`),
};

/** Empty array — the component renders nothing. */
export const NoSkills: Story = {
  args: { skills: [] },
  ...src(`<MessageSkills skills={[]} />`),
};

/** Composed above an assistant message body (showcase — not driven by controls). */
export const InAssistantMessage: Story = {
  name: "In Assistant Message",
  render: () => (
    <ChatConfig proseSize="sm">
      <div class="max-w-md space-y-4">
        <Message class="flex-col !gap-0">
          <MessageSkills skills={[{ id: "1", name: "Caveman" }]} class="mb-1" />
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            {"Bug in auth middleware. Token expiry check use `<` not `<=`. Fix: update comparison operator in `validateToken()`."}
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button aria-label="Copy message">
              <Copy size={14} />
            </button>
            <button aria-label="Good response">
              <ThumbsUp size={14} />
            </button>
            <button aria-label="Bad response">
              <ThumbsDown size={14} />
            </button>
          </MessageActions>
        </Message>

        <Message class="flex-col !gap-0">
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            The authentication middleware validates JWT tokens by checking the
            expiration timestamp. There's a bug in the comparison operator that
            causes tokens to be accepted even when they've just expired.
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button aria-label="Copy message">
              <Copy size={14} />
            </button>
            <button aria-label="Good response">
              <ThumbsUp size={14} />
            </button>
            <button aria-label="Bad response">
              <ThumbsDown size={14} />
            </button>
          </MessageActions>
        </Message>
      </div>
    </ChatConfig>
  ),
  ...src(`<Message class="flex-col !gap-0">
  <MessageSkills skills={[{ id: '1', name: 'Caveman' }]} class="mb-1" />
  <MessageContent markdown class="bg-transparent p-0 pt-1.5">
    {assistantText}
  </MessageContent>
</Message>`),
};

/** Skills across a multi-turn flow (showcase). */
export const InConversation: Story = {
  name: "In Conversation Flow",
  render: () => (
    <ChatConfig proseSize="sm">
      <div class="max-w-md space-y-4">
        <Message class="group flex-col items-end !gap-0">
          <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
            What is the main topic of this video?
          </MessageContent>
        </Message>

        <Message class="flex-col !gap-0">
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            The video covers advanced React patterns including compound
            components, render props, and custom hooks for state management.
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button aria-label="Copy message"><Copy size={14} /></button>
          </MessageActions>
        </Message>

        <Message class="group flex-col items-end !gap-0">
          <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
            Can you explain that more simply?
          </MessageContent>
        </Message>

        <Message class="flex-col !gap-0">
          <MessageSkills skills={[{ id: "1", name: "ELI5" }]} class="mb-1" />
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            Think of React patterns like different ways to build with LEGO.
            Some ways make it easier to change pieces later, some ways make
            it easier to share pieces between different builds.
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button aria-label="Copy message"><Copy size={14} /></button>
          </MessageActions>
        </Message>

        <Message class="group flex-col items-end !gap-0">
          <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
            Now give me the technical details
          </MessageContent>
        </Message>

        <Message class="flex-col !gap-0">
          <MessageSkills
            skills={[
              { id: "1", name: "Detailed" },
              { id: "2", name: "Concise" },
            ]}
            class="mb-1"
          />
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            {`**Compound Components**: Share implicit state via React Context. Parent owns state, children consume it.

**Render Props**: Pass a function as a prop that returns JSX. Enables inversion of control.

**Custom Hooks**: Extract stateful logic into reusable functions prefixed with \`use\`.`}
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button aria-label="Copy message"><Copy size={14} /></button>
          </MessageActions>
        </Message>
      </div>
    </ChatConfig>
  ),
  ...src(`<Message class="flex-col !gap-0">
  <MessageSkills skills={[{ id: '1', name: 'Detailed' }, { id: '2', name: 'Concise' }]} class="mb-1" />
  <MessageContent markdown class="bg-transparent p-0 pt-1.5">
    {assistantText}
  </MessageContent>
</Message>`),
};
