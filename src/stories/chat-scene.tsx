import { createSignal, Show, For } from "solid-js";
import {
  ChatContainer,
  ChatContainerContent,
  ChatContainerScrollAnchor,
  Message,
  MessageAvatar,
  MessageContent,
  MessageActions,
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  ConversationList,
  ModelSwitcher,
  PromptSuggestion,
  ScrollButton,
  Button,
  Separator,
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  Tool,
  ThinkingBar,
  ChatConfig,
} from "../index";
import type { ProseSize } from "../index";
import type {
  ConversationSummary,
  ConversationGroup,
  ModelOption,
} from "../types";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "../components/attachments";
import type { AttachmentData } from "../components/attachments";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable";
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ArrowUp,
  Paperclip,
  Globe,
  Mic,
  Pencil,
  Trash,
  Plus,
  MoreHorizontal,
} from "lucide-solid";

const scope = { type: "document" as const };

const groups: ConversationGroup[] = [
  { id: "today", name: "Today", sortOrder: 0, createdAt: "2026-04-10" },
  { id: "yesterday", name: "Yesterday", sortOrder: 1, createdAt: "2026-04-09" },
  {
    id: "week",
    name: "Previous 7 Days",
    sortOrder: 2,
    createdAt: "2026-04-05",
  },
];

const conversations: ConversationSummary[] = [
  {
    id: "1",
    title: "SolidJS reactivity vs React hooks",
    groupId: "today",
    scope,
    messageCount: 8,
    lastMessageAt: "2026-04-10T15:30:00Z",
    updatedAt: "2026-04-10T15:30:00Z",
  },
  {
    id: "2",
    title: "Tailwind v4 migration guide",
    groupId: "today",
    scope,
    messageCount: 14,
    lastMessageAt: "2026-04-10T11:20:00Z",
    updatedAt: "2026-04-10T11:20:00Z",
  },
  {
    id: "3",
    title: "Chrome extension content scripts",
    groupId: "today",
    scope,
    messageCount: 6,
    lastMessageAt: "2026-04-10T09:00:00Z",
    updatedAt: "2026-04-10T09:00:00Z",
  },
  {
    id: "4",
    title: "Vite HMR not working with web workers",
    groupId: "yesterday",
    scope,
    messageCount: 11,
    lastMessageAt: "2026-04-09T17:45:00Z",
    updatedAt: "2026-04-09T17:45:00Z",
  },
  {
    id: "5",
    title: "IndexedDB vs OPFS performance",
    groupId: "yesterday",
    scope,
    messageCount: 9,
    lastMessageAt: "2026-04-09T14:00:00Z",
    updatedAt: "2026-04-09T14:00:00Z",
  },
  {
    id: "6",
    title: "WebSocket reconnection strategies",
    groupId: "week",
    scope,
    messageCount: 7,
    lastMessageAt: "2026-04-07T10:30:00Z",
    updatedAt: "2026-04-07T10:30:00Z",
  },
  {
    id: "7",
    title: "TypeScript discriminated unions",
    groupId: "week",
    scope,
    messageCount: 16,
    lastMessageAt: "2026-04-06T16:20:00Z",
    updatedAt: "2026-04-06T16:20:00Z",
  },
  {
    id: "8",
    title: "CSS container queries",
    groupId: "week",
    scope,
    messageCount: 5,
    lastMessageAt: "2026-04-05T13:00:00Z",
    updatedAt: "2026-04-05T13:00:00Z",
  },
];

