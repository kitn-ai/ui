import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { createSignal } from 'solid-js';
import { ChatThread, type ChatThreadProps } from './chat-thread';
import type { ConversationStore } from '../../primitives/conversation-store';
import type { ConversationSummary } from '../../types';
import type { ChatMessage } from '../../web-components/chat/chat-types';
import { componentDescription } from '../../stories/docs/web-component-controls';

// A stub store: no localStorage, no network. `markRead` IS implemented (it mutates an
// in-memory copy of the seed data) while `save` stays a no-op, which is what lets the
// unread-dot story exercise the real write path.

function stubStore(summaries: ConversationSummary[]): ConversationStore {
  const threads: Record<string, ChatMessage[]> = {
    'conv-1': [
      { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'How do I reset my password?' }] },
      { id: 'm2', role: 'assistant', parts: [{ type: 'text', text: "Head to Settings → Security and click \"Send reset link\" — it'll land in your inbox within a minute." }] },
    ],
    'conv-2': [
      { id: 'm3', role: 'user', parts: [{ type: 'text', text: 'Can I export my data as CSV?' }] },
      { id: 'm4', role: 'assistant', parts: [{ type: 'text', text: 'Yes — from the Data tab, choose Export, then CSV. Larger exports get emailed to you as a download link.' }] },
    ],
    'conv-3': [
      { id: 'm5', role: 'user', parts: [{ type: 'text', text: "What's the difference between the Team and Business plans?" }] },
    ],
  };
  const state = summaries.map((s) => ({ ...s }));
  return {
    async list() { return state.map((s) => ({ ...s })); },
    async load(id) { return threads[id] ?? []; },
    async save() { /* stub: the story never mutates the fixture's content */ },
    async markRead(id) {
      const entry = state.find((s) => s.id === id);
      if (entry) entry.lastReadAt = new Date().toISOString();
    },
  };
}

const now = Date.parse('2026-08-26T15:00:00Z');
const minsAgo = (mins: number) => new Date(now - mins * 60_000).toISOString();

const fixtureConversations: ConversationSummary[] = [
  {
    id: 'conv-1',
    title: 'Resetting my password',
    messageCount: 2,
    updatedAt: minsAgo(4),
    trailing: "Head to Settings → Security and click \"Send reset link\" — it'll land in your inbox within a minute.",
  },
  {
    id: 'conv-2',
    title: 'Exporting data as CSV',
    messageCount: 2,
    updatedAt: minsAgo(180),
    trailing: 'Yes — from the Data tab, choose Export, then CSV. Larger exports get emailed to you as a download link.',
  },
  {
    id: 'conv-3',
    title: 'Team vs Business plans',
    messageCount: 1,
    updatedAt: minsAgo(2880),
    trailing: "What's the difference between the Team and Business plans?",
  },
];

/**
 * Same three conversations, but `conv-2`/`conv-3` carry a `lastReadAt` OLDER
 * than their `updatedAt` — unread, per `isConversationUnread`'s contract
 * (conversation-item.tsx). `conv-1` (no `lastReadAt` at all) is the one
 * mount-time auto-restore selects (most-recently-updated), which is also
 * exactly why it's the right one to leave "clean" here: it becomes the
 * active conversation and gets marked read for real the moment the story
 * mounts (this stub's `markRead` below actually persists it, matching a real
 * store), so a static `lastReadAt` on it would either be redundant or,
 * pinned in the past, get immediately corrected anyway.
 */
const unreadFixtureConversations: ConversationSummary[] = fixtureConversations.map((c) =>
  c.id === 'conv-1' ? c : { ...c, lastReadAt: minsAgo(60 * 24 * 3) },
);

/**
 * The widget-box conversations experience: a header toggle that swaps between
 * a chat-bubble glyph and a back arrow, and a list view that fully replaces
 * the content area (no composer, no suggestions, see `ConversationPanel`).
 *
 * Modeled on Intercom's Messenger "Messages" tab. The desktop
 * `ConversationList` is not reused in this box: at this size the list does one
 * job at a time, browsing conversations or having one, and it replaces the
 * entire content area.
 */
