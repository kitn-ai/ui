/** Theme studio — a full theme editor for the kit's public `--kc-*` tokens.
 *
 *  How it works: every kit color is a CSS custom property the consumer can
 *  override. The studio writes the active palette as inline `--kc-color-*` /
 *  `--kc-radius` properties on a single canvas wrapper; custom properties
 *  inherit through the Shadow DOM, so every `kc-*` element inside the canvas
 *  reskins at once — the exact mechanism you'd ship in a stylesheet.
 *
 *  Light and dark are edited independently (each canvas host runs at the studio's
 *  own mode, not the page's), and Copy CSS exports the paste-ready `:root` +
 *  `.dark` blocks. Bounded to real tokens — colors and radius — so it never
 *  promises theming the kit can't actually do.
 */
import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import { loadKit } from './example/kit';
import IconCheck from '~icons/lucide/check';
import IconCopy from '~icons/lucide/copy';
import IconImport from '~icons/lucide/clipboard-paste';
import IconReset from '~icons/lucide/rotate-ccw';
import IconChevron from '~icons/lucide/chevron-right';

type Palette = Record<string, string>;

/** One editable token: full `--kc-*` name, label, hint, and light/dark defaults
 *  (verbatim from theme.css). Grouped for the inspector. */
type TokenDef = { token: string; label: string; hint: string; light: string; dark: string };
type Group = { name: string; tokens: TokenDef[] };

