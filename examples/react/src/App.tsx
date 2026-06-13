/**
 * kitn-chat React example — using the generated wrappers.
 *
 * The kit is built with SolidJS but ships framework-agnostic custom elements.
 * `@kitnai/chat/react` provides typed React wrappers (KitnChat, KitnPromptInput,
 * KitnConversationList, …) that make the elements feel native:
 *   - array/object props (messages, models, conversations, suggestions, context,
 *     slashCommands) are passed as React props and assigned as live DOM
 *     *properties* (NOT stringified to attributes);
 *   - boolean props (loading) reflect correctly;
 *   - events are `on<Event>` handlers (onSubmit, onModelchange, onSelect, …)
 *     wired to the elements' CustomEvents under the hood;
 *   - refs are forwarded; `theme`/`style`/`className`/`id` pass through.
 *
 * We must still register the elements once as a side effect.
 */

import { useState } from 'react';

// Side-effect import: registers the custom elements globally.
import '@kitnai/chat/elements';
// Typed React wrappers — the whole point of this example.
import { KitnChat, KitnConversationList, KitnPromptInput } from '@kitnai/chat/react';

// --- types ------------------------------------------------------------------

type MessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: MessageAction[];
};

type Conversation = {
  id: string;
  title: string;
  groupId: string;
  scope: { type: 'document' | 'collection' };
  messageCount: number;
  lastMessageAt: string;
  updatedAt: string;
};

type Group = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

type Model = { id: string; name: string; provider?: string };
type Theme = 'light' | 'dark' | 'auto';

// --- seed data ---------------------------------------------------------------

const GROUPS: Group[] = [
  { id: 'g-work', name: 'Work', sortOrder: 0, createdAt: '2026-06-01T09:00:00.000Z' },
  { id: 'g-personal', name: 'Personal', sortOrder: 1, createdAt: '2026-06-02T09:00:00.000Z' },
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  { id: 'c-1', title: 'React + web components', groupId: 'g-work', scope: { type: 'collection' }, messageCount: 2, lastMessageAt: '2026-06-10T15:30:00.000Z', updatedAt: '2026-06-10T15:30:00.000Z' },
  { id: 'c-2', title: 'Centering a div', groupId: 'g-work', scope: { type: 'collection' }, messageCount: 2, lastMessageAt: '2026-06-09T14:20:00.000Z', updatedAt: '2026-06-09T14:20:00.000Z' },
  { id: 'c-3', title: 'TypeScript generics', groupId: 'g-personal', scope: { type: 'collection' }, messageCount: 2, lastMessageAt: '2026-06-08T11:05:00.000Z', updatedAt: '2026-06-08T11:05:00.000Z' },
];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  'c-1': [
    { id: 'm1', role: 'user', content: 'How do I use kitn-chat web components inside a React app?' },
    {
      id: 'm2', role: 'assistant', actions: ['copy', 'like', 'dislike'],
      content:
        "Just use the wrappers from `@kitnai/chat/react`:\n\n```tsx\nimport { KitnChat } from '@kitnai/chat/react';\n\n<KitnChat\n  messages={messages}\n  models={models}\n  onSubmit={(e) => console.log(e.detail)}\n  theme=\"auto\"\n/>\n```\n\nArrays/objects are passed as props and become live DOM properties; events arrive as `on<Event>` callbacks. No refs or `useEffect` needed.",
    },
  ],
  'c-2': [
    { id: 'm1', role: 'user', content: 'How do I center a div?' },
    {
      id: 'm2', role: 'assistant', actions: ['copy', 'like', 'dislike'],
      content: "The modern way is CSS Grid:\n\n```css\n.box {\n  display: grid;\n  place-items: center;\n}\n```\n\nThat centers the child on both axes with no magic numbers.",
    },
  ],
  'c-3': [
    { id: 'm1', role: 'user', content: 'Show a generic `identity` function in TypeScript.' },
    {
      id: 'm2', role: 'assistant', actions: ['copy', 'like', 'dislike'],
      content: "```typescript\nfunction identity<T>(value: T): T {\n  return value;\n}\n\nconst n = identity(42);    // number\nconst s = identity('hi'); // string\n```",
    },
  ],
};

