import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { expect, waitFor } from 'storybook/test';
import { Dynamic } from 'solid-js/web';
// The kai-* elements are registered by .storybook/preview.ts, from the built bundle.

/**
 * The thread built from your own parts. Put `<kai-message>` elements inside `<kai-thread>` and
 * the thread stops rendering `messages`: you own the loop, and the thread keeps everything
 * around it (the scroll region, stick-to-bottom, the live region, the pending indicator, the
 * empty state). Inside a message, the children are the body, so a `<kai-markdown>` or any
 * element of yours goes where `message.parts` would have, under the same row: alignment, the
 * speaker's role, the action bar.
 */
const meta: Meta = {
  title: 'Components/Thread Composed',
  parameters: { layout: 'padded' },
};
export default meta;

// Hand-written HTML for the "Show code" panel: real consumer markup, not the story's JSX.
const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

type Speaker = HTMLElement & { role?: string };
const speaker = (role: 'user' | 'assistant') => (e: HTMLElement) => { (e as Speaker).role = role; };
const md = (content: string) => (e: HTMLElement) => { (e as HTMLElement & { content: string }).content = content; };

const FRAME = { height: '360px', width: 'min(100%, 560px)', border: '1px solid var(--color-border)', 'border-radius': '0.5rem', overflow: 'hidden' } as const;

/** Rows you wrote, in your own loop. The user's turn is plain text, the assistant's is markdown, and the
 *  third row carries a body of your own: a status card that is not a kit element at all. */
export const Composed: StoryObj = {
  render: () => (
    <div style={FRAME}>
      <kai-thread>
        <kai-message ref={speaker('user')}>
          <span>What changed in the deploy?</span>
        </kai-message>
        <kai-message ref={speaker('assistant')}>
          <kai-markdown ref={md('Two things: the **build cache** key now includes the lockfile, and the health check waits for the migration.')} />
          {/* kai-action has no Solid JSX typing; Dynamic renders the tag as-is */}
          <Dynamic component="kai-action" id="copy" label="Copy" icon="copy" />
        </kai-message>
        <kai-message ref={speaker('assistant')}>
          <div style={{ border: '1px solid var(--color-border)', 'border-radius': '0.5rem', padding: '0.75rem', 'font-size': '0.875rem' }}>
            <strong>Deploy 4172</strong>: healthy, 3 of 3 instances
          </div>
        </kai-message>
      </kai-thread>
    </div>
  ),
  parameters: src(`<kai-thread style="height: 360px">
  <kai-message role="user">
    <span>What changed in the deploy?</span>
  </kai-message>

  <kai-message role="assistant">
    <kai-markdown content="Two things: the **build cache** key now includes the lockfile, and the health check waits for the migration."></kai-markdown>
    <kai-action id="copy" label="Copy" icon="copy"></kai-action>
  </kai-message>

  <!-- any element is a valid body -->
  <kai-message role="assistant">
    <div class="deploy-card"><strong>Deploy 4172</strong>: healthy, 3 of 3 instances</div>
  </kai-message>
</kai-thread>`),
};

/** The same conversation from the preset, `messages`, for comparison. Children win when both are
 *  present, with one console warning. */
export const Preset: StoryObj = {
  render: () => (
    <div style={FRAME}>
      <kai-thread
        ref={(e) => {
          (e as HTMLElement & { messages: unknown }).messages = [
            { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What changed in the deploy?' }] },
            { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'Two things: the **build cache** key now includes the lockfile, and the health check waits for the migration.' }], actions: ['copy'] },
          ];
        }}
      />
    </div>
  ),
  parameters: src(`<kai-thread id="thread" style="height: 360px"></kai-thread>
<script>
  document.getElementById('thread').messages = [
    { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'What changed in the deploy?' }] },
    { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'Two things: ...' }], actions: ['copy'] },
  ];
</script>`),
};

const LINE = (i: number) => `Step ${i}: the worker drains its queue, then acknowledges the batch.`;

/** The last message grows as the model streams. The thread stays pinned to the bottom on its own, because
 *  it watches the size of the rows you projected, not only its own shadow tree. Scroll up and it lets go. */
export const Streaming: StoryObj = {
  render: () => {
    let last: (HTMLElement & { content: string }) | undefined;
    let thread: (HTMLElement & { scrollToBottom(b?: ScrollBehavior): void }) | undefined;
    return (
      <div style={FRAME}>
        <button
          type="button"
          data-testid="stream"
          hidden
          onClick={async () => {
            let text = '';
            for (let i = 1; i <= 12; i++) {
              text += `${LINE(i)}\n\n`;
              if (last) last.content = text;
              await new Promise((r) => setTimeout(r, 40));
            }
          }}
        />
        <kai-thread ref={(e) => (thread = e as typeof thread)}>
          {Array.from({ length: 8 }, (_, i) => (
            <kai-message ref={speaker(i % 2 ? 'assistant' : 'user')}>
              <kai-markdown ref={md(`Earlier message ${i + 1}\n\nwith a second paragraph\n\nand a third, so the thread overflows.`)} />
            </kai-message>
          ))}
          <kai-message ref={speaker('assistant')}>
            <kai-markdown ref={(e) => { last = e as typeof last; md('Working on it.')(e); requestAnimationFrame(() => thread?.scrollToBottom('instant')); }} />
          </kai-message>
        </kai-thread>
      </div>
    );
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const thread = canvasElement.querySelector('kai-thread') as HTMLElement;
    const log = () => thread.shadowRoot!.querySelector('[role="log"]') as HTMLElement;
    await waitFor(() => expect(log().scrollHeight).toBeGreaterThan(log().clientHeight));
    (canvasElement.querySelector('[data-testid="stream"]') as HTMLButtonElement).click();
    await waitFor(() => expect(log().scrollHeight - log().scrollTop - log().clientHeight).toBeLessThanOrEqual(2), { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 700));
    expect(log().scrollHeight - log().scrollTop - log().clientHeight).toBeLessThanOrEqual(2);
  },
  parameters: src(`<kai-thread id="thread" style="height: 360px">
  <kai-message role="user"><span>Summarise the runbook.</span></kai-message>
  <kai-message role="assistant">
    <kai-markdown id="reply" content=""></kai-markdown>
  </kai-message>
</kai-thread>
<script>
  // Grow the last message as tokens arrive. The thread stays pinned to the
  // bottom unless the reader scrolled up.
  const reply = document.getElementById('reply');
  let text = '';
  for await (const chunk of tokens) { text += chunk; reply.content = text; }
</script>`),
};

/** Nothing inside and nothing in `messages`: the thread's empty state shows, and yours replaces it through
 *  `slot="empty"`. It goes away the moment the first row arrives. */
export const Empty: StoryObj = {
  render: () => (
    <div style={FRAME}>
      <kai-thread>
        <div slot="empty" style={{ display: 'flex', height: '100%', 'align-items': 'center', 'justify-content': 'center', 'font-size': '0.875rem', color: 'var(--color-muted-foreground)' }}>
          Ask anything to begin.
        </div>
      </kai-thread>
    </div>
  ),
  parameters: src(`<kai-thread style="height: 360px">
  <div slot="empty">Ask anything to begin.</div>
</kai-thread>`),
};
