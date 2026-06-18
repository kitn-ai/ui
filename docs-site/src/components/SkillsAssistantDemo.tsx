/** Skills & slash-commands demo — mounts <kai-chat> with a realistic
 *  `slashCommands` list and a <kai-skills> strip of the assistant's
 *  capabilities. Typing "/" in the composer opens the command palette;
 *  choosing one (kai-slash-select) drives a tailored scripted streamed reply.
 *  Commands and skills are set as JS PROPERTIES after kit load. */
import { createSignal, onMount, onCleanup } from 'solid-js';
import { loadKit } from './example/kit';

interface SlashCommandItem {
  id: string;
  label: string;
  description?: string;
  category?: string;
}

interface Skill {
  id: string;
  name: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

interface Props {
  chatTitle?: string;
  placeholder?: string;
  height?: string;
}

const COMMANDS: SlashCommandItem[] = [
  { id: 'summarize', label: '/summarize', description: 'Condense a thread or document into key points', category: 'Writing' },
  { id: 'translate', label: '/translate', description: 'Translate text into another language', category: 'Writing' },
  { id: 'code-review', label: '/code-review', description: 'Review a diff for bugs and style', category: 'Engineering' },
  { id: 'search-docs', label: '/search-docs', description: 'Search the knowledge base and cite sources', category: 'Engineering' },
];

const SKILLS: Skill[] = [
  { id: 'summarize', name: 'Summarize' },
  { id: 'translate', name: 'Translate' },
  { id: 'code-review', name: 'Code Review' },
  { id: 'search-docs', name: 'Search Docs' },
];

// Tailored replies keyed by the command id chosen from the palette. The
// fallback covers free-form prompts that don't start with a known command.
const REPLIES: Record<string, string> = {
  summarize:
    'Here is the gist of the thread:\n\n' +
    '1. The deploy on **2026-06-14** introduced a memory leak in the worker pool.\n' +
    '2. Rolling back to `v2.3.1` restored steady-state memory within minutes.\n' +
    '3. The fix — disposing idle workers after 60s — is now in review on `fix/worker-pool-ttl`.\n\n' +
    'Net: incident resolved, root cause understood, durable fix pending merge.',
  translate:
    'Translated to Spanish:\n\n' +
    '> El nuevo panel de analiticas se publica el viernes. Avisame si necesitas acceso anticipado al entorno de pruebas.\n\n' +
    'I kept the tone semi-formal to match the original. Want a more casual register or a different target language?',
  'code-review':
    'Reviewed the diff in `auth/session.ts`. Three findings:\n\n' +
    '1. **Bug** — `refreshToken()` swallows the 401 from `/oauth/token`; a revoked session loops forever. Re-throw and bubble to the sign-out handler.\n' +
    '2. **Race** — two tabs can refresh concurrently; guard with a single in-flight promise.\n' +
    '3. **Nit** — `expiresAt` is compared as a string; parse to a number before the `<` check.\n\n' +
    'Lines 1 and 2 are blocking; line 3 is cosmetic.',
  'search-docs':
    'Found three relevant pages in the docs:\n\n' +
    '1. **Streaming replies** — driving the token loop from an SSE response.\n' +
    '2. **Theming** — overriding brand tokens via `kai-chat` CSS variables.\n' +
    '3. **Slash commands** — wiring `slashCommands` and the `kai-slash-select` event.\n\n' +
    'Want me to open any of these, or narrow the search?',
};

const FALLBACK_REPLY =
  'I can help with that. I also expose a few capabilities as slash commands — ' +
  'type `/` in the composer to pick one: **/summarize**, **/translate**, ' +
  '**/code-review**, or **/search-docs**.';

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'a0',
    role: 'assistant',
    content:
      "I'm your workspace assistant. Type `/` to see what I can do — summarize a " +
      'thread, translate text, review a diff, or search the docs.',
    actions: ['copy'],
  },
];

let uid = 0;
const nextId = () => `sa${++uid}`;

