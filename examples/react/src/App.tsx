/**
 * kitn-chat React example
 *
 * The kit is built with SolidJS, but ships framework-agnostic custom elements
 * (web components). Importing '@kitnai/chat/elements' registers
 * <kitn-chat>, <kitn-conversation-list>, and <kitn-prompt-input> as side effects.
 *
 * React (even v19) doesn't set DOM *properties* on custom elements — it only
 * sets *attributes*, which stringify objects to "[object Object]". The fix:
 *   1. Give each element a ref.
 *   2. In a useEffect, set the JS properties directly on the DOM node.
 *   3. In the same effect, attach native addEventListener listeners for custom events.
 *   4. Return a cleanup function that removes the listeners.
 */

import { useEffect, useRef, useState } from 'react';

// Side-effect import: registers the three custom elements globally.
import '@kitnai/chat/elements';

// --- types ------------------------------------------------------------------

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: { label: string; text: string };
  tools?: unknown[];
  attachments?: { id: string; type: string; filename: string; mediaType?: string; url?: string; title?: string }[];
  actions?: string[];
};

type Conversation = {
  id: string;
  title: string;
  groupId: string;
  scope: { type: string };
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
    {
      id: 'm1', role: 'user',
      content: 'How do I use kitn-chat web components inside a React app?',
    },
    {
      id: 'm2', role: 'assistant', actions: ['copy', 'like', 'dislike'],
      content: "Import `'@kitnai/chat/elements'` as a side effect to register the custom elements, then use `ref` + `useEffect` to set JS *properties* (not attributes) and wire up `addEventListener` for custom events.\n\n```tsx\nconst chatRef = useRef<HTMLElement>(null);\n\nuseEffect(() => {\n  const el = chatRef.current;\n  if (!el) return;\n  el.messages = messages;\n  const handler = (e) => console.log(e.detail);\n  el.addEventListener('submit', handler);\n  return () => el.removeEventListener('submit', handler);\n}, [messages]);\n```\n\nThis example shows the full pattern in action.",
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

const SUGGESTIONS = [
  'How do custom events work in React?',
  'Show me a streaming example',
  'What is SolidJS?',
];

// --- helpers -----------------------------------------------------------------

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function buildReply(text: string): string {
  return `Thanks for your message!\n\n> ${text}\n\nThis is a canned demo reply. In a real app, wire the \`submit\` event to your backend and stream the model's response into the \`messages\` prop.`;
}

/** "Streams" a reply word-by-word, updating state on each tick. */
function streamReply(
  fullText: string,
  onChunk: (partial: string, done: boolean) => void,
): () => void {
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

// --- Sun / Moon SVG icons ----------------------------------------------------

const SUN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const MOON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

// --- component ---------------------------------------------------------------

export default function App() {
  // ---- state
  const [theme, setTheme] = useState<Theme>('auto');
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState('c-1');
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Convenience: messages for the active conversation.
  const messages = allMessages[activeId] ?? [];

  // ---- refs to the custom elements
  const chatRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);

  // ---- dark-mode derivation
  const systemDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'auto' && systemDark);

  // ---- toast helper
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  // ---- Wire <kitn-chat> properties + events ---------------------------------
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;

    // Set JS properties (React would stringify these as attributes otherwise)
    (el as unknown as Record<string, unknown>)['messages'] = messages;
    (el as unknown as Record<string, unknown>)['suggestions'] = SUGGESTIONS;
    (el as unknown as Record<string, unknown>)['loading'] = loading;
    (el as unknown as Record<string, unknown>)['theme'] = theme;
  }, [messages, loading, theme]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;

    // `submit` — user sends a message
    function onSubmit(e: Event) {
      const { value, attachments } = (e as CustomEvent<{ value: string; attachments: unknown[] }>).detail;
      const text = (value ?? '').trim();
      if (!text && !(attachments ?? []).length) return;

      const userMsg: ChatMessage = {
        id: 'u' + generateId(),
        role: 'user',
        content: text,
      };
      const replyId = 'a' + generateId();

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
              ? { ...m, content: partial, actions: done ? ['copy', 'like', 'dislike', 'regenerate'] : undefined }
              : m,
          ),
        }));
        if (done) setLoading(false);
      });
    }

    // `messageaction` — copy / like / dislike / regenerate
    async function onMessageAction(e: Event) {
      const { messageId, action } = (e as CustomEvent<{ messageId: string; action: string }>).detail;
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
                ? { ...m, content: partial, actions: done ? ['copy', 'like', 'dislike', 'regenerate'] : undefined }
                : m,
            ),
          }));
          if (done) setLoading(false);
        });
      }
    }

    el.addEventListener('submit', onSubmit);
    el.addEventListener('messageaction', onMessageAction);
    return () => {
      el.removeEventListener('submit', onSubmit);
      el.removeEventListener('messageaction', onMessageAction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, allMessages]);

  // ---- Wire <kitn-conversation-list> properties + events --------------------
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    (el as unknown as Record<string, unknown>)['groups'] = GROUPS;
    (el as unknown as Record<string, unknown>)['conversations'] = conversations;
    (el as unknown as Record<string, unknown>)['activeId'] = activeId;
    (el as unknown as Record<string, unknown>)['theme'] = theme;
  }, [conversations, activeId, theme]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    function onSelect(e: Event) {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      setActiveId(id);
      document.body.classList.remove('sidebar-open');
    }

    function onNewChat() {
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

    function onToggleSidebar() {
      document.body.classList.toggle('sidebar-open');
    }

    el.addEventListener('select', onSelect);
    el.addEventListener('newchat', onNewChat);
    el.addEventListener('togglesidebar', onToggleSidebar);
    return () => {
      el.removeEventListener('select', onSelect);
      el.removeEventListener('newchat', onNewChat);
      el.removeEventListener('togglesidebar', onToggleSidebar);
    };
  }, []);

  // ---- theme toggle ---------------------------------------------------------
  function toggleTheme() {
    setTheme((prev) => (prev === 'light' || (prev === 'auto' && !isDark) ? 'dark' : 'light'));
  }

  // ---- render ---------------------------------------------------------------
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
          kitn-chat · React example
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
          // Inline SVG via dangerouslySetInnerHTML so we don't need an icon lib
          dangerouslySetInnerHTML={{ __html: isDark ? MOON_SVG : SUN_SVG }}
        />
      </header>

      {/* Main area: sidebar + chat */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/*
          <kitn-conversation-list> is a custom element.
          We render it as a plain JSX tag (typed in global.d.ts) and pass a ref.
          All data and event listeners are wired in the useEffect hooks above.
        */}
        <kitn-conversation-list
          ref={listRef}
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: `1px solid ${isDark ? '#27272a' : '#e5e5e5'}`,
          }}
        />

        {/*
          <kitn-chat> is a custom element.
          Same pattern: ref + useEffect for properties and events.
        */}
        <kitn-chat
          ref={chatRef}
          style={{ flex: 1, minWidth: 0 }}
        />
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
