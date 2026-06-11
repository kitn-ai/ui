import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  ChainOfThought, ChainOfThoughtStep, ChainOfThoughtTrigger, ChainOfThoughtContent, ChainOfThoughtItem,
  Button, Separator,
} from '../index';
import { Copy, ThumbsUp, ThumbsDown, ArrowUp, Lightbulb, Search, Calculator } from 'lucide-solid';

const meta: Meta = {
  title: 'Examples/Conversation with Reasoning',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div class="flex flex-col h-[700px] w-full max-w-2xl bg-background rounded-xl shadow-lg overflow-hidden">
      <div class="flex items-center px-4 py-3">
        <h2 class="text-sm font-semibold text-foreground">Architecture Decision</h2>
      </div>
      <Separator />

      <ChatContainer class="flex-1 p-4">
        <ChatContainerContent class="space-y-6 py-4">

          <Message>
            <MessageAvatar src="" fallback="U" alt="User" />
            <MessageContent>
              I have a Chrome extension that needs to sync user data across devices. Should I use Chrome's built-in storage.sync API or implement my own sync layer with a backend? The data is about 50KB per user, updated frequently (every few minutes), and includes nested objects with arrays.
            </MessageContent>
          </Message>

          <Message>
            <MessageAvatar src="" fallback="AI" alt="Assistant" />
            <div class="flex-1 space-y-3">

              {/* Chain of thought reasoning */}
              <ChainOfThought>
                <ChainOfThoughtStep>
                  <ChainOfThoughtTrigger leftIcon={<Search class="size-3.5" />}>
                    Analyzing data size and sync limits
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    <ChainOfThoughtItem>
                      chrome.storage.sync has a total limit of 102,400 bytes and 512 items max. At 50KB per user, that's within the total limit but leaves little headroom. Each item is capped at 8,192 bytes, so nested objects would need splitting. Write operations are throttled to 120/minute in normal mode, 1,800/hour.
                    </ChainOfThoughtItem>
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>

                <ChainOfThoughtStep>
                  <ChainOfThoughtTrigger leftIcon={<Calculator class="size-3.5" />}>
                    Evaluating update frequency constraints
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    <ChainOfThoughtItem>
                      "Updated every few minutes" means roughly 20-30 writes per hour. That's well within the 1,800/hour limit. But if the data has nested objects with arrays, each update might need to write multiple storage items (due to the 8KB per-item limit), multiplying the write count. 50KB / 8KB = ~7 items minimum, so 7 * 30 = 210 writes/hour. Still within limits.
                    </ChainOfThoughtItem>
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>

                <ChainOfThoughtStep>
                  <ChainOfThoughtTrigger leftIcon={<Lightbulb class="size-3.5" />}>
                    Considering conflict resolution
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    <ChainOfThoughtItem>
                      Chrome storage.sync uses last-write-wins. For nested objects updated from multiple devices simultaneously, this could cause data loss. If a user has the extension open on laptop and desktop, and both modify different array elements, the last write overwrites the other's changes. A custom backend could use CRDTs or operational transforms for proper merging.
                    </ChainOfThoughtItem>
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>

                <ChainOfThoughtStep isLast>
                  <ChainOfThoughtTrigger leftIcon={<Lightbulb class="size-3.5" />}>
                    Weighing implementation complexity
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    <ChainOfThoughtItem>
                      Custom backend means: server costs, auth, API design, offline handling, retry logic, and maintenance. Chrome storage.sync is free, built-in, handles offline automatically, and requires zero infrastructure. For a personal tool, the operational burden of a backend is significant.
                    </ChainOfThoughtItem>
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>
              </ChainOfThought>

              {/* Final answer */}
              <MessageContent markdown>
{`Given your constraints, I'd recommend a **hybrid approach**:

### Use \`chrome.storage.sync\` as primary, with a chunking strategy

1. **Split your 50KB into logical chunks** -- group related data into objects under 8KB each. Use a manifest key that tracks which chunks exist and their versions.

2. **Implement delta syncing** -- instead of writing the full dataset every time, only write the chunks that changed. This keeps you well under rate limits.

3. **Add a simple conflict guard** -- store a \`lastModifiedBy\` device ID and timestamp in each chunk. On read, if you detect a conflict, merge arrays by union rather than overwrite.

\`\`\`typescript
interface SyncChunk {
  version: number;
  deviceId: string;
  updatedAt: number;
  data: Record<string, unknown>;
}

// Write only changed chunks
async function syncChunks(changes: Map<string, SyncChunk>) {
  const batch: Record<string, SyncChunk> = {};
  for (const [key, chunk] of changes) {
    batch[\`chunk_\${key}\`] = { ...chunk, version: chunk.version + 1 };
  }
  await chrome.storage.sync.set(batch);
}
\`\`\`

### When to upgrade to a backend

Move to a custom sync layer if:
- Data grows beyond **80KB** (hitting limits)
- You need **real-time collaboration** (multiple devices editing simultaneously)
- You want **version history** or undo across devices
- You add team/sharing features`}
              </MessageContent>

              <MessageActions>
                <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
              </MessageActions>
            </div>
          </Message>

          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainer>

      <div class="px-4 pb-4">
        <PromptInput>
          <PromptInputTextarea placeholder="Ask a follow-up..." />
          <PromptInputActions class="justify-end">
            <Button variant="default" size="icon-sm" class="rounded-full">
              <ArrowUp class="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  ),
};
