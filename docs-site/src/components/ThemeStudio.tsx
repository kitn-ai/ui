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
import { createSignal, createEffect, onMount, onCleanup, For, Show, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { loadKit } from './example/kit';
import IconCheck from '~icons/lucide/check';
import IconCopy from '~icons/lucide/copy';
import IconImport from '~icons/lucide/clipboard-paste';
import IconReset from '~icons/lucide/rotate-ccw';
import IconChevron from '~icons/lucide/chevron-right';
import IconCode from '~icons/lucide/code';
import IconClose from '~icons/lucide/x';
import { THEME_PRESETS, SHADCN_TO_KC } from './theme-presets';

/** Shared modal: centered panel + backdrop, portaled to <body> so the editor's
 *  overflow can't clip it. Escape/backdrop close is wired by the caller. */
function Modal(props: { title: string; onClose: () => void; wide?: boolean; children: JSX.Element }) {
  return (
    <Portal>
      <div class="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" onClick={props.onClose} aria-hidden="true" />
        <div class="relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl" classList={{ 'max-w-3xl': props.wide, 'max-w-lg': !props.wide }}>
          <div class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="text-sm font-bold text-ink">{props.title}</h2>
            <button type="button" onClick={props.onClose} aria-label="Close" class="flex size-7 cursor-pointer appearance-none items-center justify-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"><IconClose class="size-4" /></button>
          </div>
          <div class="min-h-0 flex-1 overflow-auto p-4">{props.children}</div>
        </div>
      </div>
    </Portal>
  );
}

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

/** Resolve any CSS color (hex, hsl, oklch, named…) to #rrggbb for a native color
 *  input. Uses a canvas so CSS Color 4 formats like oklch convert to real sRGB
 *  bytes — getComputedStyle returns oklch unconverted in some engines. */
let _cv: HTMLCanvasElement | undefined;
function toHex(css: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(css)) return css.toLowerCase();
  _cv ??= document.createElement('canvas');
  _cv.width = _cv.height = 1;
  const ctx = _cv.getContext('2d');
  if (!ctx) return '#000000';
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000000';
  ctx.fillStyle = css; // invalid input is ignored → stays #000000
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const seedPalette = (mode: 'light' | 'dark'): Palette =>
  Object.fromEntries(ALL_TOKENS.map((t) => [t.token, toHex(mode === 'light' ? t.light : t.dark)]));

/** All selectable themes: the kit default + the ported tweakcn presets. */
const ALL_THEME_NAMES = ['Default', ...THEME_PRESETS.map((t) => t.name)];

/** A few representative swatches for a theme's dropdown row (light palette). */
function themeDots(name: string): string[] {
  const t = THEME_PRESETS.find((x) => x.name === name);
  if (!t) return ['#18181b', '#f4f4f5', '#e5e7eb', '#ffffff', '#3f3f46']; // Default
  return [t.light.primary, t.light.accent, t.light.secondary, t.light.background, t.light.foreground].map(toHex);
}

/** Curated font choices for the Typography section. value = the full CSS stack
 *  (empty = the kit default). Google-hosted families load on demand for preview. */
const BODY_FONTS: { label: string; value: string }[] = [
  { label: 'System default', value: '' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Geist', value: 'Geist, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Work Sans', value: '"Work Sans", sans-serif' },
  { label: 'Space Grotesk', value: '"Space Grotesk", sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif' },
  { label: 'Merriweather (serif)', value: 'Merriweather, serif' },
  { label: 'Lora (serif)', value: 'Lora, serif' },
  { label: 'Playfair Display (serif)', value: '"Playfair Display", serif' },
  { label: 'Libre Baskerville (serif)', value: '"Libre Baskerville", serif' },
  { label: 'Source Serif 4 (serif)', value: '"Source Serif 4", serif' },
  { label: 'Architects Daughter (hand)', value: '"Architects Daughter", cursive' },
];
const CODE_FONTS: { label: string; value: string }[] = [
  { label: 'System mono', value: '' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Fira Code', value: '"Fira Code", monospace' },
  { label: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace' },
  { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
  { label: 'Space Mono', value: '"Space Mono", monospace' },
  { label: 'Geist Mono', value: '"Geist Mono", monospace' },
];

/** Load a font family from Google Fonts on demand so the preview shows the real
 *  typeface (the kit token only SELECTS the family — production embeds it itself). */
function ensureFont(stack: string) {
  if (!stack) return;
  const first = stack.split(',')[0].trim().replace(/["']/g, '');
  if (!first || /^(ui-|system-ui|-apple|sans-serif|serif|monospace|cursive|Arial|Helvetica|Georgia|Times|Menlo|Consolas|Courier|Monaco)/i.test(first)) return;
  const id = 'kc-gf-' + first.replace(/\s+/g, '-').toLowerCase();
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(first)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/** Match a font stack to a curated option value by first-family name (so a theme's
 *  full stack selects the right dropdown entry); '' if none match. */
function matchFont(stack: string | undefined, list: { value: string }[]): string {
  if (!stack) return '';
  const first = stack.split(',')[0].trim().replace(/["']/g, '').toLowerCase();
  const hit = list.find((o) => o.value.split(',')[0].trim().replace(/["']/g, '').toLowerCase() === first);
  return hit ? hit.value : '';
}

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

interface ThemeExtras { radius: number; fontBase: string; fontCode: string; tracking: number; shadow: string }

/** Build paste-ready CSS: full light set on :root (+ radius/font/tracking/shadow),
 *  dark set on .dark. */
function buildCss(light: Palette, dark: Palette, x: ThemeExtras): string {
  const rootExtra = [
    `  --kc-radius: ${x.radius}rem;`,
    x.fontBase ? `  --kc-font-base: ${x.fontBase};` : '',
    x.fontCode ? `  --kc-font-code: ${x.fontCode};` : '',
    x.tracking ? `  --kc-tracking: ${x.tracking}em;` : '',
    x.shadow ? `  --kc-shadow-color: ${x.shadow};` : '',
  ].filter(Boolean).join('\n');
  const body = (p: Palette, extra = ''): string =>
    [...ALL_TOKENS.map((t) => `  ${t.token}: ${p[t.token]};`), extra].filter(Boolean).join('\n');
  return `:root {\n${body(light, rootExtra)}\n}\n\n.dark {\n${body(dark)}\n}`;
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
  let codeHost: (HTMLElement & Record<string, unknown>) | undefined;
  let promptHost: HTMLElement | undefined;
  let canvasEl: HTMLDivElement | undefined;
  let streamTimer: number | undefined;

  const [ready, setReady] = createSignal(false);
  const [mode, setMode] = createSignal<'light' | 'dark'>('light');
  const [light, setLight] = createSignal<Palette>({});
  const [dark, setDark] = createSignal<Palette>({});
  const [radius, setRadius] = createSignal(DEFAULT_RADIUS);
  const [fontBase, setFontBase] = createSignal('');
  const [fontCode, setFontCode] = createSignal('');
  const [tracking, setTracking] = createSignal(0); // em
  const [shadowColor, setShadowColor] = createSignal('#000000');
  const [preset, setPreset] = createSignal('Default');
  const [canvasTab, setCanvasTab] = createSignal<'chat' | 'cards' | 'content'>('chat');
  const [copied, setCopied] = createSignal(false);
  const [codeOpen, setCodeOpen] = createSignal(false);
  const [importOpen, setImportOpen] = createSignal(false);
  const [importText, setImportText] = createSignal('');
  const [importError, setImportError] = createSignal('');
  const [themeOpen, setThemeOpen] = createSignal(false);
  const [themeSearch, setThemeSearch] = createSignal('');
  let themeMenu: HTMLDivElement | undefined;
  const filteredThemes = () => ALL_THEME_NAMES.filter((n) => n.toLowerCase().includes(themeSearch().toLowerCase()));
  // Accordion: open the two most-used groups by default, collapse the rest.
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g, i) => [g.name, i < 2])),
  );
  const toggleGroup = (name: string) => setOpenGroups((o) => ({ ...o, [name]: !o[name] }));

  const active = () => (mode() === 'light' ? light() : dark());
  const extras = (): ThemeExtras => ({ radius: radius(), fontBase: fontBase(), fontCode: fontCode(), tracking: tracking(), shadow: shadowColor() });

  // Apply the active palette + radius onto the canvas wrapper. Custom properties
  // inherit through every kc-* shadow root inside, so the whole canvas reskins.
  createEffect(() => {
    if (!canvasEl || !Object.keys(active()).length) return;
    const p = active();
    for (const t of ALL_TOKENS) canvasEl.style.setProperty(t.token, p[t.token]);
    canvasEl.style.setProperty('--kc-radius', `${radius()}rem`);
    canvasEl.style.background = p['--kc-color-background'];
    // Typography + shadow tokens.
    const setOrClear = (name: string, val: string) => val ? canvasEl!.style.setProperty(name, val) : canvasEl!.style.removeProperty(name);
    setOrClear('--kc-font-base', fontBase());
    setOrClear('--kc-font-code', fontCode());
    canvasEl.style.setProperty('--kc-tracking', `${tracking()}em`);
    canvasEl.style.setProperty('--kc-shadow-color', shadowColor());
    ensureFont(fontBase());
    ensureFont(fontCode());
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

  const loadTheme = (name: string) => {
    const l = seedPalette('light');
    const d = seedPalette('dark');
    const t = THEME_PRESETS.find((x) => x.name === name);
    if (t) {
      for (const [k, tok] of Object.entries(SHADCN_TO_KC)) {
        if (t.light[k]) l[tok] = toHex(t.light[k]);
        if (t.dark[k]) d[tok] = toHex(t.dark[k]);
      }
      // The kit has a code-foreground token tweakcn doesn't — derive it from the
      // theme's ring so inline code stays on-brand.
      if (t.light.ring) l['--kc-color-code-foreground'] = toHex(t.light.ring);
      if (t.dark.ring) d['--kc-color-code-foreground'] = toHex(t.dark.ring);
      setRadius(t.radius);
      setFontBase(matchFont(t.fontBase, BODY_FONTS) || t.fontBase || '');
      setFontCode(matchFont(t.fontCode, CODE_FONTS) || t.fontCode || '');
      setTracking(t.tracking ? (parseFloat(t.tracking) || 0) : 0);
      setShadowColor(t.shadow ? toHex(t.shadow) : '#000000');
    } else {
      setRadius(DEFAULT_RADIUS);
      setFontBase('');
      setFontCode('');
      setTracking(0);
      setShadowColor('#000000');
    }
    setLight(l);
    setDark(d);
    setPreset(name);
  };

  const reset = () => loadTheme('Default');

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(buildCss(light(), dark(), extras()));
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
    setImportOpen(false);
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
    loadTheme('Default');
    const onDocDown = (e: PointerEvent) => {
      if (themeOpen() && themeMenu && !themeMenu.contains(e.target as Node)) setThemeOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (codeOpen()) setCodeOpen(false);
      else if (importOpen()) setImportOpen(false);
      else if (themeOpen()) setThemeOpen(false);
    };
    document.addEventListener('pointerdown', onDocDown);
    document.addEventListener('keydown', onKey);
    onCleanup(() => {
      document.removeEventListener('pointerdown', onDocDown);
      document.removeEventListener('keydown', onKey);
    });
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
    if (codeHost) {
      customElements.upgrade(codeHost);
      codeHost.code = "export function greet(name: string) {\n  // inline `code` and blocks use --kc-font-code\n  return `Hello, ${name}!`;\n}";
      codeHost.language = 'typescript';
    }
    setReady(true);
    onCleanup(() => {
      clearTimeout(streamTimer);
      chatHost?.removeEventListener('kc-submit', onSubmit);
    });
  });

  const swatch = 'h-7 w-7 shrink-0 cursor-pointer rounded-md border border-line bg-transparent p-0';

  return (
    <div class="theme-studio-root not-content my-4 flex flex-col overflow-hidden rounded-xl border border-line bg-surface lg:h-[82vh] lg:min-h-[660px]">
      {/* Full-width toolbar: theme selector (left) · mode + actions (right) */}
      <div class="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        {/* Theme selector — searchable dropdown of the kit default + tweakcn presets */}
        <div ref={themeMenu} class="relative">
          <button
            type="button"
            onClick={() => setThemeOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={themeOpen()}
            class="flex w-[260px] max-w-[60vw] items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-sm text-ink transition-colors hover:bg-ink/5"
          >
            <span class="flex items-center gap-0.5">
              <For each={themeDots(preset())}>{(c) => <span class="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />}</For>
            </span>
            <span class="truncate font-medium">{preset()}</span>
            <IconChevron class="ml-auto h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform" classList={{ 'rotate-90': themeOpen() }} />
          </button>
          <Show when={themeOpen()}>
            <div class="absolute left-0 top-full z-50 mt-1 w-[300px] max-w-[80vw] overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
              <div class="border-b border-line p-2">
                <input
                  value={themeSearch()}
                  onInput={(e) => setThemeSearch(e.currentTarget.value)}
                  placeholder="Search themes…"
                  class="w-full rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink"
                />
              </div>
              <div class="max-h-[60vh] overflow-auto">
                <For each={filteredThemes()}>
                  {(name) => (
                    <button
                      type="button"
                      onClick={() => { loadTheme(name); setThemeOpen(false); setThemeSearch(''); }}
                      class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-ink/5"
                      classList={{ 'bg-ink/[0.07] font-semibold text-ink': preset() === name, 'text-ink-2': preset() !== name }}
                    >
                      <span class="flex items-center gap-0.5">
                        <For each={themeDots(name)}>{(c) => <span class="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />}</For>
                      </span>
                      <span class="truncate">{name}</span>
                    </button>
                  )}
                </For>
                <Show when={!filteredThemes().length}>
                  <div class="px-2.5 py-3 text-center text-xs text-ink/55">No themes match.</div>
                </Show>
              </div>
            </div>
          </Show>
        </div>

        {/* Mode + actions */}
        <div class="flex items-center gap-1.5">
          <div class="inline-flex overflow-hidden rounded-md border border-line text-xs">
            <button type="button" class="px-2.5 py-1 transition-colors" classList={{ 'bg-ink text-bg': mode() ==='light', 'text-ink-2': mode() !== 'light' }} onClick={() => setMode('light')}>Light</button>
            <button type="button" class="px-2.5 py-1 transition-colors" classList={{ 'bg-ink text-bg': mode() ==='dark', 'text-ink-2': mode() !== 'dark' }} onClick={() => setMode('dark')}>Dark</button>
          </div>
          <button type="button" onClick={() => setImportOpen(true)} class="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors hover:bg-ink/5"><IconImport class="h-3.5 w-3.5" /><span class="hidden sm:inline">Import</span></button>
          <button type="button" onClick={reset} class="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors hover:bg-ink/5"><IconReset class="h-3.5 w-3.5" /><span class="hidden sm:inline">Reset</span></button>
          <button type="button" onClick={() => setCodeOpen(true)} class="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-ink/5"><IconCode class="h-3.5 w-3.5" />Code</button>
        </div>
      </div>

      {/* Body: inspector · canvas */}
      <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Inspector — collapsible token groups + radius */}
        <div class="flex w-full shrink-0 flex-col overflow-auto border-b border-line lg:w-[330px] lg:border-b-0 lg:border-r">
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
              <input type="range" min="0" max="1.4" step="0.05" value={radius()} onInput={(e) => setRadius(parseFloat(e.currentTarget.value))} class="flex-1" style={{ 'accent-color': 'var(--kc-ink-3)' }} aria-label="Corner radius" />
              <span class="w-14 text-right text-xs tabular-nums text-ink-2">{radius()}rem</span>
            </label>
          </div>

          {/* Typography */}
          <div class="border-t border-line/60 px-3 py-3">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">Typography</div>
            <label class="mb-2.5 flex flex-col gap-1">
              <span class="text-sm font-medium text-ink">Body font</span>
              <select
                value={fontBase()}
                onChange={(e) => { setFontBase(e.currentTarget.value); ensureFont(e.currentTarget.value); setPreset('Custom'); }}
                class="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              >
                <For each={BODY_FONTS}>{(f) => <option value={f.value}>{f.label}</option>}</For>
                <Show when={fontBase() && !BODY_FONTS.some((f) => f.value === fontBase())}>
                  <option value={fontBase()}>{fontBase().split(',')[0].replace(/["']/g, '')} (theme)</option>
                </Show>
              </select>
            </label>
            <label class="mb-2.5 flex flex-col gap-1">
              <span class="text-sm font-medium text-ink">Code font</span>
              <select
                value={fontCode()}
                onChange={(e) => { setFontCode(e.currentTarget.value); ensureFont(e.currentTarget.value); setPreset('Custom'); }}
                class="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              >
                <For each={CODE_FONTS}>{(f) => <option value={f.value}>{f.label}</option>}</For>
                <Show when={fontCode() && !CODE_FONTS.some((f) => f.value === fontCode())}>
                  <option value={fontCode()}>{fontCode().split(',')[0].replace(/["']/g, '')} (theme)</option>
                </Show>
              </select>
            </label>
            <label class="flex items-center gap-2.5 text-sm">
              <span class="w-16 shrink-0 text-ink">Tracking</span>
              <input type="range" min="-0.05" max="0.2" step="0.005" value={tracking()} onInput={(e) => { setTracking(parseFloat(e.currentTarget.value)); setPreset('Custom'); }} class="flex-1" style={{ 'accent-color': 'var(--kc-ink-3)' }} aria-label="Letter spacing" />
              <span class="w-14 text-right text-xs tabular-nums text-ink-2">{tracking().toFixed(3)}em</span>
            </label>
          </div>

          {/* Shadow */}
          <div class="border-t border-line/60 px-3 py-3">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">Shadow</div>
            <label class="flex items-center gap-2.5">
              <input type="color" value={shadowColor()} onInput={(e) => { setShadowColor(e.currentTarget.value); setPreset('Custom'); }} class={swatch} aria-label="Shadow color" />
              <span class="flex min-w-0 flex-col leading-tight">
                <span class="truncate text-sm font-medium text-ink">Shadow color</span>
                <span class="truncate text-xs text-ink/55">Elevation tint — cards, popovers</span>
              </span>
            </label>
          </div>
        </div>

        {/* Canvas */}
        <div ref={canvasEl} classList={{ dark: mode() === 'dark' }} class="relative min-w-0 flex-1 overflow-auto">
          <Show when={!ready()}>
            <div class="absolute inset-0 z-20 grid place-items-center text-sm text-ink/55">Loading preview…</div>
          </Show>

          {/* Tab bar — themed, sticky. Each tab demonstrates a different slice of
              the tokens so a developer can see where they apply. */}
          <div class="sticky top-0 z-10 flex items-center gap-1 border-b px-4 py-2" style={{ 'border-color': 'var(--kc-color-border)', background: 'var(--kc-color-background)' }}>
            <For each={[['chat', 'Chat'], ['cards', 'Cards'], ['content', 'Content']] as const}>
              {([id, label]) => (
                <button
                  type="button"
                  onClick={() => setCanvasTab(id)}
                  class="rounded-md px-3 py-1 text-sm transition-colors"
                  style={canvasTab() === id
                    ? { background: 'color-mix(in oklab, var(--kc-color-foreground) 9%, transparent)', color: 'var(--kc-color-foreground)', 'font-weight': '600' }
                    : { color: 'var(--kc-color-muted-foreground)' }}
                >
                  {label}
                </button>
              )}
            </For>
          </div>

          <div class="mx-auto max-w-3xl p-4">
            {/* Chat — a full working example */}
            <div classList={{ hidden: canvasTab() !== 'chat' }}>
              <p class="mb-2 text-xs" style={{ color: 'var(--kc-color-muted-foreground)' }}>A full chat: background, card bubbles, the primary send button, focus ring, and the base font.</p>
              <div class="h-[440px] overflow-hidden rounded-xl border" style={{ 'border-color': 'var(--kc-color-border)' }}>
                {/* @ts-expect-error custom element */}
                <kc-chat ref={(el: HTMLElement) => (chatHost = el as never)} style={{ display: 'block', height: '100%' }} />
              </div>
            </div>

            {/* Cards — generative-UI surfaces */}
            <div classList={{ hidden: canvasTab() !== 'cards' }}>
              <p class="mb-2 text-xs" style={{ color: 'var(--kc-color-muted-foreground)' }}>Cards: the card surface + elevation (shadow color), primary / secondary / destructive buttons, the accent (recommended), and borders.</p>
              <div class="grid gap-4 md:grid-cols-2">
                {/* @ts-expect-error custom element */}
                <kc-confirm ref={(el: HTMLElement) => (confirmHost = el as never)} style={{ display: 'block' }} />
                {/* @ts-expect-error custom element */}
                <kc-choice ref={(el: HTMLElement) => (choiceHost = el as never)} style={{ display: 'block' }} />
              </div>
            </div>

            {/* Content — the harder-to-see tokens, fonts, and shadow */}
            <div classList={{ hidden: canvasTab() !== 'content' }} class="flex flex-col gap-5">
              <div>
                <p class="mb-2 text-xs" style={{ color: 'var(--kc-color-muted-foreground)' }}>Code blocks use the <strong>code font</strong> (--kc-font-code) and the code accent.</p>
                {/* @ts-expect-error custom element */}
                <kc-code-block ref={(el: HTMLElement) => (codeHost = el as never)} style={{ display: 'block' }} />
              </div>
              <div>
                <p class="mb-2 text-xs" style={{ color: 'var(--kc-color-muted-foreground)' }}>The composer — base font, input background, and border.</p>
                {/* @ts-expect-error custom element */}
                <kc-prompt-input ref={(el: HTMLElement) => (promptHost = el)} placeholder="Ask anything…" style={{ display: 'block' }} />
              </div>
              <div>
                <p class="mb-2 text-xs" style={{ color: 'var(--kc-color-muted-foreground)' }}>An elevated surface — the shadow tint is <strong>--kc-shadow-color</strong>.</p>
                <div class="rounded-xl p-4 text-sm" style={{ background: 'var(--kc-color-card)', color: 'var(--kc-color-card-foreground)', border: '1px solid var(--kc-color-border)', 'box-shadow': '0 6px 16px -3px color-mix(in oklab, var(--kc-shadow-color, oklch(0 0 0)) 16%, transparent), 0 3px 8px -3px color-mix(in oklab, var(--kc-shadow-color, oklch(0 0 0)) 12%, transparent)' }}>
                  Cards, popovers, and menus lift off the page with this shadow. Set it transparent for a flat look.
                </div>
              </div>
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
      </div>

      <Show when={codeOpen()}>
        <Modal title="Theme CSS" wide onClose={() => setCodeOpen(false)}>
          <p class="mb-3 text-xs text-ink-2">Drop this on <code class="rounded bg-ink/5 px-1">:root</code> to rebrand every <code class="rounded bg-ink/5 px-1">kc-*</code> element; the <code class="rounded bg-ink/5 px-1">.dark</code> block holds the dark overrides.</p>
          <div class="relative">
            <button type="button" onClick={copyCss} class="absolute right-2 top-2 flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-ink/5">{copied() ? <IconCheck class="h-3.5 w-3.5" /> : <IconCopy class="h-3.5 w-3.5" />}{copied() ? 'Copied' : 'Copy'}</button>
            <pre class="max-h-[62vh] overflow-auto rounded-lg border border-line bg-surface-2 p-3 pr-20 font-mono text-xs leading-relaxed text-ink"><code>{buildCss(light(), dark(), extras())}</code></pre>
          </div>
        </Modal>
      </Show>

      <Show when={importOpen()}>
        <Modal title="Import theme" onClose={() => { setImportOpen(false); setImportError(''); }}>
          <p class="mb-2 text-xs text-ink-2">Paste a <code class="rounded bg-ink/5 px-1">:root</code> / <code class="rounded bg-ink/5 px-1">.dark</code> block of <code class="rounded bg-ink/5 px-1">--kc-color-*</code> tokens.</p>
          <textarea
            value={importText()}
            onInput={(e) => setImportText(e.currentTarget.value)}
            placeholder={':root {\n  --kc-color-primary: #7c3aed;\n}\n.dark {\n  --kc-color-primary: #a78bfa;\n}'}
            class="h-48 w-full resize-none rounded-md border border-line bg-surface p-2 font-mono text-xs text-ink"
          />
          <Show when={importError()}><p class="mt-1 text-xs text-red-500">{importError()}</p></Show>
          <div class="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => { setImportOpen(false); setImportError(''); }} class="rounded-md border border-line px-3 py-1.5 text-xs text-ink-2 transition-colors hover:bg-ink/5">Cancel</button>
            <button type="button" onClick={applyImport} class="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-bg transition-opacity hover:opacity-90">Apply</button>
          </div>
        </Modal>
      </Show>
    </div>
  );
}
