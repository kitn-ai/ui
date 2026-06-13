<!--
  kc-chat Vue 3 example — using web components natively.

  Vue can bind to custom-element DOM properties with the `.prop` modifier:
    :prop.prop="value"  — sets the DOM *property* (not a stringified attribute);
                          essential for passing arrays/objects into Shadow-DOM
                          web components.

  CustomEvents are listened to with @event="handler":
    @submit="onSubmit"  — `$event` is the raw CustomEvent; `.detail` carries the
                          payload.

  vite.config.ts declares `isCustomElement: (tag) => tag.startsWith('kitn-')`
  so Vue treats kitn-* tags as native custom elements rather than Vue components
  (no "Unknown custom element" warnings).

  `@kitnai/chat/elements` is imported once (main.ts side-effect) to register
  the custom elements globally — BEFORE this component mounts.
-->

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';

// Shared sample data (also used by React / Angular examples).
import {
  SAMPLE_GROUPS,
  SAMPLE_CONVERSATIONS,
  SAMPLE_MESSAGES,
  SAMPLE_MODELS,
  SAMPLE_CONTEXT,
  SAMPLE_SUGGESTIONS,
  SAMPLE_SLASH_COMMANDS,
  type SampleMessage,
  type SampleConversation,
} from '../../shared/sample-data';

// ── Types ──────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'auto';
type ChatMessage = SampleMessage;

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function buildReply(text: string): string {
  return `Thanks for your message!\n\n> ${text}\n\nThis canned reply was appended to the \`messages\` property via Vue refs — proving array round-tripping through the web component binding.`;
}

/** "Streams" a reply word-by-word, calling onChunk on each tick. */
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

// ── Reactive state ─────────────────────────────────────────────────────────────

const theme = ref<Theme>('auto');
const conversations = ref<SampleConversation[]>(SAMPLE_CONVERSATIONS);
const activeId = ref<string>('c-1');
const allMessages = reactive<Record<string, ChatMessage[]>>(
  // Deep clone so mutations don't affect the imported constant
  Object.fromEntries(
    Object.entries(SAMPLE_MESSAGES).map(([k, v]) => [k, [...v]]),
  ),
);
const currentModel = ref<string>('sonnet');
const loading = ref<boolean>(false);
const toast = ref<string | null>(null);
const draftSubmissions = ref<string[]>([]);

// ── Derived ────────────────────────────────────────────────────────────────────

/** Messages for the active conversation. */
const messages = computed(() => allMessages[activeId.value] ?? []);

/** Is the effective theme dark right now? */
const isDark = computed(() => {
  const t = theme.value;
  const systemDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return t === 'dark' || (t === 'auto' && systemDark);
});

const borderColor = computed(() =>
  isDark.value ? '#27272a' : '#e5e5e5',
);
const appBackground = computed(() =>
  isDark.value ? '#0a0a0b' : '#ffffff',
);
const appColor = computed(() =>
  isDark.value ? '#fafafa' : '#18181b',
);
const themeIconHtml = computed(() =>
  isDark.value ? MOON_SVG : SUN_SVG,
);

// ── Static data passed as .prop bindings to the web components ─────────────────

const groups = SAMPLE_GROUPS;
const models = SAMPLE_MODELS;
const context = SAMPLE_CONTEXT;
const suggestions = SAMPLE_SUGGESTIONS;
const slashCommands = SAMPLE_SLASH_COMMANDS;

// ── Helpers ────────────────────────────────────────────────────────────────────

function showToast(msg: string): void {
  toast.value = msg;
  setTimeout(() => { toast.value = null; }, 1600);
}

function toggleTheme(): void {
  const wasDark = isDark.value;
  theme.value = wasDark ? 'light' : 'dark';
}

// ── kc-workspace event handlers ─────────────────────────────────────────

/**
 * @submit — fired when the user sends a message.
 * Vue listens to CustomEvents with @event="handler".
 * `$event` is the raw Event; cast to CustomEvent to access `.detail`.
 */
