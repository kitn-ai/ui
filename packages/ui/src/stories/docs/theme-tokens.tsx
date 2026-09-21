import { createSignal, For, onMount, type JSX } from 'solid-js';
import type { Palette } from './theme-editor/theme-css';

// Docs-only helpers (not part of the kit's public API). They auto-discover the
// kit's design tokens straight from the loaded CSS, so the reference + editor
// can never drift from theme.css as tokens are added or changed.

type ColorToken = { name: string; light: string; dark: string };
type RadiusToken = { name: string; value: string };
type TextToken = { name: string; size: string; lineHeight: string };
type KnobToken = { name: string; fallback: string; current: string };

/** Purpose labels + row order for every table. A label ONLY: a token PURPOSE has never
 *  heard of still gets a row (blank Purpose, last), so the page can lose a label but
 *  never a token -- which is how the colour table came to be 17 tokens short. */
export const PURPOSE: Record<string, string> = {
  '--color-background': 'App / page background',
  '--color-foreground': 'Default text',
  '--color-card': 'Card surface',
  '--color-card-foreground': 'Text on cards',
  '--color-popover': 'Popover / menu surface',
  '--color-popover-foreground': 'Text in popovers',
  '--color-primary': 'Primary action background',
  '--color-primary-foreground': 'Text on primary',
  '--color-secondary': 'Secondary surface',
  '--color-secondary-foreground': 'Text on secondary',
  '--color-muted': 'Muted surface (subtle fills)',
  '--color-muted-foreground': 'Muted / secondary text',
  '--color-surface': 'Raised surface (panels)',
  '--color-surface-strong': 'Stronger raised surface',
  '--color-surface-sunken': 'Recessed / inset surface',
  '--color-accent': 'Accent / hover surface',
  '--color-accent-foreground': 'Text on accent',
  '--color-destructive': 'Destructive / danger fill',
  '--color-destructive-foreground': 'Text on destructive',
  '--color-destructive-text': 'Error text (legible in both modes)',
  '--color-success': 'Success fill',
  '--color-success-foreground': 'Text on success',
  '--color-warning': 'Warning fill',
  '--color-warning-foreground': 'Text on warning',
  '--color-info': 'Info fill',
  '--color-info-foreground': 'Text on info',
  '--color-success-soft': 'Success callout tint',
  '--color-warning-soft': 'Warning callout tint',
  '--color-info-soft': 'Info callout tint',
  '--color-destructive-soft': 'Destructive callout tint',
  '--color-hover': 'Row / control hover fill',
  '--color-selected': 'Selected row fill',
  '--color-unread': 'Unread dot / badge',
  '--color-highlight': 'Marked keyword fill',
  '--color-selection': 'Selected-text background',
  '--color-selection-foreground': 'Selected-text colour',
  '--color-border': 'Decorative borders / dividers',
  '--color-input': 'Form-control boundary (≥ 3:1, WCAG 1.4.11)',
  '--color-ring': 'Focus ring',
  '--color-scrollbar-thumb': 'Custom scrollbar thumb',
  '--color-scrollbar-thumb-hover': 'Scrollbar thumb (hover)',
  '--color-sidebar': 'Sidebar background',
  '--color-code-foreground': 'Inline code text / accent',
  '--color-tool-blue': 'Tool-call accent: running / info',
  '--color-tool-green': 'Tool-call accent: success',
  '--color-tool-amber': 'Tool-call accent: pending / warning',
  '--color-tool-red': 'Tool-call accent: error',
  // The kit type scale, ascending. Same map on purpose: one label and one row per
  // rung, and the three Tailwind aliases (`--text-xs|sm|base`) are NOT here -- they
  // resolve the rung above them, so listing them would be two rows for one token.
  '--text-micro': 'Micro labels (badges, pills)',
  '--text-caption': 'Captions / supporting text',
  '--text-meta': 'Meta / labels (controls, xs code)',
  '--text-compact': 'Dense chrome / code',
  '--text-body': 'Body copy',
  '--text-title': 'Headings / titles',
  '--text-lg': 'Section headings',
  // The `--kai-*` options (the Options table). Same map, same reason: one purpose
  // per token name, in reading order. Labels and row order come from here, the row
  // SET does not: every table derives its names from the loaded CSS, so a token this
  // map has never heard of still gets a row (blank Purpose) instead of going missing.
  // discover() filters this map by prefix, so these cannot reach the tables above.
  '--kai-radius': 'Corner radius (root of the --radius-* ladder)',
  '--radius-pill': 'Fully-round corners (badges, chips, switch tracks)',
  '--kai-radius-pill': 'Fully-round corners (badges, chips, switch tracks)',
  '--code-radius': 'Code block / inline code corner',
  '--kai-code-radius': 'Code block / inline code corner',
  '--kai-shadow-strength': 'Elevation multiplier (0 = flat; scales every shadow rung)',
  '--kai-shadow-color': 'Shadow tint',
  '--kai-weight-normal': 'Body text weight',
  '--kai-weight-medium': 'Controls / labels weight',
  '--kai-weight-semibold': 'Emphasis weight',
  '--kai-weight-bold': 'Strong emphasis weight',
  '--kai-density': 'Spacing multiplier (p-*, gap-*, size-* move together)',
  '--kai-font-code': 'Mono font stack (code)',
  '--kai-font-base': 'Sans font stack (the UI chrome)',
  '--kai-tracking': 'Letter spacing (tracking)',
};

