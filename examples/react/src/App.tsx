/**
 * kc-chat React example — using the generated wrappers.
 *
 * The kit is built with SolidJS but ships framework-agnostic custom elements.
 * `@kitn.ai/chat/react` provides typed React wrappers (Chat, PromptInput,
 * Conversations, …) that make the elements feel native:
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
import '@kitn.ai/chat/elements';
// Typed React wrappers — the whole point of this example.
import { Chat, Conversations, PromptInput } from '@kitn.ai/chat/react';

// Shared sample data and types (also used by other framework examples).
import {
  SAMPLE_GROUPS,
  SAMPLE_CONVERSATIONS,
  SAMPLE_MESSAGES,
  SAMPLE_MODELS,
  SAMPLE_CONTEXT,
  SAMPLE_SUGGESTIONS,
  SAMPLE_SLASH_COMMANDS,
  type SampleMessage,
} from '../../shared/sample-data';

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'auto';

// SampleMessage is already the shape we need; alias it locally for clarity.
type ChatMessage = SampleMessage;

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function buildReply(text: string): string {
  return `Thanks for your message!\n\n> ${text}\n\nThis canned reply was appended to the \`messages\` prop in React state — proving array round-tripping through the wrapper.`;
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

const SUN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const MOON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

// ── Component ─────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<Theme>('auto');
  const [conversations, setConversations] = useState(SAMPLE_CONVERSATIONS);
  const [activeId, setActiveId] = useState('c-1');
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(SAMPLE_MESSAGES);
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

  // ── Chat handlers ────────────────────────────────────────────────────────

  function handleSubmit(e: CustomEvent) {
    const { value, attachments } = (e.detail ?? {}) as { value?: string; attachments?: unknown[] };
    const text = (value ?? '').trim();
    if (!text && !(attachments ?? []).length) return;

    const userMsg: ChatMessage = { id: 'u' + generateId(), role: 'user', content: text };
    const replyId = 'a' + generateId();

    // Append to the messages array in React state → re-renders Chat with a
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
            ? {
                ...m,
                content: partial,
                actions: done
                  ? (['copy', 'like', 'dislike', 'regenerate'] as ChatMessage['actions'])
                  : undefined,
              }
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
      try {
        await navigator.clipboard.writeText(msg.content);
        showToast('Copied to clipboard');
      } catch {
        showToast('Copy failed');
      }
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
              ? {
                  ...m,
                  content: partial,
                  actions: done
                    ? (['copy', 'like', 'dislike', 'regenerate'] as ChatMessage['actions'])
                    : undefined,
                }
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
    showToast(`Model → ${SAMPLE_MODELS.find((m) => m.id === modelId)?.name ?? modelId}`);
  }

  // ── Conversations handlers ────────────────────────────────────────────

  function handleSelect(e: CustomEvent) {
    const { id } = (e.detail ?? {}) as { id: string };
    setActiveId(id);
    document.body.classList.remove('sidebar-open');
  }

  function handleNewChat() {
    const id = 'c-' + generateId();
    setConversations((prev) => [
      {
        id,
        title: 'New chat',
        groupId: 'g-work',
        scope: { type: 'collection' as const },
        messageCount: 0,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setAllMessages((prev) => ({ ...prev, [id]: [] }));
    setActiveId(id);
    document.body.classList.remove('sidebar-open');
  }

  function handleToggleSidebar() {
    document.body.classList.toggle('sidebar-open');
  }

  // ── Standalone PromptInput handler ──────────────────────────────────────

  function handleStandaloneSubmit(e: CustomEvent) {
    const { value } = (e.detail ?? {}) as { value?: string };
    const text = (value ?? '').trim();
    if (!text) return;
    setDraftSubmissions((prev) => [text, ...prev].slice(0, 5));
  }

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' || (prev === 'auto' && !isDark) ? 'dark' : 'light'));
  }

  // Dynamic border/background colors are inlined only where they vary with isDark;
  // static layout rules live in App.css.
  const borderColor = isDark ? '#27272a' : '#e5e5e5';

  return (
    <div
      className="app-shell"
      style={{
        background: isDark ? '#0a0a0b' : '#ffffff',
        color: isDark ? '#fafafa' : '#18181b',
      }}
    >
      {/* Top bar */}
      <header
        className="topbar"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <span className="topbar-brand">
          <img src="../shared/logo.svg" alt="" width={20} height={20} />
          kc-chat · React example (generated wrappers)
        </span>

        <button
          onClick={toggleTheme}
          aria-label="Toggle light/dark"
          className="theme-btn"
          style={{
            border: `1px solid ${isDark ? '#3f3f46' : '#d4d4d8'}`,
            background: isDark ? '#18181b' : '#fff',
            color: isDark ? '#fafafa' : '#18181b',
          }}
          dangerouslySetInnerHTML={{ __html: isDark ? MOON_SVG : SUN_SVG }}
        />
      </header>

      {/* Main area: sidebar + chat */}
      <div className="main-area">
        {/*
          Native-feeling React: array/object props + on<Event> handlers + theme.
          No ref / useEffect / addEventListener in sight.
        */}
        <Conversations
          groups={SAMPLE_GROUPS}
          conversations={conversations}
          activeId={activeId}
          theme={theme}
          onSelect={handleSelect}
          onNewchat={handleNewChat}
          onTogglesidebar={handleToggleSidebar}
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: `1px solid ${borderColor}`,
          }}
        />

        <Chat
          messages={messages}
          models={SAMPLE_MODELS}
          currentModel={currentModel}
          context={SAMPLE_CONTEXT}
          suggestions={SAMPLE_SUGGESTIONS}
          slashCommands={SAMPLE_SLASH_COMMANDS}
          loading={loading}
          theme={theme}
          onSubmit={handleSubmit}
          onModelchange={handleModelChange}
          onMessageaction={handleMessageAction}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>

      {/* Standalone PromptInput — proves a leaf wrapper works on its own. */}
      <div
        className="standalone-section"
        style={{ borderTop: `1px solid ${borderColor}` }}
      >
        <div className="standalone-label">
          Standalone &lt;PromptInput&gt; (try typing <code>/</code> for slash commands):
        </div>
        <PromptInput
          placeholder="Standalone prompt input…"
          slashCommands={SAMPLE_SLASH_COMMANDS}
          theme={theme}
          onSubmit={handleStandaloneSubmit}
        />
        {draftSubmissions.length > 0 && (
          <ul className="draft-list">
            {draftSubmissions.map((d, i) => (
              <li key={i}>submitted: {d}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast notification */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