function onSubmit(event: Event): void {
  const { value, attachments } = ((event as CustomEvent).detail ?? {}) as {
    value?: string;
    attachments?: unknown[];
  };
  const text = (value ?? '').trim();
  if (!text && !(attachments ?? []).length) return;

  const userMsg: ChatMessage = { id: 'u' + generateId(), role: 'user', content: text };
  const replyId = 'a' + generateId();
  const id = activeId.value;

  // Append user message + empty assistant placeholder.
  if (!allMessages[id]) allMessages[id] = [];
  allMessages[id] = [
    ...allMessages[id],
    userMsg,
    { id: replyId, role: 'assistant', content: '' },
  ];
  loading.value = true;

  streamReply(buildReply(text || 'your attachment'), (partial, done) => {
    allMessages[id] = (allMessages[id] ?? []).map((m) =>
      m.id === replyId
        ? {
            ...m,
            content: partial,
            actions: done
              ? (['copy', 'like', 'dislike', 'regenerate'] as ChatMessage['actions'])
              : undefined,
          }
        : m,
    );
    if (done) loading.value = false;
  });
}

/**
 * @messageaction — copy, like, dislike, regenerate actions on messages.
 */
async function onMessageAction(event: Event): Promise<void> {
  const { messageId, action } = ((event as CustomEvent).detail ?? {}) as {
    messageId: string;
    action: string;
  };
  const id = activeId.value;
  const msgs = allMessages[id] ?? [];
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
    allMessages[id] = [
      ...msgs.slice(0, idx),
      { id: replyId, role: 'assistant' as const, content: '' },
    ];
    loading.value = true;
    streamReply(buildReply('regenerated answer'), (partial, done) => {
      allMessages[id] = (allMessages[id] ?? []).map((m) =>
        m.id === replyId
          ? {
              ...m,
              content: partial,
              actions: done
                ? (['copy', 'like', 'dislike', 'regenerate'] as ChatMessage['actions'])
                : undefined,
            }
          : m,
      );
      if (done) loading.value = false;
    });
  }
}

/**
 * @modelchange — user switched the active model.
 */
function onModelChange(event: Event): void {
  const { modelId } = ((event as CustomEvent).detail ?? {}) as { modelId: string };
  currentModel.value = modelId;
  showToast(
    `Model → ${SAMPLE_MODELS.find((m) => m.id === modelId)?.name ?? modelId}`,
  );
}

/**
 * @conversationselect — user clicked a conversation in the sidebar.
 */
function onConversationSelect(event: Event): void {
  const { id } = ((event as CustomEvent).detail ?? {}) as { id: string };
  activeId.value = id;
  document.body.classList.remove('sidebar-open');
}

/**
 * @newchat — user clicked "New chat" in the sidebar.
 */