/** Raw walk of the loaded stylesheets -> light/dark custom-property maps (colors + radius),
 *  plus the two readings the token FAMILIES are derived from instead of being listed:
 *  `declared` (every custom property with the raw text it was declared with) and
 *  `knobValues` (every declaration that mentions a `--kai-*` knob).
 *  Recurses into grouping rules (@layer, @media, @supports) because Tailwind v4
 *  emits the `:root` theme tokens inside an `@layer`, which a flat walk would miss. */
function collect(): {
  light: Record<string, string>;
  dark: Record<string, string>;
  declared: Record<string, string>;
  knobValues: string[];
} {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  const declared: Record<string, string> = {};
  const knobValues: string[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      const r = rule as CSSStyleRule;
      if (r.style) {
        const isRoot = r.selectorText ? /(^|,)\s*:root\b/.test(r.selectorText) : false;
        const isDark = r.selectorText ? /(^|,)\s*\.dark\b/.test(r.selectorText) : false;
        for (const prop of Array.from(r.style)) {
          const val = r.style.getPropertyValue(prop).trim();
          if (!val) continue;
          // Knobs are wired from plain class rules too (`.kai-elevation` reads
          // --kai-shadow-strength, `.chat-markdown code` reads --kai-font-code),
          // so every declaration is scanned and not only the :root ones.
          if (val.includes('var(--kai-')) knobValues.push(val);
          if (!prop.startsWith('--')) continue;
          declared[prop] ??= val;
          if (isRoot) light[prop] = val;
          if (isDark) dark[prop] = val;
        }
      }
      // Grouping rules (@layer/@media/@supports) carry nested rules: recurse.
      const nested = (rule as CSSGroupingRule).cssRules;
      if (nested) visit(nested);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // cross-origin sheet
    }
  }
  return { light, dark, declared, knobValues };
}

/** The corner tokens the reference lists. A token is a corner when its value reads the
 *  ladder root (`calc(var(--radius) - 4px)`, `var(--radius)`) or wires the `--kai-` knob
 *  of its own name (`--radius: var(--kai-radius, 0.6rem)`, `--radius-pill`,
 *  `--code-radius`). Tailwind ships its own stock `--radius-xs`/`--radius-4xl` and this
 *  file merges into a consumer's Tailwind build, so those arrive in the same `:root`:
 *  they are plain lengths that read neither, which is what keeps them out -- an allowlist
 *  cannot do that job, because which stock rungs survive Tailwind's tree-shaking depends
 *  on the utilities the consumer's own source happens to use.
 *
 *  The ORDER is read off the values too, and has to be: measured in a real browser,
 *  Tailwind re-emits the @theme block in its own grouping and the ladder root lands
 *  AFTER its own rungs, so declaration order is not the ladder order. The rungs name
 *  the token they derive from inside their own values, so the root is read off them
 *  rather than typed, and the rest sort by their own offset. */
export function cornerTokens(declared: Record<string, string>): string[] {
  const corners = Object.entries(declared).filter(([name, value]) => {
    const isCorner = name === '--radius' || name === '--code-radius' || name.startsWith('--radius-');
    if (!isCorner) return false;
    if (/var\(\s*--radius\s*\)/.test(value)) return true;
    return new RegExp(`var\\(\\s*--kai-${name.slice(2)}\\s*[,)]`).test(value);
  });
  const root = corners
    .flatMap(([, value]) => [...value.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g)].map((m) => m[1]))[0];
  const sortKey = ([name, value]: [string, string]) => (name === root ? -1e9 : rungOffset(value));
  return corners.sort((a, b) => sortKey(a) - sortKey(b)).map(([name]) => name);
}

