/** Interactive theme editor — a control panel that edits the inherited
 *  `--kc-color-*` / `--kc-radius` custom properties on a live <kc-chat> host
 *  in real time. Every change calls host.style.setProperty(token, value), the
 *  same Shadow-DOM-piercing mechanism the custom-theme example uses statically.
 *  The chat is seeded with a short realistic conversation and ships on a
 *  non-default (violet) palette so it reads as a themed app, not the defaults. */
import { createSignal, onMount, onCleanup, For } from 'solid-js';
import { loadKit } from './example/kit';
import IconCheck from '~icons/lucide/check';
import IconCopy from '~icons/lucide/copy';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

/** One editable color token: the `--kc-color-*` name, a human label, and the
 *  starting hex value used to seed the <input type="color"> swatch. */
type ColorControl = { token: string; label: string; hint: string };

const COLOR_CONTROLS: ColorControl[] = [
  { token: '--kc-color-primary', label: 'Primary', hint: 'Buttons, accents, active states' },
  { token: '--kc-color-ring', label: 'Focus ring', hint: 'Keyboard-focus outline' },
  { token: '--kc-color-background', label: 'Background', hint: 'Chat surface' },
  { token: '--kc-color-card', label: 'Card', hint: 'Message bubbles and panels' },
  { token: '--kc-color-border', label: 'Border', hint: 'Dividers and input outlines' },
];

/** Token → hex value. Presets and edits both flow through this single map. */
type Palette = Record<string, string>;

/** Starting palette (violet brand) plus a couple of derived tokens the controls
 *  don't expose but a complete theme still wants. Hex throughout so the native
 *  color inputs round-trip cleanly. */
const PRESETS: { name: string; palette: Palette }[] = [
  {
    name: 'Violet',
    palette: {
      '--kc-color-primary': '#7c3aed',
      '--kc-color-primary-foreground': '#ffffff',
      '--kc-color-ring': '#7c3aed',
      '--kc-color-background': '#faf8ff',
      '--kc-color-card': '#ffffff',
      '--kc-color-border': '#e6deff',
    },
  },
  {
    name: 'Emerald',
    palette: {
      '--kc-color-primary': '#059669',
      '--kc-color-primary-foreground': '#ffffff',
      '--kc-color-ring': '#059669',
      '--kc-color-background': '#f3fbf7',
      '--kc-color-card': '#ffffff',
      '--kc-color-border': '#cdeede',
    },
  },
  {
    name: 'Amber',
    palette: {
      '--kc-color-primary': '#d97706',
      '--kc-color-primary-foreground': '#ffffff',
      '--kc-color-ring': '#d97706',
      '--kc-color-background': '#fffaf2',
      '--kc-color-card': '#ffffff',
      '--kc-color-border': '#f3e3c6',
    },
  },
  {
    name: 'Slate',
    palette: {
      '--kc-color-primary': '#334155',
      '--kc-color-primary-foreground': '#ffffff',
      '--kc-color-ring': '#64748b',
      '--kc-color-background': '#f8fafc',
      '--kc-color-card': '#ffffff',
      '--kc-color-border': '#e2e8f0',
    },
  },
];

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 't1',
    role: 'user',
    content: 'Can I match the chat to my product’s brand colors?',
  },
  {
    id: 't2',
    role: 'assistant',
    content:
      'Yes — every color is a CSS custom property, so you override a handful of `--kc-color-*` tokens and the whole UI reskins.\n\nThe ones worth setting first:\n\n- `--kc-color-primary` — your accent: buttons, links, the send action\n- `--kc-color-ring` — the keyboard-focus outline (keep it high-contrast)\n- `--kc-color-background` and `--kc-color-card` — the chat surface and message bubbles\n\nDrag a swatch on the left and watch this conversation reskin in real time.',
    actions: ['copy', 'like'],
  },
];

const DEFAULT_RADIUS = 0.6; // rem — matches the kit default --kc-radius

let uid = 0;
const nextId = () => `te${++uid}`;

const REPLY =
  'Drop those token overrides on the `<kc-chat>` element (or any ancestor) and they pierce the Shadow DOM automatically — no stylesheet import needed. Scope them to a wrapper to theme one section, or to `:root` to rebrand every `kc-*` component on the page at once.';