function onNewChat(): void {
  const id = 'c-' + generateId();
  conversations.value = [
    {
      id,
      title: 'New chat',
      groupId: 'g-work',
      scope: { type: 'collection' as const },
      messageCount: 0,
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...conversations.value,
  ];
  allMessages[id] = [];
  activeId.value = id;
  document.body.classList.remove('sidebar-open');
}

/**
 * @sidebartoggle — hamburger / toggle from within the workspace.
 */
function onSidebarToggle(): void {
  document.body.classList.toggle('sidebar-open');
}

// ── Standalone kc-prompt-input handler ───────────────────────────────────────

function onStandaloneSubmit(event: Event): void {
  const { value } = ((event as CustomEvent).detail ?? {}) as { value?: string };
  const text = (value ?? '').trim();
  if (!text) return;
  draftSubmissions.value = [text, ...draftSubmissions.value].slice(0, 5);
}
</script>

<template>
  <!--
    kc-chat Vue 3 example template.

    Key Vue web-component patterns:
      :prop.prop="value"   — the `.prop` modifier sets the DOM *property*
                             (not a stringified attribute); required for passing
                             arrays / objects into Shadow-DOM custom elements.
      @event="handler"     — listens for CustomEvents by lowercase event name;
                             `$event` is the raw Event, cast inside the handler.
  -->
  <div
    class="app-shell"
    :style="{ background: appBackground, color: appColor }"
  >
    <!-- Top bar -->
    <header class="topbar" :style="{ borderBottom: '1px solid ' + borderColor }">
      <span class="topbar-brand">
        <img src="../../shared/logo.svg" alt="" width="20" height="20" />
        kc-chat &middot; Vue example (web components)
      </span>

      <button
        @click="toggleTheme"
        aria-label="Toggle light/dark"
        class="theme-btn"
        :style="{
          border: '1px solid ' + (isDark ? '#3f3f46' : '#d4d4d8'),
          background: isDark ? '#18181b' : '#fff',
          color: isDark ? '#fafafa' : '#18181b',
        }"
        v-html="themeIconHtml"
      ></button>
    </header>

    <!-- Main area: the flagship <kc-workspace> element.
         :prop.prop sets DOM properties; @event listens for CustomEvents.
         The `.prop` modifier is critical — without it Vue would stringify
         arrays/objects as attributes and the elements would receive "[object Object]". -->
    <div class="main-area">
      <!--
        <kc-workspace> is the batteries-included shell: sidebar +
        conversation list + chat panel + resize handle, all in one element.

        Property bindings (:prop.prop):
          - :groups.prop          SampleGroup[]        — sidebar group headers
          - :conversations.prop   SampleConversation[] — sidebar conversation list
          - :activeId.prop        string               — highlighted conversation
          - :messages.prop        SampleMessage[]      — chat message thread
          - :models.prop          SampleModel[]        — model picker options
          - :currentModel.prop    string               — selected model id
          - :context.prop         object               — token-usage context meter
          - :suggestions.prop     string[]             — prompt suggestions
          - :slashCommands.prop   object[]             — slash-command items
          - :loading.prop         boolean              — streaming / loading state
          - :theme.prop           'light'|'dark'|'auto'

        Event bindings (@event):
          - @submit               — user sends a message
          - @messageaction        — copy / like / dislike / regenerate
          - @modelchange          — model picker changed
          - @conversationselect   — sidebar item clicked
          - @newchat              — "New chat" button clicked
          - @sidebartoggle        — hamburger / sidebar toggle
      -->
      <kc-workspace
        :groups.prop="groups"
        :conversations.prop="conversations"
        :activeId.prop="activeId"
        :messages.prop="messages"
        :models.prop="models"
        :currentModel.prop="currentModel"
        :context.prop="context"
        :suggestions.prop="suggestions"
        :slashCommands.prop="slashCommands"
        :loading.prop="loading"
        :theme.prop="theme"
        @submit="onSubmit"
        @messageaction="onMessageAction"
        @modelchange="onModelChange"
        @conversationselect="onConversationSelect"
        @newchat="onNewChat"
        @sidebartoggle="onSidebarToggle"
        style="flex: 1; min-height: 0;"
      ></kc-workspace>
    </div>

    <!-- Standalone <kc-prompt-input> — proves a leaf element works on its own. -->
    <div class="standalone-section" :style="{ borderTop: '1px solid ' + borderColor }">
      <div class="standalone-label">
        Standalone &lt;kc-prompt-input&gt; (try typing <code>/</code> for slash commands):
      </div>
      <kc-prompt-input
        placeholder="Standalone prompt input…"
        :slashCommands.prop="slashCommands"
        :theme.prop="theme"
        @submit="onStandaloneSubmit"
      ></kc-prompt-input>
      <ul v-if="draftSubmissions.length > 0" class="draft-list">
        <li v-for="d in draftSubmissions" :key="d">submitted: {{ d }}</li>
      </ul>
    </div>

    <!-- Toast notification -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style>
/* ── App shell ───────────────────────────────────────────────────────────── */

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, sans-serif;
}

/* ── Top bar ─────────────────────────────────────────────────────────────── */

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 14px;
  flex-shrink: 0;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
}

/* ── Theme toggle button ─────────────────────────────────────────────────── */

.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  cursor: pointer;
}

/* ── Main area ───────────────────────────────────────────────────────────── */

.main-area {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ── Standalone prompt input section ─────────────────────────────────────── */

.standalone-section {
  padding: 10px 14px;
  flex-shrink: 0;
}

.standalone-label {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 6px;
}

.draft-list {
  font-size: 12px;
  opacity: 0.7;
  margin: 8px 0 0;
  padding-left: 18px;
}

/* ── Toast notification ──────────────────────────────────────────────────── */

.toast {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: #18181b;
  color: #fafafa;
  font: 500 13px system-ui, sans-serif;
  padding: 8px 14px;
  border-radius: 8px;
  z-index: 50;
  pointer-events: none;
}
</style>