/** Row order for every derived table: PURPOSE's key order for the rows it names, then
 *  whatever is left, in the order the sheet declares it. No row is dropped for lacking a
 *  label -- the Purpose cell prints blank instead. */
function byPurpose<T>(rows: T[], name: (row: T) => string): T[] {
  const order = new Map(Object.keys(PURPOSE).map((n, i) => [n, i]));
  return [...rows].sort((a, b) => (order.get(name(a)) ?? 1_000_000) - (order.get(name(b)) ?? 1_000_000));
}

/** The colour and type rows, derived the way the corners are: a token is a KIT token when
 *  the sheet wires its OWN knob into it -- `--color-card: var(--kai-color-card, …)`,
 *  `--text-title: var(--kai-text-title, 1rem)`. That one shape also excludes everything
 *  that arrives beside them in the same `:root`: Tailwind's stock `--color-red-500` /
 *  `--text-4xl` read no knob, and theme.css's stock ALIASES (`--text-xs: var(--kai-text-meta,
 *  …)`) read a knob that is not their own name -- which is what makes them aliases, so one
 *  rung can never be counted twice. A kit token declared with no knob at all would be
 *  dropped, which is why the colour guard requires theme.css's own `--color-*` set to be
 *  shown whole instead of letting the drop stay quiet. */
function kitFamilyRungs(declared: Record<string, string>, prefix: '--color-' | '--text-'): string[] {
  const rungs = Object.entries(declared)
    .filter(([name, value]) => {
      if (!name.startsWith(prefix)) return false;
      return new RegExp(`var\\(\\s*--kai-${name.slice(2)}\\s*[,)]`).test(value);
    })
    .map(([name]) => name);
  return byPurpose(rungs, (n) => n);
}

/** The colour rows. Every `--color-*` theme.css declares, ordered by PURPOSE. */
export function colorTokens(declared: Record<string, string>): string[] {
  return kitFamilyRungs(declared, '--color-');
}

/** The type rungs. `--text-xs|sm|base` alias the kit scale rather than being rungs of it,
 *  so they are not rows -- each is two names for one token. */
export function textTokens(declared: Record<string, string>): string[] {
  return kitFamilyRungs(declared, '--text-');
}

/** A rung's size as the sheet writes it: `calc(var(--radius) - 4px)` -> -4, `var(--radius)`
 *  -> 0. A corner that is not a rung at all (`--radius-pill`, `--code-radius`) sorts last,
 *  in the order the sheet declares those. */
function rungOffset(value: string): number {
  const m = value.match(/calc\(\s*var\(\s*--radius\s*\)\s*([+-])\s*([\d.]+)px\s*\)/);
  if (m) return m[1] === '-' ? -Number(m[2]) : Number(m[2]);
  return /^var\(\s*--radius\s*\)$/.test(value.trim()) ? 0 : 1e9;
}

/** The `--kai-*` options the loaded CSS wires, each with the fallback that same sheet
 *  gives it, in the order they are declared. Colour and type knobs are skipped: the
 *  Colors and Typography tables above already list those, resolved.
 *  `texts` are CSS fragments -- the runtime passes the declaration values it walked,
 *  a test can pass the whole theme.css. */
export function knobTokens(texts: Iterable<string>): { name: string; fallback: string }[] {
  const found = new Map<string, string>();
  for (const text of texts) {
    for (const m of text.matchAll(/var\(\s*(--kai-[a-zA-Z0-9-]+)\s*,/g)) {
      const name = m[1];
      if (name.startsWith('--kai-color-') || name.startsWith('--kai-text-')) continue;
      if (!found.has(name)) found.set(name, fallbackAfter(text, m.index + m[0].length));
    }
  }
  return [...found].map(([name, fallback]) => ({ name, fallback }));
}

/** The default after `var(--kai-x,` read to its matching `)` -- a color-mix() default
 *  and a font stack both carry their own commas and parentheses. */
function fallbackAfter(text: string, start: number): string {
  let i = start;
  let depth = 1;
  while (i < text.length && depth > 0) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    if (depth > 0) i++;
  }
  return text.slice(start, i).trim();
}

/** Reference data for the token table. VALUES are read live via getComputedStyle and NAMES
 *  are derived from the loaded sheet's own declarations -- every family (colours, type,
 *  corners, `--kai-*` options) for the same reason: the hand-typed colour list was 17
 *  tokens behind theme.css while the page claimed to be a complete reference. PURPOSE
 *  supplies labels and row order only. Dark values come from a throwaway `.dark` probe; a
 *  token with no `.dark` override inherits its `:root` value (identical in both columns). */