const meta = {
  title: 'Components/ChatThread',
  component: ChatThread,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      controls: { exclude: ['use:eventListener', 'messages', 'controllerRef', 'cardHostElement', 'onMessageAction'] },
      description: componentDescription([
        'The full chat surface: header, message thread, suggestions and composer, plus a second list view (`ConversationPanel`) behind a header toggle when `conversations` and a `store` are set. The list view replaces the content area whole: no composer, no suggestions, one floating "New conversation" pill.',
      ]),
    },
  },
  argTypes: {
    // Descriptions come from each prop's own doc comment, or, for the props
    // declared as plain callbacks with no doc of their own, from the
    // `kai-chat` entry's `events` in src/web-components/web-component-meta.json
    // — the DOM contract the facade maps these onto (`kai-submit` -> onSubmit).
    onConversationLoad: {
      action: 'conversation-load',
      // The hook for owning `messages` yourself: re-render them with the loaded conversation's history.
      description:
        'Fires when a conversation loads or a new one starts, with its messages and the id (`undefined` when new).',
      table: { category: 'Events' },
    },
    onUnreadChange: {
      action: 'unread-change',
      description: 'Fires with the unread value the header toggle draws as a dot. Only meaningful with `conversations` on.',
      table: { category: 'Events' },
    },
    onHomeLink: {
      action: 'home-link',
      description:
        'Fires when a `home.links` entry with no `href` is activated; an `href`-bearing entry navigates as a real anchor instead.',
      table: { category: 'Events' },
    },
    onAttachmentsRejected: {
      action: 'attachments-rejected',
      description: 'Files the composer refused because `accept` excluded them.',
      table: { category: 'Events' },
    },
    onValueChange: {
      action: 'value-change',
      description: 'Fired on every input change.',
      table: { category: 'Events' },
    },
    onSubmit: {
      action: 'submit',
      description: 'User submitted a message.',
      table: { category: 'Events' },
    },
    onAttachmentsChange: {
      action: 'attachments-change',
      description: 'The staged attachments changed, carrying the full current list so a consumer can react in real time.',
      table: { category: 'Events' },
    },
    onSuggestionClick: {
      action: 'suggestion-click',
      description: 'A suggestion chip was clicked, which only happens in `suggestionMode="fill"`.',
      table: { category: 'Events' },
    },
    onModelChange: {
      action: 'model-change',
      description: 'The header model switcher changed.',
      table: { category: 'Events' },
    },
    onMessageAction: {
      action: 'message-action',
      description:
        'An action button on a message was clicked; `action` is the built-in name or a custom id, and `state` is present only for the toggleable like/dislike votes.',
      table: { category: 'Events' },
    },
    onWebSearch: {
      action: 'web-search',
      description: 'The web-search (Globe) toolbar button was clicked.',
      table: { category: 'Events' },
    },
    onVoice: {
      action: 'voice',
      description: 'The Mic / voice button was clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    messages: [],
    onSubmit: fn(),
    onConversationLoad: fn(),
    onUnreadChange: fn(),
    onHomeLink: fn(),
    onAttachmentsRejected: fn(),
    onValueChange: fn(),
    onAttachmentsChange: fn(),
    onSuggestionClick: fn(),
    onModelChange: fn(),
    onMessageAction: fn(),
    onWebSearch: fn(),
    onVoice: fn(),
    chatTitle: 'Support',
    placeholder: 'Message support…',
  },
  render: (args) => (
    <div class="h-[600px] w-[380px] overflow-hidden rounded-2xl border border-border">
      <ChatThread {...args} />
    </div>
  ),
} satisfies Meta<typeof ChatThread>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ChatThread } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Chat view, the default state — the header toggle renders the chat-bubble glyph. */
export const ChatView: Story = {
  args: {
    conversations: true,
    store: stubStore(fixtureConversations),
  },
  ...src(`<ChatThread
  conversations
  store={conversationStore}
  chatTitle="Support"
  placeholder="Message support…"
  onSubmit={(text) => sendMessage(text)}
  onConversationLoad={(id) => loadConversation(id)}
/>`),
};

/** List view, populated: rows show a bold title, right-aligned relative time,
 *  and a truncated one-line last-message preview. The header toggle has
 *  swapped to a back arrow. */
export const ListViewPopulated: Story = {
  args: {
    conversations: true,
    store: stubStore(fixtureConversations),
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const toggle = await waitFor(() => {
      const btn = canvasElement.querySelector<HTMLButtonElement>('[data-kai-conversations-toggle]');
      expect(btn).toBeTruthy();
      return btn!;
    });
    await userEvent.click(toggle);
    await waitFor(() => {
      expect(canvasElement.querySelector('[data-conversation-id="conv-1"]')).toBeTruthy();
      expect(toggle).toHaveAttribute('aria-label', 'Back to chat');
    });
  },
  ...src(`// The header's conversations toggle opens the list view.
<ChatThread conversations store={conversationStore} chatTitle="Support" />`),
};

