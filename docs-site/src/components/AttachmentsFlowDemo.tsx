/** Live demo for "Attachments flow" — shows the full round-trip:
 *  1. kc-file-upload stages files into kc-prompt-input
 *  2. On kc-submit the user turn is rendered as a kc-message with attachments
 *  3. The assistant turn acknowledges the files
 *
 *  Uses imperative DOM (same pattern as ComposedShell) so kc-* props are set
 *  as JS properties, not HTML attributes. */
import { createSignal, onMount, onCleanup } from 'solid-js';
import { loadKit } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;

interface AttachmentData {
  id: string;
  type: 'file' | 'source-document';
  filename?: string;
  mediaType?: string;
  url?: string;
  title?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: AttachmentData[];
  actions?: string[];
}

const SEED: AttachmentData[] = [
  { id: 'seed-1', type: 'file', filename: 'design-spec.pdf', mediaType: 'application/pdf' },
  { id: 'seed-2', type: 'file', filename: 'screenshot.png', mediaType: 'image/png' },
];

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'u0',
    role: 'user',
    content: 'Can you review these files?',
    attachments: [
      { id: 'prev-1', type: 'file', filename: 'architecture.pdf', mediaType: 'application/pdf' },
    ],
  },
  {
    id: 'a0',
    role: 'assistant',
    content:
      "Got it — I can see **architecture.pdf**. The files appear inline on the user's message above, just as they will on anything you submit below. Stage some files using the drop zone, then hit send.",
    actions: ['copy'],
  },
];

const REPLY = (filenames: string[]) =>
  filenames.length === 0
    ? "No files attached this time — that's fine. Send text alone whenever you need to."
    : `Received ${filenames.length === 1 ? `**${filenames[0]}**` : `${filenames.length} files (${filenames.map((f) => `**${f}**`).join(', ')})`}. The \`kc-submit\` event carries \`{ value, attachments }\` — forward the \`attachments\` array straight to your model API.`;

let uid = 0;
const nextId = () => `af${++uid}`;