function discover(): { colors: ColorToken[]; radii: RadiusToken[]; texts: TextToken[]; knobs: KnobToken[] } {
  const rootCS = getComputedStyle(document.documentElement);
  const probe = document.createElement('div');
  probe.className = 'dark';
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const darkCS = getComputedStyle(probe);
  const get = (cs: CSSStyleDeclaration, n: string) => cs.getPropertyValue(n).trim();
  const { declared, knobValues } = collect();

  // Row ORDER is curated (PURPOSE), the row SET is derived for all four tables: a token
  // theme.css grows still appears, unlabelled and last, rather than going missing.
  const colors = colorTokens(declared).map((name) => ({ name, light: get(rootCS, name), dark: get(darkCS, name) || get(rootCS, name) }));
  const texts = textTokens(declared).map((name) => ({ name, size: get(rootCS, name), lineHeight: get(rootCS, `${name}--line-height`) || '-' }));
  const radii = cornerTokens(declared).map((name) => ({ name, value: get(rootCS, name) })).filter((r) => r.value);
  const knobs = byPurpose(
    knobTokens(knobValues).map((k) => ({ ...k, current: get(rootCS, k.name) })),
    (k) => k.name,
  );

  probe.remove();
  return { colors, radii, texts, knobs };
}

/** Light/dark palettes for the theme editor: light = colors + --radius, dark = colors.
 *  The token set is keyed off the `.dark` overrides: that's what defines a kit token
 *  and excludes Tailwind's default palette (which has no `.dark` entry). Light values
 *  come from `:root`, falling back to the dark value if a token only exists in dark. */
export function discoverPalettes(): { light: Palette; dark: Palette } {
  const { light, dark } = collect();
  const names = Object.keys(dark).filter((n) => n.startsWith('--color-')).sort();
  const lightPalette: Palette = { '--radius': light['--radius'] ?? '0.6rem' };
  const darkPalette: Palette = {};
  for (const name of names) {
    lightPalette[name] = light[name] || dark[name];
    darkPalette[name] = dark[name];
  }
  return {
    light: lightPalette,
    dark: darkPalette,
  };
}

/** Resolve any CSS color string (e.g. hsl(...)) to #rrggbb for a color input. */
export function toHex(css: string): string {
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

const cellHead: JSX.CSSProperties = { 'text-align': 'left', padding: '8px 12px', 'border-bottom': '1px solid var(--color-border)', 'font-weight': '600', 'font-size': '15px' };
const cell: JSX.CSSProperties = { padding: '8px 12px', 'border-bottom': '1px solid var(--color-border)', 'vertical-align': 'middle', 'font-size': '15px' };
// Value text (hex / size / line-height): readable, not the browser's tiny <small>.
const valueText: JSX.CSSProperties = { 'font-size': '13px', color: 'var(--color-muted-foreground)' };

function Swatch(props: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block', width: '1.15rem', height: '1.15rem', 'border-radius': '4px',
        background: props.color, border: '1px solid var(--color-border)', 'vertical-align': 'middle',
        'margin-right': '.4rem',
      }}
    />
  );
}

const sectionHead: JSX.CSSProperties = {
  margin: '1.75rem 0 .6rem', 'font-size': '13px', 'font-weight': '700',
  'letter-spacing': '.04em', 'text-transform': 'uppercase', color: 'var(--color-muted-foreground)',
};