const GROUPS: Group[] = [
  {
    name: 'Surfaces',
    tokens: [
      { token: '--kc-color-background', label: 'Background', hint: 'App / chat surface', light: 'hsl(0 0% 100%)', dark: 'hsl(50 2% 9%)' },
      { token: '--kc-color-foreground', label: 'Foreground', hint: 'Default text', light: 'hsl(240 10% 3.9%)', dark: 'hsl(0 0% 98%)' },
      { token: '--kc-color-card', label: 'Card', hint: 'Bubbles, panels, cards', light: 'hsl(0 0% 100%)', dark: 'hsl(45 4% 12%)' },
      { token: '--kc-color-card-foreground', label: 'Card text', hint: 'Text on cards', light: 'hsl(240 10% 3.9%)', dark: 'hsl(0 0% 98%)' },
      { token: '--kc-color-popover', label: 'Popover', hint: 'Menus & popovers', light: 'hsl(0 0% 100%)', dark: 'hsl(45 4% 12%)' },
      { token: '--kc-color-popover-foreground', label: 'Popover text', hint: 'Text in popovers', light: 'hsl(240 10% 3.9%)', dark: 'hsl(0 0% 98%)' },
      { token: '--kc-color-sidebar', label: 'Sidebar', hint: 'Conversation sidebar', light: 'hsl(0 0% 100%)', dark: 'hsl(50 2% 7%)' },
    ],
  },
  {
    name: 'Brand & actions',
    tokens: [
      { token: '--kc-color-primary', label: 'Primary', hint: 'Buttons, accents, send', light: 'hsl(240 5.9% 10%)', dark: 'hsl(0 0% 98%)' },
      { token: '--kc-color-primary-foreground', label: 'On primary', hint: 'Text on primary', light: 'hsl(0 0% 98%)', dark: 'hsl(45 4% 11%)' },
      { token: '--kc-color-ring', label: 'Focus ring', hint: 'Keyboard-focus outline', light: 'hsl(217 91% 53%)', dark: 'hsl(217 91% 68%)' },
      { token: '--kc-color-accent', label: 'Accent', hint: 'Hover / accent surface', light: 'hsl(240 4.8% 95.9%)', dark: 'hsl(45 4% 17%)' },
      { token: '--kc-color-accent-foreground', label: 'On accent', hint: 'Text on accent', light: 'hsl(240 5.9% 10%)', dark: 'hsl(0 0% 98%)' },
      { token: '--kc-color-secondary', label: 'Secondary', hint: 'Secondary surface', light: 'hsl(240 4.8% 95.9%)', dark: 'hsl(45 4% 17%)' },
      { token: '--kc-color-secondary-foreground', label: 'On secondary', hint: 'Text on secondary', light: 'hsl(240 5.9% 10%)', dark: 'hsl(0 0% 98%)' },
    ],
  },
  {
    name: 'Muted text',
    tokens: [
      { token: '--kc-color-muted', label: 'Muted', hint: 'Subtle fills', light: 'hsl(240 4.8% 95.9%)', dark: 'hsl(45 4% 17%)' },
      { token: '--kc-color-muted-foreground', label: 'Muted text', hint: 'Secondary text', light: 'hsl(240 3.8% 43%)', dark: 'hsl(45 4% 64%)' },
    ],
  },
  {
    name: 'Inputs & borders',
    tokens: [
      { token: '--kc-color-border', label: 'Border', hint: 'Dividers & outlines', light: 'hsl(240 5.9% 90%)', dark: 'hsl(45 4% 17%)' },
      { token: '--kc-color-input', label: 'Input', hint: 'Input field background', light: 'hsl(240 5.9% 90%)', dark: 'hsl(45 4% 17%)' },
    ],
  },
  {
    name: 'Status & code',
    tokens: [
      { token: '--kc-color-destructive', label: 'Destructive', hint: 'Danger / delete', light: 'hsl(0 72% 45%)', dark: 'hsl(0 62.8% 30.6%)' },
      { token: '--kc-color-destructive-foreground', label: 'On destructive', hint: 'Text on danger', light: 'hsl(0 0% 98%)', dark: 'hsl(0 0% 98%)' },
      { token: '--kc-color-code-foreground', label: 'Code', hint: 'Inline code accent', light: 'hsl(224.3 76.3% 48%)', dark: 'hsl(213 94% 78%)' },
      { token: '--kc-color-tool-blue', label: 'Tool blue', hint: 'Tool / status chip', light: 'hsl(217 91% 38%)', dark: 'hsl(217 91% 70%)' },
      { token: '--kc-color-tool-amber', label: 'Tool amber', hint: 'Tool / status chip', light: 'hsl(38 92% 28%)', dark: 'hsl(38 92% 50%)' },
      { token: '--kc-color-tool-green', label: 'Tool green', hint: 'Tool / status chip', light: 'hsl(142 71% 26%)', dark: 'hsl(142 71% 45%)' },
      { token: '--kc-color-tool-red', label: 'Tool red', hint: 'Tool / status chip', light: 'hsl(0 72% 42%)', dark: 'hsl(0 84% 70%)' },
    ],
  },
  {
    name: 'Scrollbar',
    tokens: [
      { token: '--kc-color-scrollbar-thumb', label: 'Scrollbar', hint: 'Scrollbar thumb', light: 'hsl(240 5% 80%)', dark: 'hsl(45 3% 30%)' },
      { token: '--kc-color-scrollbar-thumb-hover', label: 'Scrollbar hover', hint: 'Thumb on hover', light: 'hsl(240 4% 64%)', dark: 'hsl(45 3% 42%)' },
    ],
  },
];

const ALL_TOKENS = GROUPS.flatMap((g) => g.tokens);
const DEFAULT_RADIUS = 0.6; // rem — kit default --kc-radius

/** Resolve any CSS color string to #rrggbb for a native color input. */
function toHex(css: string): string {
  const el = document.createElement('div');
  el.style.color = css;
  el.style.display = 'none';
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  el.remove();
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m) return '#000000';
  return '#' + m.slice(0, 3).map((x) => Math.round(+x).toString(16).padStart(2, '0')).join('');
}

const seedPalette = (mode: 'light' | 'dark'): Palette =>
  Object.fromEntries(ALL_TOKENS.map((t) => [t.token, toHex(mode === 'light' ? t.light : t.dark)]));

/** Brand-token overrides layered onto the live defaults for each preset. Each
 *  preset tints a cohesive set (accent surface + brand + ring + code) so it reads
 *  as a designed theme, not a single accent swap. */