const models: ModelOption[] = [
  { id: "claude-4", name: "Claude 4 Opus", provider: "Anthropic" },
  { id: "claude-4-sonnet", name: "Claude 4 Sonnet", provider: "Anthropic" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
];

const assistantResponse1 = `**SolidJS** takes a fundamentally different approach to reactivity compared to React hooks.

### Signals vs useState

In SolidJS, signals are **fine-grained reactive primitives** that track their own subscribers. When a signal updates, only the specific DOM nodes that read that signal are updated — no virtual DOM diffing required.

\`\`\`typescript
// SolidJS — runs once, DOM updates surgically
const [count, setCount] = createSignal(0);
return <p>{count()}</p>; // only this text node re-renders

// React — entire component re-renders
const [count, setCount] = useState(0);
return <p>{count}</p>; // whole function re-executes
\`\`\`

### Key Differences

1. **No re-renders** — SolidJS components run once; only reactive expressions update
2. **No dependency arrays** — \`createEffect\` auto-tracks dependencies
3. **No stale closures** — signals are getter functions, always current
4. **Derived values** are just functions, no \`useMemo\` needed

### When to choose SolidJS

- Performance-critical UIs with frequent updates
- Projects where you want predictable reactivity
- When you're tired of \`useCallback\` and dependency arrays`;

const assistantResponse2 = `\`createEffect\` in SolidJS is synchronous by default and automatically tracks all reactive dependencies read inside it — no dependency array needed.

\`\`\`typescript
// SolidJS — auto-tracks count and name
createEffect(() => {
  console.log(count(), name());
});

// React — must manually declare deps
useEffect(() => {
  console.log(count, name);
}, [count, name]); // easy to get wrong
\`\`\`

The biggest win: **no stale closure bugs**. Since \`count()\` is a function call, you always get the latest value. In React, closures capture the value at render time, which leads to subtle bugs with intervals, timeouts, and event handlers.`;

/** The full chat application scene, shared by the Full Chat App story and the
 *  theme editor's live preview. `class` controls the root sizing (defaults to
 *  full-viewport; the editor passes `h-full` to fit its canvas). */
export function ChatScene(props: { class?: string }) {
  const [activeId, setActiveId] = createSignal("1");
  const [modelId, setModelId] = createSignal("claude-4");
  const [inputValue, setInputValue] = createSignal("");
  const [proseSize, setProseSize] = createSignal<ProseSize>("base");
  const [attachedFiles, setAttachedFiles] = createSignal<AttachmentData[]>([
    {
      id: 'att-1',
      type: 'file',
      filename: 'benchmark-results.pdf',
      mediaType: 'application/pdf',
    },
    {
      id: 'att-2',
      type: 'file',
      filename: 'solid-vs-react.png',
      mediaType: 'image/png',
      url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop',
    },
    {
      id: 'att-3',
      type: 'source-document',
      filename: 'SolidJS Docs',
      title: 'SolidJS Reactivity',
      url: 'https://solidjs.com/docs',
    },
  ]);

  return (
    <ChatConfig proseSize={proseSize()}>
    <div class={`${props.class ?? "h-screen"} w-full bg-background overflow-hidden`}>
      <ResizablePanelGroup orientation="horizontal">
      {/* Sidebar */}
      <ResizablePanel defaultSize={20} data-min-size="180" data-max-size="400">
        <ConversationList
          groups={groups}
          conversations={conversations}
          activeId={activeId()}
          onSelect={setActiveId}
          onNewChat={() => {}}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      {/* Main Chat Area */}
      <ResizablePanel>
      <main class="flex flex-1 flex-col overflow-hidden h-full">
        {/* Header */}
        <header class="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <div class="text-sm font-semibold text-foreground">
            SolidJS reactivity vs React hooks
          </div>
          <div class="flex items-center gap-2">
            <select
              aria-label="Reading size"
              class="bg-muted/40 text-xs text-muted-foreground rounded-lg px-2 py-1.5 outline-none hover:bg-muted/60 transition-colors cursor-pointer"
              value={proseSize()}
              onChange={(e) => setProseSize(e.currentTarget.value as ProseSize)}
            >
              <option value="xs">Extra Small</option>
              <option value="sm">Small</option>
              <option value="base">Medium</option>
              <option value="lg">Large</option>
            </select>
            <ModelSwitcher
              models={models}
              currentModelId={modelId()}
              onModelChange={setModelId}
            />
            <Context
              usedTokens={12400}
              maxTokens={200000}
              inputTokens={8200}
              outputTokens={4200}
              estimatedCost={0.042}
            >
              <ContextTrigger />
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody>
                  <div class="space-y-1.5">
                    <ContextInputUsage />
                    <ContextOutputUsage />
                  </div>
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          </div>
        </header>

        {/* Chat Messages — scrollable */}
        <div class="relative flex-1 overflow-y-auto">
          <ChatContainer class="h-full">
            <ChatContainerContent class="space-y-0 px-5 pt-4 pb-12">
              {/* User message 1 */}
              <Message class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-end">
                <div class="group flex flex-col items-end gap-1">
                  <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
                    Can you explain how SolidJS reactivity differs from React
                    hooks? I keep hearing that SolidJS is faster but I don't
                    understand why.
                  </MessageContent>
                  <MessageActions class="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Edit message">
                      <Pencil class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Copy message">
                      <Copy class="size-3.5" />
                    </Button>
                  </MessageActions>
                </div>
              </Message>

              {/* Assistant message 1 */}
              <Message class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
                <div class="group flex w-full flex-col gap-0">
                  <MessageContent
                    markdown
                    class="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                  >
                    {assistantResponse1}
                  </MessageContent>
                  <MessageActions class="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Copy message">
                      <Copy class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Good response">
                      <ThumbsUp class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Bad response">
                      <ThumbsDown class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Regenerate response">
                      <RefreshCw class="size-3.5" />
                    </Button>
                  </MessageActions>
                </div>
              </Message>

              {/* User message 2 */}
              <Message class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-end">
                <div class="group flex flex-col items-end gap-1">
                  <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
                    What about effects? How does createEffect compare to
                    useEffect?
                  </MessageContent>
                  <MessageActions class="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Edit message">
                      <Pencil class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Copy message">
                      <Copy class="size-3.5" />
                    </Button>
                  </MessageActions>
                </div>
              </Message>

              {/* Assistant message 2 — last message, actions always visible */}
              <Message class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
                <div class="group flex w-full flex-col gap-0">
                  <MessageContent
                    markdown
                    class="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                  >
                    {assistantResponse2}
                  </MessageContent>
                  <MessageActions class="-ml-2.5 flex gap-0">
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Copy message">
                      <Copy class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Good response">
                      <ThumbsUp class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Bad response">
                      <ThumbsDown class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Regenerate response">
                      <RefreshCw class="size-3.5" />
                    </Button>
                  </MessageActions>
                </div>
              </Message>

              {/* User message 3 */}
              <Message class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-end">
                <div class="group flex flex-col items-end gap-1">
                  <MessageContent class="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5">
                    Can you benchmark SolidJS vs React for a list of 10,000 items?
                  </MessageContent>
                </div>
              </Message>

              {/* Assistant message 3 — with reasoning + tool call */}
              <Message class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
                <div class="group flex w-full flex-col gap-0">
                  {/* Reasoning block */}
                  <Reasoning class="mb-3">
                    <ReasoningTrigger class="text-sm">
                      Thought for 4 seconds
                    </ReasoningTrigger>
                    <ReasoningContent markdown class="mt-1">
                      {`I need to create a fair benchmark comparing SolidJS and React rendering performance. Let me think about the approach:

- Both frameworks should render the same list of 10,000 items
- I should measure initial render time and update performance
- Need to use \`performance.now()\` for accurate timing
- SolidJS should be significantly faster due to fine-grained reactivity`}
                    </ReasoningContent>
                  </Reasoning>

                  {/* Tool call */}
                  <Tool
                    toolPart={{
                      type: "run_benchmark",
                      state: "output-available",
                      input: {
                        framework: ["solid", "react"],
                        itemCount: 10000,
                        iterations: 5,
                      },
                      output: {
                        solid: { avgRenderMs: 12.4, avgUpdateMs: 0.8 },
                        react: { avgRenderMs: 89.2, avgUpdateMs: 34.1 },
                      },
                      toolCallId: "call_abc123",
                    }}
                    class="mb-3"
                  />

                  <MessageContent
                    markdown
                    class="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                  >
                    {`Here are the benchmark results for rendering 10,000 list items:

| Metric | SolidJS | React | Difference |
|--------|---------|-------|-----------|
| Initial render | 12.4ms | 89.2ms | **7.2x faster** |
| Single item update | 0.8ms | 34.1ms | **42.6x faster** |

SolidJS's fine-grained reactivity really shines here — updating a single item in React triggers a full virtual DOM diff of all 10,000 items, while SolidJS surgically updates only the changed DOM node.`}
                  </MessageContent>
                  <MessageActions class="-ml-2.5 flex gap-0">
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Copy message">
                      <Copy class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Good response">
                      <ThumbsUp class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Bad response">
                      <ThumbsDown class="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" class="rounded-full" aria-label="Regenerate response">
                      <RefreshCw class="size-3.5" />
                    </Button>
                  </MessageActions>
                </div>
              </Message>

              <ChatContainerScrollAnchor />
            </ChatContainerContent>

            {/* Scroll button */}
            <div class="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-center px-5">
              <ScrollButton class="shadow-sm" />
            </div>
          </ChatContainer>
        </div>

        {/* Input area — pinned to bottom */}
        <div class="shrink-0 bg-background px-3 pb-3 md:px-5 md:pb-5">
          <div class="mx-auto max-w-3xl">
            {/* Suggestions */}
            <div class="flex gap-2 pb-3 flex-wrap">
              <PromptSuggestion
                onClick={() =>
                  setInputValue("How does SolidJS handle context?")
                }
              >
                How does SolidJS handle context?
              </PromptSuggestion>
              <PromptSuggestion
                onClick={() =>
                  setInputValue("Show me a SolidJS store example")
                }
              >
                Show me a store example
              </PromptSuggestion>
              <PromptSuggestion
                onClick={() => setInputValue("SolidJS vs Svelte comparison")}
              >
                SolidJS vs Svelte comparison
              </PromptSuggestion>
            </div>

            {/* Input */}
            <PromptInput
              value={inputValue()}
              onValueChange={setInputValue}
              onSubmit={() => setInputValue("")}
            >
              <div class="flex flex-col">
                {/* Attached files — inside the input container */}
                <Show when={attachedFiles().length > 0}>
                  <div class="px-3 pt-3">
                    <Attachments variant="inline">
                      <For each={attachedFiles()}>
                        {(file) => (
                          <Attachment
                            data={file}
                            onRemove={() =>
                              setAttachedFiles((prev) =>
                                prev.filter((f) => f.id !== file.id)
                              )
                            }
                          >
                            <AttachmentPreview />
                            <AttachmentInfo />
                            <AttachmentRemove />
                          </Attachment>
                        )}
                      </For>
                    </Attachments>
                  </div>
                </Show>
                <PromptInputTextarea
                  placeholder="Ask anything..."
                  class="min-h-[44px] pt-3 pl-4"
                />
                <PromptInputActions class="mt-2 flex w-full items-center justify-between gap-2 px-3 pb-3">
                  <div class="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Add">
                      <Plus class="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" class="rounded-full gap-1" aria-label="Search the web">
                      <Globe class="size-4" />
                      Search
                    </Button>
                    <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="More options">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" class="rounded-full" aria-label="Voice input">
                      <Mic class="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      class="rounded-full"
                      disabled={!inputValue().trim()}
                     aria-label="Send message">
                      <ArrowUp class="size-4" />
                    </Button>
                  </div>
                </PromptInputActions>
              </div>
            </PromptInput>
          </div>
        </div>
      </main>
      </ResizablePanel>
      </ResizablePanelGroup>
    </div>
    </ChatConfig>
  );
}