/** Auto-generated reference of every overridable token (light + dark values). */
export function TokenTable() {
  const [data, setData] = createSignal<{ colors: ColorToken[]; radii: RadiusToken[]; texts: TextToken[]; knobs: KnobToken[] }>({ colors: [], radii: [], texts: [], knobs: [] });
  onMount(() => setData(discover()));
  return (
    <div style={{ padding: '64px 20px', width: '100%' }}>
      <style>{`.kit-token-link{color:#006DEB;text-decoration:underline}.kit-token-link:hover{text-decoration:none}html.dark .kit-token-link,.dark .kit-token-link{color:#4ea3ff}`}</style>
      <div style={{ 'font-family': '"Nunito Sans", ui-sans-serif, system-ui, sans-serif', 'font-size': '15px', color: 'var(--color-foreground)', 'max-width': '1000px', margin: '0 auto' }}>
      <h1 style={{ 'font-size': '32px', 'font-weight': '700', margin: '0 0 12px', color: 'var(--color-foreground)' }}>Token Reference</h1>
      <p style={{ margin: '0 0 .5rem', 'font-size': '16px', 'line-height': '1.6' }}>
        Every value the kit renders comes from a CSS custom property. These are the design tokens.
        Override any of them on <code>:root</code> (or any scoped parent) to rebrand the whole kit;
        because they're plain CSS variables they cascade through the Shadow DOM into every
        <code> kai-*</code> element. The table below is generated live from the loaded
        <code> theme.css</code>, so it always lists the complete, current set.
      </p>
      <p style={{ margin: '0 0 .5rem', 'font-size': '16px', 'line-height': '1.6', color: 'var(--color-muted-foreground)' }}>
        Want to design a palette visually and copy the CSS out? Use the{' '}
        <a href="https://ui.kitn.ai/theme/editor" target="_blank" rel="noreferrer" class="kit-token-link">
          theme editor at ui.kitn.ai/theme/editor
        </a>.
      </p>

      <h2 style={sectionHead}>Colors</h2>
      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
        <thead>
          <tr><th style={cellHead}>Token</th><th style={cellHead}>Purpose</th><th style={cellHead}>Light</th><th style={cellHead}>Dark</th></tr>
        </thead>
        <tbody>
          <For each={data().colors}>
            {(t) => (
              <tr>
                <td style={cell}><code>{t.name}</code></td>
                <td style={{ ...cell, color: 'var(--color-muted-foreground)' }}>{PURPOSE[t.name] || ''}</td>
                <td style={cell}><Swatch color={t.light} /><span style={valueText}>{t.light}</span></td>
                <td style={cell}><Swatch color={t.dark} /><span style={valueText}>{t.dark}</span></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <h2 style={sectionHead}>Typography</h2>
      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
        <thead>
          <tr><th style={cellHead}>Token</th><th style={cellHead}>Purpose</th><th style={cellHead}>Size</th><th style={cellHead}>Line height</th></tr>
        </thead>
        <tbody>
          <For each={data().texts}>
            {(t) => (
              <tr>
                <td style={cell}><code>{t.name}</code></td>
                <td style={{ ...cell, color: 'var(--color-muted-foreground)' }}>{PURPOSE[t.name] || ''}</td>
                <td style={cell}><span style={{ 'font-size': t.size }}>Aa</span> <span style={valueText}>{t.size}</span></td>
                <td style={cell}><span style={valueText}>{t.lineHeight}</span></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <h2 style={sectionHead}>Radius</h2>
      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
        <thead>
          <tr><th style={cellHead}>Token</th><th style={cellHead}>Purpose</th><th style={cellHead}>Value</th></tr>
        </thead>
        <tbody>
          <For each={data().radii}>
            {(t) => (
              <tr>
                <td style={cell}><code>{t.name}</code></td>
                <td style={{ ...cell, color: 'var(--color-muted-foreground)' }}>{PURPOSE[t.name] || 'Corner radius'}</td>
                <td style={cell}>
                  <span style={{ display: 'inline-block', width: '1.6rem', height: '1.1rem', background: 'var(--color-muted)', border: '1px solid var(--color-border)', 'border-top-left-radius': t.value, 'border-bottom-left-radius': t.value, 'vertical-align': 'middle', 'margin-right': '.4rem' }} />
                  <span style={valueText}>{t.value}</span>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <h2 style={sectionHead}>Options</h2>
      <p style={{ margin: '0 0 .5rem', 'font-size': '14px', 'line-height': '1.6', color: 'var(--color-muted-foreground)' }}>
        The <code>--kai-*</code> options sit behind the tokens above: each one is what a
        consumer sets, and the resolved tokens it drives are what the other tables list.
        The options are read off this stylesheet's own declarations -- including their
        defaults -- so a new one cannot go missing from here.
      </p>
      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
        <thead>
          <tr><th style={cellHead}>Option</th><th style={cellHead}>Purpose</th><th style={cellHead}>Default</th><th style={cellHead}>Current</th></tr>
        </thead>
        <tbody>
          <For each={data().knobs}>
            {(k) => (
              <tr>
                <td style={cell}><code>{k.name}</code></td>
                <td style={{ ...cell, color: 'var(--color-muted-foreground)' }}>{PURPOSE[k.name] || ''}</td>
                <td style={cell}><span style={valueText}>{k.fallback}</span></td>
                <td style={cell}><span style={valueText}>{k.current || 'unset'}</span></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <p style={{ 'margin-top': '1rem', color: 'var(--color-muted-foreground)', 'font-size': '13px' }}>
        Generated from the loaded CSS -- names as well as values -- so it reflects the
        current tokens in <code>theme.css</code>, and <code>Current</code> stays
        <code> unset</code> until a consumer sets an option.
      </p>
      </div>
    </div>
  );
}