type BrandOverride = { light: Palette; dark: Palette };
const PRESETS: { name: string; brand?: BrandOverride }[] = [
  { name: 'Default' },
  {
    name: 'Violet',
    brand: {
      light: { '--kc-color-primary': '#7c3aed', '--kc-color-primary-foreground': '#ffffff', '--kc-color-ring': '#7c3aed', '--kc-color-code-foreground': '#6d28d9', '--kc-color-accent': '#f3eefe', '--kc-color-accent-foreground': '#4c1d95', '--kc-color-background': '#faf8ff', '--kc-color-border': '#e8e0fb' },
      dark: { '--kc-color-primary': '#a78bfa', '--kc-color-primary-foreground': '#1e1b2e', '--kc-color-ring': '#a78bfa', '--kc-color-code-foreground': '#c4b5fd', '--kc-color-accent': '#2a2440', '--kc-color-accent-foreground': '#ddd6fe', '--kc-color-background': '#15131c', '--kc-color-card': '#1c1926' },
    },
  },
  {
    name: 'Emerald',
    brand: {
      light: { '--kc-color-primary': '#059669', '--kc-color-primary-foreground': '#ffffff', '--kc-color-ring': '#059669', '--kc-color-code-foreground': '#047857', '--kc-color-accent': '#e6f7ef', '--kc-color-accent-foreground': '#065f46', '--kc-color-background': '#f3fbf7', '--kc-color-border': '#cdeede' },
      dark: { '--kc-color-primary': '#34d399', '--kc-color-primary-foreground': '#062a1e', '--kc-color-ring': '#34d399', '--kc-color-code-foreground': '#6ee7b7', '--kc-color-accent': '#103027', '--kc-color-accent-foreground': '#a7f3d0', '--kc-color-background': '#0c1714', '--kc-color-card': '#10201b' },
    },
  },
  {
    name: 'Sunset',
    brand: {
      light: { '--kc-color-primary': '#ea580c', '--kc-color-primary-foreground': '#ffffff', '--kc-color-ring': '#ea580c', '--kc-color-code-foreground': '#c2410c', '--kc-color-accent': '#fdeee3', '--kc-color-accent-foreground': '#9a3412', '--kc-color-background': '#fffaf5', '--kc-color-border': '#f6dec9' },
      dark: { '--kc-color-primary': '#fb923c', '--kc-color-primary-foreground': '#2a1408', '--kc-color-ring': '#fb923c', '--kc-color-code-foreground': '#fdba74', '--kc-color-accent': '#33200f', '--kc-color-accent-foreground': '#fed7aa', '--kc-color-background': '#181206', '--kc-color-card': '#211a0f' },
    },
  },
  {
    name: 'Ocean',
    brand: {
      light: { '--kc-color-primary': '#0284c7', '--kc-color-primary-foreground': '#ffffff', '--kc-color-ring': '#0284c7', '--kc-color-code-foreground': '#0369a1', '--kc-color-accent': '#e2f3fb', '--kc-color-accent-foreground': '#075985', '--kc-color-background': '#f5fbfe', '--kc-color-border': '#cce7f3' },
      dark: { '--kc-color-primary': '#38bdf8', '--kc-color-primary-foreground': '#04212f', '--kc-color-ring': '#38bdf8', '--kc-color-code-foreground': '#7dd3fc', '--kc-color-accent': '#0d2a39', '--kc-color-accent-foreground': '#bae6fd', '--kc-color-background': '#08151c', '--kc-color-card': '#0d1f29' },
    },
  },
  {
    name: 'Rose',
    brand: {
      light: { '--kc-color-primary': '#e11d48', '--kc-color-primary-foreground': '#ffffff', '--kc-color-ring': '#e11d48', '--kc-color-code-foreground': '#be123c', '--kc-color-accent': '#fde8ed', '--kc-color-accent-foreground': '#9f1239', '--kc-color-background': '#fff7f9', '--kc-color-border': '#f7d2db' },
      dark: { '--kc-color-primary': '#fb7185', '--kc-color-primary-foreground': '#2a0a12', '--kc-color-ring': '#fb7185', '--kc-color-code-foreground': '#fda4af', '--kc-color-accent': '#33141c', '--kc-color-accent-foreground': '#fecdd3', '--kc-color-background': '#190a0e', '--kc-color-card': '#221116' },
    },
  },
  {
    name: 'Mono',
    brand: {
      light: { '--kc-color-primary': '#1f2937', '--kc-color-primary-foreground': '#f9fafb', '--kc-color-ring': '#6b7280', '--kc-color-code-foreground': '#374151', '--kc-color-accent': '#f1f3f5', '--kc-color-accent-foreground': '#1f2937' },
      dark: { '--kc-color-primary': '#e5e7eb', '--kc-color-primary-foreground': '#111827', '--kc-color-ring': '#9ca3af', '--kc-color-code-foreground': '#d1d5db', '--kc-color-accent': '#23262b', '--kc-color-accent-foreground': '#e5e7eb' },
    },
  },
];