/** List view, no conversations yet: the empty state plus the same floating pill. */
export const ListViewEmpty: Story = {
  args: {
    conversations: true,
    store: stubStore([]),
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const toggle = await waitFor(() => {
      const btn = canvasElement.querySelector<HTMLButtonElement>('[data-kai-conversations-toggle]');
      expect(btn).toBeTruthy();
      return btn!;
    });
    await userEvent.click(toggle);
    await waitFor(() => expect(canvasElement.querySelector('[data-kai-new-conversation]')).toBeTruthy());
  },
  ...src(`// An empty store shows the empty state and the floating "New conversation" pill.
<ChatThread conversations store={emptyConversationStore} chatTitle="Support" />`),
};

/** Unread indicators: a header-toggle badge (any
 *  conversation other than the active one is unread) and, in the list, a
 *  trailing dot on each unread row. `conv-2`/`conv-3` are unread; `conv-1`
 *  is auto-selected as active on mount (most-recently-updated) and marked
 *  read for real via this story's `stubStore().markRead`. */
export const ListViewWithUnread: Story = {
  args: {
    conversations: true,
    store: stubStore(unreadFixtureConversations),
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Chat view: the badge shows before the list is ever opened.
    await waitFor(() => {
      expect(canvasElement.querySelector('[data-kai-conversations-unread]')).toBeTruthy();
      expect(canvasElement.querySelector('[data-kai-conversations-toggle]')).toHaveAttribute('aria-label', 'Conversations (unread)');
    });
    await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[data-kai-conversations-toggle]')!);
    await waitFor(() => {
      expect(canvasElement.querySelector('[data-conversation-id="conv-2"]')).toHaveAttribute('data-unread', '');
      expect(canvasElement.querySelector('[data-conversation-id="conv-3"]')).toHaveAttribute('data-unread', '');
      // conv-1 is the auto-restored active conversation — not unread.
      expect(canvasElement.querySelector('[data-conversation-id="conv-1"]')).not.toHaveAttribute('data-unread');
    });
  },
  ...src(`// Unread status comes from the store's summaries: lastReadAt older than
// updatedAt renders a badge on the toggle and a dot on the row.
<ChatThread conversations store={conversationStore} chatTitle="Support" />`),
};

/** Role-scoped default action bars: the user turn gets `userActions`, the
 *  assistant turn gets `assistantActions`. Neither message sets its own
 *  `actions`, so both fall through to the role default. */
export const PerRoleActions: Story = {
  args: {
    conversations: false,
    messages: [
      { id: 'pra-1', role: 'user', parts: [{ type: 'text', text: 'Summarize the Q2 report and cite your sources.' }] },
      {
        id: 'pra-2',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Revenue grew 12% quarter over quarter, driven mostly by the new enterprise tier.' },
          { type: 'source', source: { url: 'https://example.com/q2-report', title: 'Q2 Financial Report' } },
        ],
      },
    ],
    userActions: ['edit', 'copy'],
    assistantActions: ['copy', 'like', 'dislike', 'speak'],
  },
  ...src(`<ChatThread
  messages={messages}
  userActions={['edit', 'copy']}
  assistantActions={['copy', 'like', 'dislike', 'speak']}
/>`),
};

/** `hideSources`: the same assistant turn as `PerRoleActions`, with the
 *  citations row toggled via the Storybook control. The answer text still
 *  renders either way; only the `part="citations"` row is skipped. */
export const HideSources: Story = {
  args: {
    conversations: false,
    messages: [
      {
        id: 'hs-1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Revenue grew 12% quarter over quarter, driven mostly by the new enterprise tier.' },
          { type: 'source', source: { url: 'https://example.com/q2-report', title: 'Q2 Financial Report' } },
        ],
      },
    ],
    hideSources: true,
  },
  ...src(`<ChatThread messages={messages} hideSources />`),
};

/** Interactive playground: click the header toggle to swap between the chat
 *  view (bubble icon) and the list view (back arrow) freely. */
export const Playground: Story = {
  args: {
    conversations: true,
    store: stubStore(fixtureConversations),
  },
  render: (args: ChatThreadProps) => {
    const [store] = createSignal(stubStore(fixtureConversations));
    return (
      <div class="h-[600px] w-[380px] overflow-hidden rounded-2xl border border-border">
        <ChatThread {...args} store={store()} />
      </div>
    );
  },
  ...src(`<ChatThread conversations store={conversationStore} chatTitle="Support" />`),
};