const MODELS: Model[] = [
  { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
  { id: 'haiku', name: 'Claude Haiku', provider: 'Anthropic' },
];

const CONTEXT = { usedTokens: 8200, maxTokens: 200_000, inputTokens: 6400, outputTokens: 1800 };

const SUGGESTIONS = [
  'How do custom events work in React?',
  'Show me a streaming example',
  'What is SolidJS?',
];

const SLASH_COMMANDS = [
  { id: 'summarize', label: '/summarize', description: 'Summarize the conversation', category: 'Actions' },
  { id: 'explain', label: '/explain', description: 'Explain the last message', category: 'Actions' },
  { id: 'translate', label: '/translate', description: 'Translate to another language', category: 'Actions' },
];

// --- helpers -----------------------------------------------------------------

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function buildReply(text: string): string {
  return `Thanks for your message!\n\n> ${text}\n\nThis canned reply was appended to the \`messages\` prop in React state — proving array round-tripping through the wrapper.`;
}

/** "Streams" a reply word-by-word, updating state on each tick. */
function streamReply(fullText: string, onChunk: (partial: string, done: boolean) => void): () => void {
  const words = fullText.split(' ');
  let i = 0;
  const timer = setInterval(() => {
    i += 1;
    const partial = words.slice(0, i).join(' ');
    const done = i >= words.length;
    onChunk(partial, done);
    if (done) clearInterval(timer);
  }, 40);
  return () => clearInterval(timer);
}

const SUN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const MOON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

// --- component ---------------------------------------------------------------

export default function App() {
  const [theme, setTheme] = useState<Theme>('auto');
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState('c-1');
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [currentModel, setCurrentModel] = useState('sonnet');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [draftSubmissions, setDraftSubmissions] = useState<string[]>([]);

  // Messages for the active conversation (a real array prop, not stringified).
  const messages = allMessages[activeId] ?? [];

  const systemDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'auto' && systemDark);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  // ---- KitnChat handlers ----------------------------------------------------
  function handleSubmit(e: CustomEvent) {
    const { value, attachments } = (e.detail ?? {}) as { value?: string; attachments?: unknown[] };
    const text = (value ?? '').trim();
    if (!text && !(attachments ?? []).length) return;

    const userMsg: ChatMessage = { id: 'u' + generateId(), role: 'user', content: text };
    const replyId = 'a' + generateId();

    // Append to the messages array in React state → re-renders KitnChat with a
    // NEW array prop, which the wrapper re-assigns as the element's `messages`.
    setAllMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), userMsg, { id: replyId, role: 'assistant', content: '' }],
    }));
    setLoading(true);

    streamReply(buildReply(text || 'your attachment'), (partial, done) => {
      setAllMessages((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).map((m) =>
          m.id === replyId
            ? { ...m, content: partial, actions: done ? (['copy', 'like', 'dislike', 'regenerate'] as MessageAction[]) : undefined }
            : m,
        ),
      }));
      if (done) setLoading(false);
    });
  }

  async function handleMessageAction(e: CustomEvent) {
    const { messageId, action } = (e.detail ?? {}) as { messageId: string; action: string };
    const msgs = allMessages[activeId] ?? [];
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return;

    if (action === 'copy') {
      try { await navigator.clipboard.writeText(msg.content); showToast('Copied to clipboard'); }
      catch { showToast('Copy failed'); }
    } else if (action === 'like') {
      showToast('Glad it helped!');
    } else if (action === 'dislike') {
      showToast('Thanks — noted.');
    } else if (action === 'regenerate') {
      const idx = msgs.findIndex((m) => m.id === messageId);
      const replyId = 'a' + generateId();
      setAllMessages((prev) => ({
        ...prev,
        [activeId]: [
          ...(prev[activeId] ?? []).slice(0, idx),
          { id: replyId, role: 'assistant' as const, content: '' },
        ],
      }));
      setLoading(true);
      streamReply(buildReply('regenerated answer'), (partial, done) => {
        setAllMessages((prev) => ({
          ...prev,
          [activeId]: (prev[activeId] ?? []).map((m) =>
            m.id === replyId
              ? { ...m, content: partial, actions: done ? (['copy', 'like', 'dislike', 'regenerate'] as MessageAction[]) : undefined }
              : m,
          ),
        }));
        if (done) setLoading(false);
      });
    }
  }

  function handleModelChange(e: CustomEvent) {
    const { modelId } = (e.detail ?? {}) as { modelId: string };
    setCurrentModel(modelId);
    showToast(`Model → ${MODELS.find((m) => m.id === modelId)?.name ?? modelId}`);
  }

  // ---- KitnConversationList handlers ----------------------------------------
  function handleSelect(e: CustomEvent) {
    const { id } = (e.detail ?? {}) as { id: string };
    setActiveId(id);
    document.body.classList.remove('sidebar-open');
  }

  function handleNewChat() {
    const id = 'c-' + generateId();
    const newConv: Conversation = {
      id,
      title: 'New chat',
      groupId: 'g-work',
      scope: { type: 'collection' },
      messageCount: 0,
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setAllMessages((prev) => ({ ...prev, [id]: [] }));
    setActiveId(id);
    document.body.classList.remove('sidebar-open');
  }

  function handleToggleSidebar() {
    document.body.classList.toggle('sidebar-open');
  }

  // ---- standalone KitnPromptInput handler -----------------------------------
  function handleStandaloneSubmit(e: CustomEvent) {
    const { value } = (e.detail ?? {}) as { value?: string };
    const text = (value ?? '').trim();
    if (!text) return;
    setDraftSubmissions((prev) => [text, ...prev].slice(0, 5));
  }

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' || (prev === 'auto' && !isDark) ? 'dark' : 'light'));
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        background: isDark ? '#0a0a0b' : '#ffffff',
        color: isDark ? '#fafafa' : '#18181b',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          padding: '0 14px',
          borderBottom: `1px solid ${isDark ? '#27272a' : '#e5e5e5'}`,
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
          <img src="../shared/logo.svg" alt="" width={20} height={20} />
          kitn-chat · React example (generated wrappers)
        </span>

        <button
          onClick={toggleTheme}
          aria-label="Toggle light/dark"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 9,
            border: `1px solid ${isDark ? '#3f3f46' : '#d4d4d8'}`,
            background: isDark ? '#18181b' : '#fff',
            color: isDark ? '#fafafa' : '#18181b',
            cursor: 'pointer',
          }}
          dangerouslySetInnerHTML={{ __html: isDark ? MOON_SVG : SUN_SVG }}
        />
      </header>

      {/* Main area: sidebar + chat */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/*
          Native-feeling React: array/object props + on<Event> handlers + theme.
          No ref / useEffect / addEventListener in sight.
        */}
        <KitnConversationList
          groups={GROUPS}
          conversations={conversations}
          activeId={activeId}
          theme={theme}
          onSelect={handleSelect}
          onNewchat={handleNewChat}
          onTogglesidebar={handleToggleSidebar}
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: `1px solid ${isDark ? '#27272a' : '#e5e5e5'}`,
          }}
        />

        <KitnChat
          messages={messages}
          models={MODELS}
          currentModel={currentModel}
          context={CONTEXT}
          suggestions={SUGGESTIONS}
          slashCommands={SLASH_COMMANDS}
          loading={loading}
          theme={theme}
          onSubmit={handleSubmit}
          onModelchange={handleModelChange}
          onMessageaction={handleMessageAction}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>

      {/* Standalone KitnPromptInput — proves a leaf wrapper works on its own. */}
      <div
        style={{
          borderTop: `1px solid ${isDark ? '#27272a' : '#e5e5e5'}`,
          padding: '10px 14px',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
          Standalone &lt;KitnPromptInput&gt; (try typing <code>/</code> for slash commands):
        </div>
        <KitnPromptInput
          placeholder="Standalone prompt input…"
          slashCommands={SLASH_COMMANDS}
          theme={theme}
          onSubmit={handleStandaloneSubmit}
        />
        {draftSubmissions.length > 0 && (
          <ul style={{ fontSize: 12, opacity: 0.7, margin: '8px 0 0', paddingLeft: 18 }}>
            {draftSubmissions.map((d, i) => (
              <li key={i}>submitted: {d}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#18181b',
            color: '#fafafa',
            font: '500 13px system-ui, sans-serif',
            padding: '8px 14px',
            borderRadius: 8,
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          {toast}
        </div>
      )}

      {/* Responsive sidebar overlay styles injected once */}
      <style>{`
        @media (max-width: 720px) {
          kitn-conversation-list {
            position: fixed !important;
            inset: 49px auto 0 0;
            height: calc(100vh - 49px);
            width: 280px !important;
            z-index: 10;
            transform: translateX(-100%);
            transition: transform .2s ease;
          }
          body.sidebar-open kitn-conversation-list {
            transform: translateX(0);
            box-shadow: 0 0 0 9999px rgba(0,0,0,.35);
          }
        }
      `}</style>
    </div>
  );
}