const CONFIRM_DATA = {
  body: 'This applies 2 pending migrations and restarts 3 services. Estimated downtime: ~30 s.',
  tone: 'danger',
  actions: [
    { id: 'deploy', label: 'Deploy now', style: 'primary', default: true },
    { id: 'cancel', label: 'Cancel' },
  ],
};

const CHOICE_DATA = {
  prompt: 'Pick the notification channel for the maintenance window.',
  options: [
    { id: 'email', label: 'Email', description: 'Sent to all active accounts', meta: '~4 200 users' },
    { id: 'banner', label: 'In-app banner', description: 'Shown on next page load', recommended: true },
    { id: 'none', label: 'No notification', description: 'Internal deploy only' },
  ],
  submitLabel: 'Confirm channel',
};

const SEED_MESSAGES = [
  { id: 'm1', role: 'user', content: 'Can I match the chat to my brand?' },
  {
    id: 'm2',
    role: 'assistant',
    content:
      'Every color is a `--kc-color-*` token, so a handful of overrides reskins the whole UI. Set `--kc-color-primary` for your accent and `--kc-color-ring` for the focus outline, then drag the radius. Watch it all reskin live.',
    actions: ['copy', 'like'],
  },
];

const REPLY =
  'Drop these tokens on `:root` to rebrand every `kc-*` element, or scope them to one wrapper to theme a single section. Same block, light and dark — `:root` for light, `.dark` for the dark overrides.';

let uid = 0;
const nextId = () => `s${++uid}`;

/** Build paste-ready CSS: full light set on :root, dark set on .dark. */
function buildCss(light: Palette, dark: Palette, radius: number): string {
  const body = (p: Palette, extra = ''): string =>
    [...ALL_TOKENS.map((t) => `  ${t.token}: ${p[t.token]};`), extra].filter(Boolean).join('\n');
  return `:root {\n${body(light, `  --kc-radius: ${radius}rem;`)}\n}\n\n.dark {\n${body(dark)}\n}`;
}

/** Tolerant parse of pasted CSS: pull --kc-* declarations from the :root block
 *  (light) and the .dark block (dark). Unknown tokens are ignored. */
