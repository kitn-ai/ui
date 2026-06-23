/**
 * kai-chat Angular example — using web components natively.
 *
 * Angular can bind to custom-element DOM properties with [prop]="value" and
 * listen to CustomEvents with (eventname)="handler($event)".  No wrappers or
 * adapters are needed — this is the whole point of the example.
 *
 * Key patterns demonstrated:
 *   - [groups], [conversations], [activeId], [messages], [models], [currentModel]
 *     set DOM *properties* (not attributes) — essential for passing objects/arrays
 *     to Shadow-DOM web components.
 *   - (kai-conversation-select), (kai-submit), (kai-model-change), (kai-sidebar-toggle) listen to the
 *     kit's CustomEvents; `($event as CustomEvent).detail` carries the payload.
 *   - CUSTOM_ELEMENTS_SCHEMA tells Angular to allow unknown `kai-*` element tags.
 *   - `@kitn.ai/ui/elements` is imported once (main.ts side-effect) to register
 *     the custom elements globally.
 */

import {
  Component,
  signal,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';

// Shared sample data (also used by React / Solid examples).
import {
  SAMPLE_GROUPS,
  SAMPLE_CONVERSATIONS,
  SAMPLE_MESSAGES,
  SAMPLE_MODELS,
  SAMPLE_CONTEXT,
  SAMPLE_SUGGESTIONS,
  SAMPLE_TRIGGERS,
  type SampleMessage,
  type SampleConversation,
} from '../../../shared/sample-data';

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'auto';
type ChatMessage = SampleMessage;

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function buildReply(text: string): string {
  return `Thanks for your message!\n\n> ${text}\n\nThis canned reply was appended to the \`messages\` property via Angular signals — proving array round-tripping through the web component binding.`;
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

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-root',
  standalone: true,
  // CUSTOM_ELEMENTS_SCHEMA is required so Angular accepts the kai-* tags
  // without treating them as unknown Angular components.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  // ── Signals (reactive state) ───────────────────────────────────────────────

  theme = signal<Theme>('auto');
  conversations = signal<SampleConversation[]>(SAMPLE_CONVERSATIONS);
  activeId = signal<string>('c-1');
  allMessages = signal<Record<string, ChatMessage[]>>(SAMPLE_MESSAGES);
  currentModel = signal<string>('sonnet');
  loading = signal<boolean>(false);
  toast = signal<string | null>(null);
  draftSubmissions = signal<string[]>([]);

  // Derived — messages for the active conversation.
  messages = computed(() => this.allMessages()[this.activeId()] ?? []);

  // Derived — is the current effective theme dark?
  isDark = computed(() => {
    const t = this.theme();
    const systemDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return t === 'dark' || (t === 'auto' && systemDark);
  });

  // Static data passed as [properties] to the web components.
  readonly groups = SAMPLE_GROUPS;
  readonly models = SAMPLE_MODELS;
  readonly context = SAMPLE_CONTEXT;
  readonly suggestions = SAMPLE_SUGGESTIONS;
  readonly triggers = SAMPLE_TRIGGERS;

  // ── Helpers ────────────────────────────────────────────────────────────────

  get themeIconHtml(): string {
    return this.isDark() ? MOON_SVG : SUN_SVG;
  }

  get borderColor(): string {
    return this.isDark() ? '#27272a' : '#e5e5e5';
  }

  get appBackground(): string {
    return this.isDark() ? '#0a0a0b' : '#ffffff';
  }

  get appColor(): string {
    return this.isDark() ? '#fafafa' : '#18181b';
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 1600);
  }

  toggleTheme(): void {
    const prev = this.theme();
    const wasDark = prev === 'dark' || (prev === 'auto' && this.isDark());
    this.theme.set(wasDark ? 'light' : 'dark');
  }

  // ── kai-workspace event handlers ────────────────────────────────────

  /**
   * `(kai-submit)` — fired when the user sends a message.
   * Angular binds CustomEvents by lowercase event name on the element.
   * `$event` is the raw CustomEvent; `.detail` carries the payload.
   */
  onSubmit(event: Event): void {
    const { value, attachments } = ((event as CustomEvent).detail ?? {}) as {
      value?: string;
      attachments?: unknown[];
    };
    const text = (value ?? '').trim();
    if (!text && !(attachments ?? []).length) return;

    const userMsg: ChatMessage = { id: 'u' + generateId(), role: 'user', content: text };
    const replyId = 'a' + generateId();
    const id = this.activeId();

    // Append user message + empty assistant placeholder.
    this.allMessages.update((prev) => ({
      ...prev,
      [id]: [...(prev[id] ?? []), userMsg, { id: replyId, role: 'assistant', content: '' }],
    }));
    this.loading.set(true);

    streamReply(buildReply(text || 'your attachment'), (partial, done) => {
      this.allMessages.update((prev) => ({
        ...prev,
        [id]: (prev[id] ?? []).map((m) =>
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
      if (done) this.loading.set(false);
    });
  }

  /**
   * `(kai-message-action)` — copy, like, dislike, regenerate actions on messages.
   */
  async onMessageAction(event: Event): Promise<void> {
    const { messageId, action } = ((event as CustomEvent).detail ?? {}) as {
      messageId: string;
      action: string;
    };
    const id = this.activeId();
    const msgs = this.allMessages()[id] ?? [];
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return;

    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(msg.content);
        this.showToast('Copied to clipboard');
      } catch {
        this.showToast('Copy failed');
      }
    } else if (action === 'like') {
      this.showToast('Glad it helped!');
    } else if (action === 'dislike') {
      this.showToast('Thanks — noted.');
    } else if (action === 'regenerate') {
      const idx = msgs.findIndex((m) => m.id === messageId);
      const replyId = 'a' + generateId();
      this.allMessages.update((prev) => ({
        ...prev,
        [id]: [...(prev[id] ?? []).slice(0, idx), { id: replyId, role: 'assistant' as const, content: '' }],
      }));
      this.loading.set(true);
      streamReply(buildReply('regenerated answer'), (partial, done) => {
        this.allMessages.update((prev) => ({
          ...prev,
          [id]: (prev[id] ?? []).map((m) =>
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
        if (done) this.loading.set(false);
      });
    }
  }

  /**
   * `(kai-model-change)` — user switched the active model.
   */
  onModelChange(event: Event): void {
    const { modelId } = ((event as CustomEvent).detail ?? {}) as { modelId: string };
    this.currentModel.set(modelId);
    this.showToast(
      `Model → ${SAMPLE_MODELS.find((m) => m.id === modelId)?.name ?? modelId}`,
    );
  }

  /**
   * `(kai-conversation-select)` — user clicked a conversation in the sidebar.
   */
  onConversationSelect(event: Event): void {
    const { id } = ((event as CustomEvent).detail ?? {}) as { id: string };
    this.activeId.set(id);
    document.body.classList.remove('sidebar-open');
  }

  /**
   * `(kai-new-chat)` — user clicked "New chat" in the sidebar.
   */
  onNewChat(): void {
    const id = 'c-' + generateId();
    this.conversations.update((prev) => [
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
    this.allMessages.update((prev) => ({ ...prev, [id]: [] }));
    this.activeId.set(id);
    document.body.classList.remove('sidebar-open');
  }

  /**
   * `(kai-sidebar-toggle)` — hamburger / toggle from within the workspace.
   */
  onSidebarToggle(): void {
    document.body.classList.toggle('sidebar-open');
  }

  // ── Standalone kai-prompt-input handler ──────────────────────────────────

  onStandaloneSubmit(event: Event): void {
    const { value } = ((event as CustomEvent).detail ?? {}) as { value?: string };
    const text = (value ?? '').trim();
    if (!text) return;
    this.draftSubmissions.update((prev) => [text, ...prev].slice(0, 5));
  }
}
