import { createSignal, For, onMount, type JSX } from 'solid-js';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Loader } from '../../components/loader';

// Docs-only helpers (not part of the kit's public API). They auto-discover the
// kit's design tokens straight from the loaded CSS, so the reference + editor
// can never drift from theme.css as tokens are added or changed.

type ColorToken = { name: string; light: string; dark: string };
type RadiusToken = { name: string; value: string };

const PURPOSE: Record<string, string> = {
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
  '--color-accent': 'Accent / hover surface',
  '--color-accent-foreground': 'Text on accent',
  '--color-destructive': 'Destructive / danger',
  '--color-destructive-foreground': 'Text on destructive',
  '--color-border': 'Borders / dividers',
  '--color-input': 'Input field background',
  '--color-ring': 'Focus ring',
  '--color-sidebar': 'Sidebar background',
  '--color-code-foreground': 'Inline code text / accent',
};

/** Walk the loaded stylesheets and collect the kit's tokens. A color token is
 *  one that has a `.dark` override (this excludes Tailwind's default palette). */
function discover(): { colors: ColorToken[]; radii: RadiusToken[] } {
  const lightRoot: Record<string, string> = {};
  const darkRoot: Record<string, string> = {};
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(rules)) {
      const r = rule as CSSStyleRule;
      if (!r.style || !r.selectorText) continue;
      const isRoot = /(^|,)\s*:root\b/.test(r.selectorText);
      const isDark = /(^|,)\s*\.dark\b/.test(r.selectorText);
      if (!isRoot && !isDark) continue;
      for (const prop of Array.from(r.style)) {
        if (!prop.startsWith('--color-') && !prop.startsWith('--radius')) continue;
        const val = r.style.getPropertyValue(prop).trim();
        if (isRoot) lightRoot[prop] = val;
        if (isDark) darkRoot[prop] = val;
      }
    }
  }
  const colors = Object.keys(darkRoot)
    .filter((n) => n.startsWith('--color-'))
    .sort()
    .map((name) => ({ name, light: lightRoot[name] || darkRoot[name], dark: darkRoot[name] }));
  const radii = Object.keys(lightRoot)
    .filter((n) => n.startsWith('--radius'))
    .sort()
    .map((name) => ({ name, value: lightRoot[name] }));
  return { colors, radii };
}

/** Resolve any CSS color string (e.g. hsl(...)) to #rrggbb for a color input. */
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

const cellHead: JSX.CSSProperties = { 'text-align': 'left', padding: '6px 10px', 'border-bottom': '1px solid var(--color-border)', 'font-weight': '600' };
const cell: JSX.CSSProperties = { padding: '6px 10px', 'border-bottom': '1px solid var(--color-border)', 'vertical-align': 'middle' };

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