/** Match the leading "/command" token in a submitted prompt to a command id. */
function commandIdFor(text: string): string | undefined {
  const token = text.trim().match(/^\/(\S+)/)?.[1]?.toLowerCase();
  if (!token) return undefined;
  return COMMANDS.find((c) => c.label.slice(1).toLowerCase() === token)?.id;
}

export default function SkillsAssistantDemo(props: Props) {
  let host:
    | (HTMLElement & { messages?: ChatMessage[]; [k: string]: unknown })
    | undefined;
  let skillsEl: (HTMLElement & { skills?: Skill[] }) | undefined;
  const [, setReady] = createSignal(false);
  let timer: number | undefined;

  const theme = () => document.documentElement.dataset.theme || 'light';

  const streamReply = (aId: string, reply: string) => {
    const words = reply.split(/(\s+)/);
    let i = 0;
    clearTimeout(timer);
    const tick = () => {
      i += 2;
      const partial = words.slice(0, i).join('');
      const done = i >= words.length;
      host!.messages = (host!.messages ?? []).map((m) =>
        m.id === aId
          ? { ...m, content: partial, ...(done ? { actions: ['copy', 'like', 'dislike'] } : {}) }
          : m,
      );
      if (!done) {
        timer = window.setTimeout(tick, 34);
      } else {
        (host as any).loading = false;
      }
    };
    timer = window.setTimeout(tick, 220);
  };

  const onSubmit = (e: Event) => {
    const text = (e as CustomEvent).detail?.value?.trim();
    if (!text || !host) return;

    const aId = nextId();
    host.messages = [
      ...(host.messages ?? []),
      { id: nextId(), role: 'user', content: text },
      { id: aId, role: 'assistant', content: '' },
    ];
    (host as any).loading = true;

    const id = commandIdFor(text);
    streamReply(aId, (id && REPLIES[id]) || FALLBACK_REPLY);
  };

  // Surface which command the user picked from the palette (kai-slash-select).
  // Highlight it as active in the palette via slashActiveIds.
  const onSlashSelect = (e: Event) => {
    const cmd = (e as CustomEvent).detail?.command as SlashCommandItem | undefined;
    if (!cmd || !host) return;
    (host as any).slashActiveIds = [cmd.id];
  };

  onMount(async () => {
    await loadKit();

    if (!host) return;
    customElements.upgrade(host);
    host.messages = SEED_MESSAGES;
    (host as any).slashCommands = COMMANDS;
    if (props.chatTitle) (host as any).chatTitle = props.chatTitle;
    if (props.placeholder) (host as any).placeholder = props.placeholder;
    host.setAttribute('theme', theme());
    host.addEventListener('kai-submit', onSubmit);
    host.addEventListener('kai-slash-select', onSlashSelect);

    if (skillsEl) {
      customElements.upgrade(skillsEl);
      skillsEl.skills = SKILLS;
      skillsEl.setAttribute('theme', theme());
    }

    setReady(true);

    const obs = new MutationObserver(() => {
      host?.setAttribute('theme', theme());
      skillsEl?.setAttribute('theme', theme());
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    onCleanup(() => {
      clearTimeout(timer);
      host?.removeEventListener('kai-submit', onSubmit);
      host?.removeEventListener('kai-slash-select', onSlashSelect);
      obs.disconnect();
    });
  });

  return (
    <div
      class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface"
      style={{ height: props.height ?? '600px', display: 'flex', 'flex-direction': 'column' }}
    >
      <div
        style={{
          'border-bottom': '1px solid var(--color-line, #e5e7eb)',
          padding: '10px 16px',
          background: 'var(--color-surface, #fff)',
        }}
      >
        {/* @ts-expect-error custom element */}
        <kai-skills ref={(el: HTMLElement) => (skillsEl = el as any)} />
      </div>
      {/* @ts-expect-error custom element */}
      <kai-chat
        ref={(el: HTMLElement) => (host = el as any)}
        style={{ display: 'block', flex: '1', 'min-height': '0' }}
      />
    </div>
  );
}