export default function ThemeEditorDemo() {
  let host: (HTMLElement & { messages?: ChatMessage[]; [k: string]: unknown }) | undefined;
  const [palette, setPalette] = createSignal<Palette>({ ...PRESETS[0].palette });
  const [radius, setRadius] = createSignal(DEFAULT_RADIUS);
  const [activePreset, setActivePreset] = createSignal('Violet');
  const [copied, setCopied] = createSignal(false);
  let timer: number | undefined;
  let copyTimer: number | undefined;

  const theme = () => document.documentElement.dataset.theme || 'light';

  /** Push the full active palette + radius onto the host as inline custom
   *  properties. Idempotent — safe to call on every change. */
  const applyTheme = () => {
    if (!host) return;
    for (const [token, value] of Object.entries(palette())) host.style.setProperty(token, value);
    host.style.setProperty('--kc-radius', `${radius()}rem`);
  };

  const setColor = (token: string, hex: string) => {
    setPalette((p) => ({ ...p, [token]: hex }));
    setActivePreset('Custom');
    host?.style.setProperty(token, hex);
  };

  const setRadiusRem = (rem: number) => {
    setRadius(rem);
    host?.style.setProperty('--kc-radius', `${rem}rem`);
  };

  const applyPreset = (name: string, p: Palette) => {
    setPalette({ ...p });
    setActivePreset(name);
    applyTheme();
  };

  /** Paste-ready CSS for the current tokens. */
  const cssBlock = () => {
    const lines = Object.entries(palette())
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    return `kc-chat {\n${lines}\n  --kc-radius: ${radius()}rem;\n}`;
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssBlock());
      setCopied(true);
      clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
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
    const words = REPLY.split(/(\s+)/);
    let i = 0;
    clearTimeout(timer);
    const tick = () => {
      i += 2;
      const partial = words.slice(0, i).join('');
      const done = i >= words.length;
      host!.messages = (host!.messages ?? []).map((m) =>
        m.id === aId ? { ...m, content: partial, ...(done ? { actions: ['copy', 'like'] } : {}) } : m,
      );
      if (!done) timer = window.setTimeout(tick, 38);
      else (host as any).loading = false;
    };
    timer = window.setTimeout(tick, 240);
  };

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);
    host.messages = SEED_MESSAGES;
    (host as any).chatTitle = 'Brand assistant';
    (host as any).placeholder = 'Ask how theming works…';
    (host as any).suggestions = ['Which tokens should I set first?', 'Does this work in dark mode?'];
    host.setAttribute('theme', theme());
    applyTheme();
    host.addEventListener('kc-submit', onSubmit);

    const obs = new MutationObserver(() => host?.setAttribute('theme', theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    onCleanup(() => {
      clearTimeout(timer);
      clearTimeout(copyTimer);
      host?.removeEventListener('kc-submit', onSubmit);
      obs.disconnect();
    });
  });

  return (
    <div class="not-content my-5 flex flex-col gap-0 overflow-hidden rounded-xl border border-line bg-surface md:flex-row" style={{ 'min-height': '600px' }}>
      {/* Controls */}
      <div class="flex w-full shrink-0 flex-col gap-5 border-b border-line bg-surface p-5 md:w-72 md:border-b-0 md:border-r">
        <div>
          <div class="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink/55">Presets</div>
          <div class="flex flex-wrap gap-2">
            <For each={PRESETS}>
              {(preset) => (
                <button
                  type="button"
                  onClick={() => applyPreset(preset.name, preset.palette)}
                  class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
                  style={{
                    'border-color': activePreset() === preset.name ? preset.palette['--kc-color-primary'] : 'var(--color-line, #e5e7eb)',
                    'background-color': activePreset() === preset.name ? preset.palette['--kc-color-primary'] : 'transparent',
                    color: activePreset() === preset.name ? '#fff' : 'inherit',
                  }}
                >
                  <span
                    class="inline-block h-3 w-3 rounded-full"
                    style={{ 'background-color': preset.palette['--kc-color-primary'] }}
                  />
                  {preset.name}
                </button>
              )}
            </For>
          </div>
        </div>

        <div>
          <div class="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink/55">Colors</div>
          <div class="flex flex-col gap-3">
            <For each={COLOR_CONTROLS}>
              {(control) => (
                <label class="flex items-center gap-3">
                  <input
                    type="color"
                    value={palette()[control.token]}
                    onInput={(e) => setColor(control.token, e.currentTarget.value)}
                    aria-label={control.label}
                    class="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-line bg-transparent p-0"
                  />
                  <span class="flex min-w-0 flex-col leading-tight">
                    <span class="truncate text-sm font-medium">{control.label}</span>
                    <span class="truncate text-xs text-ink/55">{control.hint}</span>
                  </span>
                </label>
              )}
            </For>
          </div>
        </div>

        <div>
          <div class="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink/55">Radius</div>
          <label class="flex items-center gap-3 text-sm">
            <input
              type="range"
              min="0"
              max="1.4"
              step="0.05"
              value={radius()}
              onInput={(e) => setRadiusRem(parseFloat(e.currentTarget.value))}
              class="flex-1"
              aria-label="Corner radius"
            />
            <span class="w-16 text-right text-sm tabular-nums">{radius().toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}rem</span>
          </label>
        </div>

        <div class="mt-auto">
          <button
            type="button"
            onClick={copyCss}
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium transition-colors hover:bg-ink/5"
          >
            {copied() ? <IconCheck class="h-4 w-4" /> : <IconCopy class="h-4 w-4" />}
            {copied() ? 'Copied' : 'Copy CSS'}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div class="min-w-0 flex-1">
        {/* @ts-expect-error custom element */}
        <kc-chat ref={(el: HTMLElement) => (host = el as any)} style={{ display: 'block', height: '100%', 'min-height': '600px' }} />
      </div>
    </div>
  );
}