function parseCss(css: string): { light: Palette; dark: Palette; radius?: number } | null {
  const grab = (selector: string): Palette => {
    const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`);
    const block = css.match(re)?.[1] ?? '';
    const out: Palette = {};
    for (const m of block.matchAll(/(--kc-color-[a-z-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    return out;
  };
  const light = grab(':root');
  const dark = grab('\\.dark');
  if (!Object.keys(light).length && !Object.keys(dark).length) return null;
  const radiusMatch = css.match(/--kc-radius\s*:\s*([\d.]+)rem/);
  return { light, dark, radius: radiusMatch ? parseFloat(radiusMatch[1]) : undefined };
}

export default function ThemeStudio() {
  let chatHost: (HTMLElement & Record<string, unknown>) | undefined;
  let confirmHost: (HTMLElement & Record<string, unknown>) | undefined;
  let choiceHost: (HTMLElement & Record<string, unknown>) | undefined;
  let promptHost: HTMLElement | undefined;
  let canvasEl: HTMLDivElement | undefined;
  let streamTimer: number | undefined;

  const [ready, setReady] = createSignal(false);
  const [mode, setMode] = createSignal<'light' | 'dark'>('light');
  const [light, setLight] = createSignal<Palette>({});
  const [dark, setDark] = createSignal<Palette>({});
  const [radius, setRadius] = createSignal(DEFAULT_RADIUS);
  const [preset, setPreset] = createSignal('Default');
  const [copied, setCopied] = createSignal(false);
  const [importing, setImporting] = createSignal(false);
  const [importText, setImportText] = createSignal('');
  const [importError, setImportError] = createSignal('');
  // Accordion: open the two most-used groups by default, collapse the rest.
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g, i) => [g.name, i < 2])),
  );
  const toggleGroup = (name: string) => setOpenGroups((o) => ({ ...o, [name]: !o[name] }));

  const active = () => (mode() === 'light' ? light() : dark());

  // Apply the active palette + radius onto the canvas wrapper. Custom properties
  // inherit through every kc-* shadow root inside, so the whole canvas reskins.
  createEffect(() => {
    if (!canvasEl || !Object.keys(active()).length) return;
    const p = active();
    for (const t of ALL_TOKENS) canvasEl.style.setProperty(t.token, p[t.token]);
    canvasEl.style.setProperty('--kc-radius', `${radius()}rem`);
    canvasEl.style.background = p['--kc-color-background'];
    // Keep each preview host on the studio's mode (independent of the page theme).
    chatHost?.setAttribute('theme', mode());
    confirmHost?.setAttribute('theme', mode());
    choiceHost?.setAttribute('theme', mode());
    promptHost?.setAttribute('theme', mode());
  });

  const setColor = (token: string, hex: string) => {
    (mode() === 'light' ? setLight : setDark)((v) => ({ ...v, [token]: hex }));
    setPreset('Custom');
  };

  const loadPreset = (name: string) => {
    const def = PRESETS.find((p) => p.name === name);
    const l = seedPalette('light');
    const d = seedPalette('dark');
    if (def?.brand) {
      Object.assign(l, def.brand.light);
      Object.assign(d, def.brand.dark);
    }
    setLight(l);
    setDark(d);
    setRadius(DEFAULT_RADIUS);
    setPreset(name);
  };

  const reset = () => loadPreset('Default');

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(buildCss(light(), dark(), radius()));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const applyImport = () => {
    const parsed = parseCss(importText());
    if (!parsed) {
      setImportError('No --kc-color-* tokens found. Paste a :root / .dark block.');
      return;
    }
    setLight((v) => ({ ...v, ...parsed.light }));
    setDark((v) => ({ ...v, ...parsed.dark }));
    if (parsed.radius !== undefined) setRadius(parsed.radius);
    setPreset('Custom');
    setImporting(false);
    setImportText('');
    setImportError('');
  };

  // Canned streaming reply so the previewed chat feels live.
  const onSubmit = (e: Event) => {
    const text = (e as CustomEvent).detail?.value?.trim();
    if (!text || !chatHost) return;
    const aId = nextId();
    chatHost.messages = [
      ...((chatHost.messages as unknown[]) ?? []),
      { id: nextId(), role: 'user', content: text },
      { id: aId, role: 'assistant', content: '' },
    ];
    chatHost.loading = true;
    const words = REPLY.split(/(\s+)/);
    let i = 0;
    const tick = () => {
      i += 2;
      const partial = words.slice(0, i).join('');
      const done = i >= words.length;
      chatHost!.messages = ((chatHost!.messages as { id: string }[]) ?? []).map((m) =>
        m.id === aId ? { ...m, content: partial, ...(done ? { actions: ['copy', 'like'] } : {}) } : m,
      );
      if (!done) streamTimer = window.setTimeout(tick, 38);
      else chatHost!.loading = false;
    };
    clearTimeout(streamTimer);
    streamTimer = window.setTimeout(tick, 240);
  };

  onMount(async () => {
    loadPreset('Default');
    await loadKit();
    if (chatHost) {
      customElements.upgrade(chatHost);
      chatHost.messages = SEED_MESSAGES;
      chatHost.chatTitle = 'Brand assistant';
      chatHost.placeholder = 'Ask how theming works…';
      chatHost.suggestions = ['Which tokens matter most?', 'Does this hold in dark mode?'];
      chatHost.models = [
        { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
        { id: 'opus', name: 'Claude Opus', provider: 'Anthropic' },
      ];
      chatHost.currentModel = 'sonnet';
      chatHost.addEventListener('kc-submit', onSubmit);
    }
    if (confirmHost) {
      customElements.upgrade(confirmHost);
      confirmHost.heading = 'Deploy to production?';
      confirmHost.data = CONFIRM_DATA;
    }
    if (choiceHost) {
      customElements.upgrade(choiceHost);
      choiceHost.heading = 'How should we notify users?';
      choiceHost.data = CHOICE_DATA;
    }
    setReady(true);
    onCleanup(() => {
      clearTimeout(streamTimer);
      chatHost?.removeEventListener('kc-submit', onSubmit);
    });
  });

  const swatch = 'h-7 w-7 shrink-0 cursor-pointer rounded-md border border-line bg-transparent p-0';

  return (
    <div class="theme-studio-root not-content my-4 flex flex-col overflow-hidden rounded-xl border border-line bg-surface lg:h-[82vh] lg:min-h-[660px] lg:flex-row">
      {/* Inspector */}
      <div class="flex w-full shrink-0 flex-col border-b border-line lg:w-[330px] lg:border-b-0 lg:border-r">
        {/* Toolbar */}
        <div class="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
          <div class="inline-flex overflow-hidden rounded-md border border-line text-xs">
            <button type="button" class="px-2.5 py-1 transition-colors" classList={{ 'bg-brand text-white': mode() === 'light', 'text-ink-2': mode() !== 'light' }} onClick={() => setMode('light')}>Light</button>
            <button type="button" class="px-2.5 py-1 transition-colors" classList={{ 'bg-brand text-white': mode() === 'dark', 'text-ink-2': mode() !== 'dark' }} onClick={() => setMode('dark')}>Dark</button>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" onClick={() => setImporting((v) => !v)} title="Paste CSS to import" class="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-2 transition-colors hover:bg-ink/5"><IconImport class="h-3.5 w-3.5" /></button>
            <button type="button" onClick={reset} title="Reset to defaults" class="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-2 transition-colors hover:bg-ink/5"><IconReset class="h-3.5 w-3.5" /></button>
            <button type="button" onClick={copyCss} class="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink/5">{copied() ? <IconCheck class="h-3.5 w-3.5" /> : <IconCopy class="h-3.5 w-3.5" />}{copied() ? 'Copied' : 'Copy CSS'}</button>
          </div>
        </div>

        <Show when={importing()}>
          <div class="border-b border-line p-3">
            <textarea
              value={importText()}
              onInput={(e) => setImportText(e.currentTarget.value)}
              placeholder={':root {\n  --kc-color-primary: #7c3aed;\n}\n.dark {\n  --kc-color-primary: #a78bfa;\n}'}
              class="h-28 w-full resize-none rounded-md border border-line bg-surface p-2 font-mono text-xs text-ink"
            />
            <Show when={importError()}><p class="mt-1 text-xs text-red-500">{importError()}</p></Show>
            <button type="button" onClick={applyImport} class="mt-2 w-full rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-[filter] hover:brightness-110">Apply pasted tokens</button>
          </div>
        </Show>

        {/* Presets */}
        <div class="border-b border-line p-3">
          <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/55">Presets</div>
          <div class="flex flex-wrap gap-1.5">
            <For each={PRESETS}>
              {(p) => (
                <button
                  type="button"
                  onClick={() => loadPreset(p.name)}
                  class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
                  classList={{ 'border-brand bg-brand text-white': preset() === p.name, 'border-line text-ink-2 hover:bg-ink/5': preset() !== p.name }}
                >
                  <span class="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: p.brand ? p.brand.light['--kc-color-primary'] : '#18181b' }} />
                  {p.name}
                </button>
              )}
            </For>
            <Show when={preset() === 'Custom'}>
              <span class="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-ink/55">Custom</span>
            </Show>
          </div>
        </div>

        {/* Token groups (collapsible) */}
        <div class="min-h-0 flex-1 overflow-auto py-1">
          <For each={GROUPS}>
            {(group) => (
              <div class="border-b border-line/60 last:border-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  aria-expanded={openGroups()[group.name]}
                  class="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.03]"
                >
                  <IconChevron class="h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform" classList={{ 'rotate-90': openGroups()[group.name] }} />
                  <span class="text-xs font-semibold uppercase tracking-wide text-ink-2">{group.name}</span>
                  <span class="ml-auto flex items-center gap-1">
                    <For each={group.tokens.slice(0, 5)}>
                      {(t) => <span class="size-3 rounded-full ring-1 ring-black/10" style={{ background: active()[t.token] ?? 'transparent' }} />}
                    </For>
                  </span>
                </button>
                <Show when={openGroups()[group.name]}>
                  <div class="flex flex-col gap-2 px-3 pb-3 pt-0.5">
                    <For each={group.tokens}>
                      {(t) => (
                        <label class="flex items-center gap-2.5">
                          <input
                            type="color"
                            value={active()[t.token] ?? '#000000'}
                            onInput={(e) => setColor(t.token, e.currentTarget.value)}
                            aria-label={t.label}
                            class={swatch}
                          />
                          <span class="flex min-w-0 flex-col leading-tight">
                            <span class="truncate text-sm font-medium text-ink">{t.label}</span>
                            <span class="truncate text-xs text-ink/55">{t.hint}</span>
                          </span>
                        </label>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>

          {/* Radius */}
          <div class="px-3 py-3">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">Shape</div>
            <label class="flex items-center gap-2.5 text-sm">
              <input type="range" min="0" max="1.4" step="0.05" value={radius()} onInput={(e) => setRadius(parseFloat(e.currentTarget.value))} class="flex-1" aria-label="Corner radius" />
              <span class="w-14 text-right text-xs tabular-nums text-ink-2">{radius()}rem</span>
            </label>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasEl} classList={{ dark: mode() === 'dark' }} class="relative min-w-0 flex-1 overflow-auto p-4">
        <Show when={!ready()}>
          <div class="absolute inset-0 grid place-items-center text-sm text-ink/55">Loading preview…</div>
        </Show>
        <div class="mx-auto flex max-w-3xl flex-col gap-4">
          {/* Hero chat */}
          <div class="h-[420px] overflow-hidden rounded-xl border" style={{ 'border-color': 'var(--kc-color-border)' }}>
            {/* @ts-expect-error custom element */}
            <kc-chat ref={(el: HTMLElement) => (chatHost = el as never)} style={{ display: 'block', height: '100%' }} />
          </div>

          {/* Generative-UI cards — confirm + choice */}
          <div class="grid gap-4 md:grid-cols-2">
            {/* @ts-expect-error custom element */}
            <kc-confirm ref={(el: HTMLElement) => (confirmHost = el as never)} style={{ display: 'block' }} />
            {/* @ts-expect-error custom element */}
            <kc-choice ref={(el: HTMLElement) => (choiceHost = el as never)} style={{ display: 'block' }} />
          </div>

          {/* Standalone composer */}
          {/* @ts-expect-error custom element */}
          <kc-prompt-input ref={(el: HTMLElement) => (promptHost = el)} placeholder="Standalone composer…" style={{ display: 'block' }} />

          {/* Coverage strip — tokens not surfaced at rest, reading the live vars */}
          <div class="flex flex-wrap items-center gap-2 rounded-xl border p-3" style={{ 'border-color': 'var(--kc-color-border)', color: 'var(--kc-color-foreground)' }}>
            <span class="mr-1 text-xs" style={{ color: 'var(--kc-color-muted-foreground)' }}>Also themed:</span>
            <span class="rounded-md px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--kc-color-destructive)', color: 'var(--kc-color-destructive-foreground)' }}>Destructive</span>
            <span class="rounded-md px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--kc-color-secondary)', color: 'var(--kc-color-secondary-foreground)' }}>Secondary</span>
            <span class="rounded-md px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--kc-color-popover)', color: 'var(--kc-color-popover-foreground)', border: '1px solid var(--kc-color-border)' }}>Popover</span>
            <code class="rounded px-1.5 py-0.5 text-xs" style={{ color: 'var(--kc-color-code-foreground)', background: 'color-mix(in oklab, var(--kc-color-code-foreground) 15%, transparent)' }}>inline code</code>
            <span class="ml-1 flex items-center gap-1">
              <span class="h-3.5 w-3.5 rounded-full" style={{ background: 'var(--kc-color-tool-blue)' }} />
              <span class="h-3.5 w-3.5 rounded-full" style={{ background: 'var(--kc-color-tool-amber)' }} />
              <span class="h-3.5 w-3.5 rounded-full" style={{ background: 'var(--kc-color-tool-green)' }} />
              <span class="h-3.5 w-3.5 rounded-full" style={{ background: 'var(--kc-color-tool-red)' }} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
