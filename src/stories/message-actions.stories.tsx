import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import {
  Message, MessageAvatar, MessageContent, MessageActions,
  FeedbackBar, Button,
} from '../index';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Share, Bookmark, Check } from 'lucide-solid';

const meta: Meta = {
  title: 'Examples/Message Actions',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const HoverActions: Story = {
  name: 'Actions on Hover',
  render: () => (
    <div class="space-y-6 max-w-2xl p-4">
      <p class="text-sm text-muted-foreground">Hover over the assistant message to see action buttons appear.</p>

      <Message>
        <MessageAvatar src="" fallback="U" alt="User" />
        <MessageContent>How do I handle errors in async Rust functions?</MessageContent>
      </Message>

      <Message>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <div class="group flex-1 space-y-2">
          <MessageContent markdown>
{`In Rust, async functions return \`Result\` types just like sync functions. The \`?\` operator works seamlessly:

\`\`\`rust
async fn fetch_user(id: u64) -> Result<User, AppError> {
    let response = client.get(&format!("/users/{}", id))
        .send()
        .await?;          // propagates reqwest::Error
    let user = response
        .json::<User>()
        .await?;           // propagates deserialization error
    Ok(user)
}
\`\`\`

Use \`anyhow::Result\` for applications and \`thiserror\` for libraries to define custom error types.`}
          </MessageContent>
          <MessageActions class="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><RefreshCw class="size-3.5" /></Button>
          </MessageActions>
        </div>
      </Message>
    </div>
  ),
};

export const AlwaysVisible: Story = {
  name: 'Always Visible Actions',
  render: () => (
    <div class="space-y-6 max-w-2xl p-4">
      <Message>
        <MessageAvatar src="" fallback="AI" alt="Assistant" />
        <div class="flex-1 space-y-2">
          <MessageContent markdown>
{`To install Tailwind CSS v4 in a Vite project:

\`\`\`bash
pnpm add tailwindcss @tailwindcss/vite
\`\`\`

Then add the plugin to your \`vite.config.ts\`:

\`\`\`typescript
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
\`\`\`

Import Tailwind in your main CSS file:

\`\`\`css
@import "tailwindcss";
\`\`\``}
          </MessageContent>
          <MessageActions>
            <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><RefreshCw class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><Share class="size-3.5" /></Button>
            <Button variant="ghost" size="icon-sm"><Bookmark class="size-3.5" /></Button>
          </MessageActions>
        </div>
      </Message>
    </div>
  ),
};

export const WithCopyConfirmation: Story = {
  name: 'Copy with Confirmation',
  render: () => {
    const [copied, setCopied] = createSignal(false);

    const handleCopy = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div class="space-y-6 max-w-2xl p-4">
        <Message>
          <MessageAvatar src="" fallback="AI" alt="Assistant" />
          <div class="flex-1 space-y-2">
            <MessageContent>
              The current LTS version of Node.js is 22.x, which includes built-in support for the fetch API, test runner, and watch mode.
            </MessageContent>
            <MessageActions>
              <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                {copied() ? <Check class="size-3.5 text-green-500" /> : <Copy class="size-3.5" />}
              </Button>
              <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
              <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
            </MessageActions>
          </div>
        </Message>
      </div>
    );
  },
};

export const WithFeedbackBar: Story = {
  name: 'Feedback Bar',
  render: () => {
    const [showFeedback, setShowFeedback] = createSignal(true);

    return (
      <div class="space-y-6 max-w-2xl p-4">
        <Message>
          <MessageAvatar src="" fallback="AI" alt="Assistant" />
          <div class="flex-1 space-y-3">
            <MessageContent markdown>
{`Here are 3 ways to debounce in JavaScript:

1. **setTimeout approach** -- simple but manual cleanup
2. **lodash.debounce** -- battle-tested, configurable leading/trailing
3. **AbortController** -- modern, cancellable, works with fetch`}
            </MessageContent>

            {showFeedback() && (
              <FeedbackBar
                title="Was this response helpful?"
                onHelpful={() => setShowFeedback(false)}
                onNotHelpful={() => setShowFeedback(false)}
                onClose={() => setShowFeedback(false)}
              />
            )}
          </div>
        </Message>
      </div>
    );
  },
};
