import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import { LifeBuoy, Sparkles } from 'lucide-solid';
import './register'; // side effect: registers <kai-chat> et al.
import type { ChatMessage } from './chat-types';

// SPIKE: feasibility demo for the slotted-shell composition model. Every slot is
// filled with PLAIN DOM (no kai-* inside the slots) and inline-styled, to prove
// two things at once: (1) light-DOM content projects through the Solid-rendered
// shadow slots, and (2) shadow-DOM style encapsulation does NOT reach slotted
// content — the consumer's own markup and CSS win. "Bring your own markup."

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-chat': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

type ChatEl = HTMLElement & { messages?: ChatMessage[]; chatTitle?: string };

const thread: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Can you summarize last quarter?' },
  {
    id: '2',
    role: 'assistant',
    content: 'Revenue was up 18% QoQ, driven mostly by the self-serve tier. Want the breakdown by plan?',
    actions: ['copy', 'like', 'dislike'],
  },
];

const meta = {
  title: 'Spikes/Chat Slots',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

// ── 1. INJECT — your markup added into regions (sidebar + composer-actions +
//      footer), alongside the built-in header and the default composer. ────────
function InjectDemo() {
  let el: ChatEl | undefined;
  onMount(() => { if (el) { el.messages = thread; el.chatTitle = 'Acme Support'; } });
  return (
    <kai-chat ref={(e) => (el = e as ChatEl)} style={{ display: 'block', height: '560px' }}>
      <nav slot="sidebar" style="display:flex;flex-direction:column;gap:6px;padding:12px;font:13px/1.4 system-ui;background:#0b1220;color:#cbd5e1;height:100%">
        <strong style="color:#fff;margin-bottom:6px">Your conversations</strong>
        <a href="#" style="color:#93c5fd;text-decoration:none">▸ Q3 forecast</a>
        <a href="#" style="color:#cbd5e1;text-decoration:none">  Onboarding flow</a>
        <a href="#" style="color:#cbd5e1;text-decoration:none">  Pricing page copy</a>
        <span style="margin-top:auto;color:#94a3b8;font-size:11px">plain &lt;nav&gt; — not a kai-* element</span>
      </nav>
      <button slot="composer-actions" type="button" style="font:13px system-ui;padding:4px 10px;border:1px solid #d4d4d8;border-radius:8px;background:#fff;cursor:pointer">+ Attach a file</button>
      <footer slot="footer">Acme may make mistakes. <a href="#">Verify important info</a>.</footer>
    </kai-chat>
  );
}
export const Inject: Story = { render: () => <InjectDemo /> };

// ── 2. REPLACE (empty) — custom zero-state. The component owns WHEN it shows
//      (messages.length === 0); the consumer owns WHAT it is. ─────────────────
function EmptyDemo() {
  let el: ChatEl | undefined;
  onMount(() => { if (el) el.messages = []; });
  return (
    <kai-chat ref={(e) => (el = e as ChatEl)} style={{ display: 'block', height: '560px' }}>
      <div slot="empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px;text-align:center;font:14px system-ui;color:#3f3f46">
        <LifeBuoy size={40} />
        <div style="font-size:18px;font-weight:600">How can we help?</div>
        <div style="max-width:32ch;color:#71717a">Ask about billing, your account, or anything else — a human is one click away.</div>
        <button type="button" style="margin-top:6px;padding:8px 14px;border-radius:9999px;border:0;background:#7c3aed;color:#fff;font:13px system-ui;cursor:pointer">Talk to a person</button>
      </div>
    </kai-chat>
  );
}
export const EmptyState: Story = { render: () => <EmptyDemo /> };

// ── 3. REPLACE (header + composer) — full custom header AND a custom composer
//      form. This is the DATA-FLOW WALL: a slotted <form> can't read the
//      component's reactive state, so it owns its own submit — and drives the
//      thread by setting the `messages` property (a fresh array ref). ──────────
let nextId = 100;
function ReplaceDemo() {
  let el: ChatEl | undefined;
  let input: HTMLInputElement | undefined;
  onMount(() => { if (el) el.messages = thread; });
  const send = (e: Event) => {
    e.preventDefault();
    const text = input?.value.trim();
    if (!text || !el) return;
    // Consumer owns the composer behavior end-to-end: append to the thread.
    el.messages = [...(el.messages ?? []), { id: `m${nextId++}`, role: 'user', content: text }];
    if (input) input.value = '';
  };
  return (
    <kai-chat ref={(e) => (el = e as ChatEl)} style={{ display: 'block', height: '560px' }}>
      <div slot="header" style="display:flex;align-items:center;gap:10px;padding:0 16px;height:60px;background:linear-gradient(90deg,#7c3aed,#db2777);color:#fff;font:600 15px system-ui">
        <Sparkles size={20} style="flex-shrink:0" /> Concierge — fully custom header
      </div>
      <form slot="composer" onSubmit={send} style="display:flex;gap:8px;padding:10px;border:2px dashed #7c3aed;border-radius:14px;background:#faf5ff">
        <input ref={(e) => (input = e as HTMLInputElement)} placeholder="Your own <form> owns submit…" style="flex:1;border:0;background:transparent;font:14px system-ui;outline:none" />
        <button type="submit" data-testid="custom-send" style="padding:8px 16px;border-radius:10px;border:0;background:#7c3aed;color:#fff;font:600 13px system-ui;cursor:pointer">Send →</button>
      </form>
    </kai-chat>
  );
}
export const ReplaceComposer: Story = { render: () => <ReplaceDemo /> };

// ── Drop-in baseline — NO slots projected. The shell must render exactly as it
//    did before slots existed (regression guard). ─────────────────────────────
function DropInDemo() {
  let el: ChatEl | undefined;
  onMount(() => { if (el) el.messages = thread; });
  return <kai-chat ref={(e) => (el = e as ChatEl)} style={{ display: 'block', height: '560px' }} />;
}
export const DropIn: Story = { render: () => <DropInDemo /> };