export default function AttachmentsFlowDemo() {
  let promptEl: AnyEl | undefined;
  let uploadEl: AnyEl | undefined;
  let threadEl: HTMLElement | undefined;
  let timer: number | undefined;

  const [stagedCount, setStagedCount] = createSignal(0);
  const theme = () => document.documentElement.dataset.theme ?? 'light';

  let thread: ChatMessage[] = [...SEED_MESSAGES];

  const renderThread = () => {
    if (!threadEl) return;
    const existing = Array.from(threadEl.children) as AnyEl[];
    thread.forEach((m, i) => {
      let el = existing[i];
      if (!el) {
        el = document.createElement('kc-message') as unknown as AnyEl;
        el.setAttribute('theme', theme());
        threadEl!.append(el as unknown as HTMLElement);
      }
      el.message = m;
    });
    while (threadEl.children.length > thread.length) {
      threadEl.removeChild(threadEl.lastChild!);
    }
    const scroll = threadEl.parentElement;
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  };

  const onFilesAdded = (e: Event) => {
    const files: File[] = (e as CustomEvent).detail?.files ?? [];
    if (!files.length || !promptEl) return;

    // Read the element's current staged attachments and append the new ones.
    // kc-prompt-input manages its own staged list after the initial seed —
    // here we re-seed with merged data so the demo stays self-contained.
    const current: AttachmentData[] = (promptEl.attachments as AttachmentData[] | undefined) ?? [];
    const added: AttachmentData[] = files.map((f) => ({
      id: crypto.randomUUID(),
      type: 'file' as const,
      filename: f.name,
      mediaType: f.type || undefined,
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
    promptEl.attachments = [...current, ...added];
    setStagedCount((promptEl.attachments as AttachmentData[]).length);
  };

  const onSubmit = (e: Event) => {
    const { value, attachments } = (e as CustomEvent).detail as {
      value: string;
      attachments: AttachmentData[];
    };
    const text = value.trim();
    if (!text && attachments.length === 0) return;

    setStagedCount(0);

    const aId = nextId();
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: text || '',
      ...(attachments.length > 0 ? { attachments } : {}),
    };
    thread = [...thread, userMsg, { id: aId, role: 'assistant', content: '' }];
    renderThread();
    if (promptEl) promptEl.loading = true;

    const filenames = attachments.map((a) => a.filename ?? 'file').filter(Boolean);
    const words = REPLY(filenames).split(/(\s+)/);
    let i = 0;
    clearTimeout(timer);
    const tick = () => {
      i += 2;
      const done = i >= words.length;
      thread = thread.map((m) =>
        m.id === aId
          ? { ...m, content: words.slice(0, i).join(''), ...(done ? { actions: ['copy'] } : {}) }
          : m,
      );
      renderThread();
      if (!done) timer = window.setTimeout(tick, 38);
      else if (promptEl) promptEl.loading = false;
    };
    timer = window.setTimeout(tick, 260);
  };

  onMount(async () => {
    await loadKit();

    if (uploadEl) {
      customElements.upgrade(uploadEl as HTMLElement);
      uploadEl.setAttribute('theme', theme());
      uploadEl.addEventListener('kc-files-added', onFilesAdded);
    }

    if (promptEl) {
      customElements.upgrade(promptEl as HTMLElement);
      // Seed two staged attachments so the demo shows the pre-populated state.
      promptEl.attachments = SEED;
      setStagedCount(SEED.length);
      promptEl.setAttribute('placeholder', 'Ask about the attached files…');
      promptEl.setAttribute('theme', theme());
      promptEl.addEventListener('kc-submit', onSubmit);
    }

    renderThread();

    const obs = new MutationObserver(() => {
      const t = theme();
      uploadEl?.setAttribute('theme', t);
      promptEl?.setAttribute('theme', t);
      if (threadEl) {
        for (const child of Array.from(threadEl.children)) {
          (child as HTMLElement).setAttribute('theme', t);
        }
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    onCleanup(() => {
      clearTimeout(timer);
      uploadEl?.removeEventListener('kc-files-added', onFilesAdded);
      promptEl?.removeEventListener('kc-submit', onSubmit);
      obs.disconnect();
    });
  });

  return (
    <div
      class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface"
      style={{ height: '580px', display: 'flex', 'flex-direction': 'column' } as any}
    >
      {/* Upload drop zone — compact strip above the thread */}
      <div
        style={{
          'border-bottom': '1px solid var(--kc-line, rgba(0,0,0,0.09))',
          padding: '10px 16px',
          'flex-shrink': '0',
        } as any}
      >
        {/* @ts-expect-error custom element */}
        <kc-file-upload
          ref={(el: HTMLElement) => (uploadEl = el as AnyEl)}
          label="Drop files here or click to browse"
          style={{ display: 'block' }}
        />
      </div>

      {/* Scrollable message thread */}
      <div
        style={{
          flex: '1',
          'min-height': '0',
          'overflow-y': 'auto',
          padding: '16px',
        } as any}
      >
        <div
          ref={(el: HTMLElement) => { threadEl = el; }}
          style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' } as any}
        />
      </div>

      {/* Composer — kc-prompt-input manages staged chips internally */}
      <div
        style={{
          'border-top': '1px solid var(--kc-line, rgba(0,0,0,0.09))',
          padding: '12px 16px',
          'flex-shrink': '0',
        } as any}
      >
        {stagedCount() > 0 && (
          <div
            style={{
              'font-size': '0.75rem',
              color: 'var(--kc-muted-foreground, #888)',
              'margin-bottom': '6px',
            } as any}
          >
            {stagedCount()} file{stagedCount() !== 1 ? 's' : ''} staged — hit send to attach
          </div>
        )}
        {/* @ts-expect-error custom element */}
        <kc-prompt-input
          ref={(el: HTMLElement) => (promptEl = el as AnyEl)}
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}
