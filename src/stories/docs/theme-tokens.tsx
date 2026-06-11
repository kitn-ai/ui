import { createSignal, For, onMount, type JSX } from 'solid-js';
import type { Palette } from './theme-editor/theme-css';

// Docs-only helpers (not part of the kit's public API). They auto-discover the
// kit's design tokens straight from the loaded CSS, so the reference + editor
// can never drift from theme.css as tokens are added or changed.

type ColorToken = { name: string; light: string; dark: string };
type RadiusToken = { name: string; value: string };

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

/** Raw walk of loaded stylesheets → light/dark custom-property maps (colors + radius). */
function collectTokens(): { light: Record<string, string>; dark: Record<string, string> } {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
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
        if (isRoot) light[prop] = val;
        if (isDark) dark[prop] = val;
      }
    }
  }
  return { light, dark };
}

/** Reference data for the token table: a color token is one with a `.dark` override. */
function discover(): { colors: ColorToken[]; radii: RadiusToken[] } {
  const { light, dark } = collectTokens();
  const colors = Object.keys(dark)
    .filter((n) => n.startsWith('--color-'))
    .sort()
    .map((name) => ({ name, light: light[name] || dark[name], dark: dark[name] }));
  const radii = Object.keys(light)
    .filter((n) => n.startsWith('--radius'))
    .sort()
    .map((name) => ({ name, value: light[name] }));
  return { colors, radii };
}

/** Light/dark palettes for the theme editor: light = colors + --radius, dark = colors. */
export function discoverPalettes(): { light: Palette; dark: Palette } {
  const { light, dark } = collectTokens();
  const pickColors = (m: Record<string, string>) =>
    Object.fromEntries(
      Object.keys(m)
        .filter((n) => n.startsWith('--color-'))
        .sort()
        .map((n) => [n, m[n]]),
    ) as Palette;
  return {
    light: { ...pickColors(light), '--radius': light['--radius'] ?? '0.6rem' },
    dark: pickColors(dark),
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