/** Auto-generated reference of every overridable token (light + dark values). */
export function TokenTable() {
  const [data, setData] = createSignal<{ colors: ColorToken[]; radii: RadiusToken[] }>({ colors: [], radii: [] });
  onMount(() => setData(discover()));
  return (
    <div style={{ 'font-size': '13px', color: 'var(--color-foreground)' }}>
      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
        <thead>
          <tr>
            <th style={cellHead}>Token</th>
            <th style={cellHead}>Purpose</th>
            <th style={cellHead}>Light</th>
            <th style={cellHead}>Dark</th>
          </tr>
        </thead>
        <tbody>
          <For each={data().colors}>
            {(t) => (
              <tr>
                <td style={cell}><code>{t.name}</code></td>
                <td style={{ ...cell, color: 'var(--color-muted-foreground)' }}>{PURPOSE[t.name] || ''}</td>
                <td style={cell}><Swatch color={t.light} /><small>{t.light}</small></td>
                <td style={cell}><Swatch color={t.dark} /><small>{t.dark}</small></td>
              </tr>
            )}
          </For>
          <For each={data().radii}>
            {(t) => (
              <tr>
                <td style={cell}><code>{t.name}</code></td>
                <td style={{ ...cell, color: 'var(--color-muted-foreground)' }}>Corner radius</td>
                <td style={{ ...cell }} colspan={2}><small>{t.value}</small></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <p style={{ 'margin-top': '.75rem', color: 'var(--color-muted-foreground)', 'font-size': '12px' }}>
        This table is generated live from the loaded CSS — it always reflects the current tokens in <code>theme.css</code>.
      </p>
    </div>
  );
}

const inlineCode: JSX.CSSProperties = {
  color: 'var(--color-code-foreground)',
  background: 'color-mix(in oklab, var(--color-code-foreground) 15%, transparent)',
  padding: '.1em .35em', 'border-radius': '4px', 'font-family': 'ui-monospace, monospace',
};

/** A "kitchen sink" preview that exercises every token so any change is visible. */
function Preview() {
  return (
    <div class="h-full overflow-auto rounded-xl border border-border bg-background p-4 text-foreground text-sm flex flex-col gap-3">
      <div class="text-sm font-semibold">Live preview</div>

      {/* buttons + badge: primary / secondary / accent / destructive / muted */}
      <div class="flex flex-wrap items-center gap-2">
        <Button>Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="outline">Outline</Button>
        <button class="bg-secondary text-secondary-foreground rounded-md px-3 h-8 text-xs font-medium">Secondary</button>
        <button class="bg-destructive text-destructive-foreground rounded-md px-3 h-8 text-xs font-medium">Delete</button>
        <Badge>Badge</Badge>
      </div>

      {/* sidebar + chat card: sidebar*, card*, muted, primary bubble, code */}
      <div class="flex gap-3">
        <div class="bg-sidebar text-foreground border border-border rounded-lg p-2 w-28 shrink-0 space-y-1 text-xs">
          <div class="font-medium px-2 py-1">Chats</div>
          <div class="bg-muted rounded px-2 py-1">Active</div>
          <div class="px-2 py-1 text-muted-foreground">Another</div>
        </div>
        <div class="flex-1 bg-card text-card-foreground border border-border rounded-lg p-3 space-y-2">
          <div class="bg-muted text-foreground rounded-2xl px-3 py-2 w-fit text-xs">Muted bubble</div>
          <div class="bg-primary text-primary-foreground rounded-2xl px-3 py-2 w-fit ml-auto text-xs">Primary bubble</div>
          <div class="text-muted-foreground text-xs flex items-center gap-2">
            <Loader variant="dots" size="sm" /> muted caption · inline <span style={inlineCode}>code</span>
          </div>
        </div>
      </div>

      {/* input / ring / accent / popover */}
      <div class="flex flex-wrap items-center gap-2">
        <input class="bg-input border border-border rounded-md px-2 h-8 text-xs" placeholder="Input" />
        <input class="bg-input border border-border rounded-md px-2 h-8 text-xs ring-2 ring-ring" placeholder="Focused (ring)" />
        <span class="bg-accent text-accent-foreground rounded-md px-2 py-1 text-xs">Accent</span>
        <span class="bg-popover text-popover-foreground border border-border shadow rounded-md px-2 py-1 text-xs">Popover</span>
      </div>

      {/* destructive alert */}
      <div class="mt-auto border rounded-md px-3 py-2 text-xs" style={{ 'border-color': 'color-mix(in oklab, var(--color-destructive) 45%, transparent)', color: 'var(--color-destructive)' }}>
        Destructive / danger message
      </div>
    </div>
  );
}

/** Live theme editor — change any token and watch the preview re-skin. */
export function ThemeEditor() {
  const [colors, setColors] = createSignal<ColorToken[]>([]);
  const [overrides, setOverrides] = createSignal<Record<string, string>>({});
  const [copied, setCopied] = createSignal(false);
  onMount(() => setColors(discover().colors));

  const setToken = (name: string, hex: string) => {
    document.documentElement.style.setProperty(name, hex);
    setOverrides((o) => ({ ...o, [name]: hex }));
  };
  const reset = () => {
    for (const name of Object.keys(overrides())) document.documentElement.style.removeProperty(name);
    setOverrides({});
  };
  const copyCss = async () => {
    const ov = overrides();
    const keys = Object.keys(ov).sort();
    const css = keys.length
      ? `:root {\n${keys.map((k) => `  ${k}: ${ov[k]};`).join('\n')}\n}`
      : '/* Edit a swatch first — your changes will appear here as overrides. */';
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  const changedCount = () => Object.keys(overrides()).length;

  return (
    <div style={{ display: 'grid', 'grid-template-columns': 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', height: '480px' }}>
      <div style={{ display: 'flex', 'flex-direction': 'column', 'min-height': '0' }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '.5rem', 'margin-bottom': '.5rem' }}>
          <strong style={{ 'font-size': '13px' }}>Tokens — click a swatch to edit</strong>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <Button size="sm" variant="outline" onClick={copyCss}>
              {copied() ? 'Copied!' : `Copy CSS${changedCount() ? ` (${changedCount()})` : ''}`}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
          </div>
        </div>
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '.35rem .9rem', flex: '1', 'min-height': '0', overflow: 'auto', 'padding-right': '.25rem' }}>
          <For each={colors()}>
            {(t) => {
              let initial = '#888888';
              try { initial = toHex(t.light); } catch { /* keep default */ }
              return (
                <label style={{ display: 'flex', 'align-items': 'center', gap: '.4rem', 'font-size': '12px', color: 'var(--color-foreground)' }}>
                  <input
                    type="color"
                    value={overrides()[t.name] ?? initial}
                    onInput={(e) => setToken(t.name, e.currentTarget.value)}
                    style={{ width: '1.5rem', height: '1.5rem', padding: '0', border: '1px solid var(--color-border)', 'border-radius': '4px', background: 'none', cursor: 'pointer' }}
                  />
                  <code style={{ 'font-size': '11px' }}>{t.name.replace('--color-', '')}</code>
                </label>
              );
            }}
          </For>
        </div>
      </div>
      <Preview />
    </div>
  );
}
