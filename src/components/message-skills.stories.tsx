import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { MessageSkills } from "./message-skills";
import { Message, MessageAvatar, MessageContent, MessageActions } from "./message";
import { ChatConfig } from "../primitives/chat-config";
import { Copy, ThumbsUp, ThumbsDown } from "lucide-solid";

const meta: Meta = {
  title: "Components/MessageSkills",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

export const SingleSkill: Story = {
  render: () => (
    <div class="max-w-2xl">
      <MessageSkills skills={[{ id: "1", name: "Caveman" }]} />
    </div>
  ),
};

export const MultipleSkills: Story = {
  render: () => (
    <div class="max-w-2xl">
      <MessageSkills
        skills={[
          { id: "1", name: "Concise" },
          { id: "2", name: "ELI5" },
        ]}
      />
    </div>
  ),
};

export const NoSkills: Story = {
  render: () => (
    <div class="max-w-2xl">
      <MessageSkills skills={[]} />
    </div>
  ),
};

export const InAssistantMessage: Story = {
  name: "In Assistant Message",
  render: () => (
    <ChatConfig proseSize="sm">
      <div class="max-w-md space-y-4">
        {/* Assistant message with skills */}
        <Message class="flex-col !gap-0">
          <MessageSkills
            skills={[{ id: "1", name: "Caveman" }]}
            class="mb-1"
          />
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            {"Bug in auth middleware. Token expiry check use `<` not `<=`. Fix: update comparison operator in `validateToken()`."}
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button>
              <Copy size={14} />
            </button>
            <button>
              <ThumbsUp size={14} />
            </button>
            <button>
              <ThumbsDown size={14} />
            </button>
          </MessageActions>
        </Message>

        {/* Assistant message without skills */}
        <Message class="flex-col !gap-0">
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            The authentication middleware validates JWT tokens by checking the
            expiration timestamp. There's a bug in the comparison operator that
            causes tokens to be accepted even when they've just expired.
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button>
              <Copy size={14} />
            </button>
            <button>
              <ThumbsUp size={14} />
            </button>
            <button>
              <ThumbsDown size={14} />
            </button>
          </MessageActions>
        </Message>
      </div>
    </ChatConfig>
  ),
};

export const InConversation: Story = {
  name: "In Conversation Flow",
  render: () => (
    <ChatConfig proseSize="sm">
      <div class="max-w-md space-y-4">
        {/* User message */}
        <Message class="group flex-col items-end !gap-0">
          <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
            What is the main topic of this video?
          </MessageContent>
        </Message>

        {/* Assistant — no skills */}
        <Message class="flex-col !gap-0">
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            The video covers advanced React patterns including compound
            components, render props, and custom hooks for state management.
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button><Copy size={14} /></button>
          </MessageActions>
        </Message>

        {/* User message */}
        <Message class="group flex-col items-end !gap-0">
          <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
            Can you explain that more simply?
          </MessageContent>
        </Message>

        {/* Assistant — with ELI5 skill */}
        <Message class="flex-col !gap-0">
          <MessageSkills
            skills={[{ id: "1", name: "ELI5" }]}
            class="mb-1"
          />
          <MessageContent markdown class="bg-transparent p-0 pt-1.5">
            Think of React patterns like different ways to build with LEGO.
            Some ways make it easier to change pieces later, some ways make
            it easier to share pieces between different builds.
          </MessageContent>
          <MessageActions class="[&>button]:p-1 [&>button]:rounded [&>button]:text-foreground/60 [&>button]:hover:text-foreground [&>button]:transition-colors">
            <button><Copy size={14} /></button>
          </MessageActions>
        </Message>

        {/* User message */}
        <Message class="group flex-col items-end !gap-0">
          <MessageContent class="bg-muted text-primary max-w-[85%] rounded-xl px-4 py-2 mr-1">
            Now give me the technical details
          </MessageContent>
        </Message>

        {/* Assistant — with Detailed + Concise */}
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
            <button><Copy size={14} /></button>
          </MessageActions>
        </Message>
      </div>
    </ChatConfig>
  ),
};
