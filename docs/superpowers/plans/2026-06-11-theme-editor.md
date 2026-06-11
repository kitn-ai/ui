# Theme Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped inline theme editor with a full-screen Storybook editor that edits color tokens for both light and dark modes, drives a realistic chat preview, supports full-theme presets, and exports a paste-ready `:root` + `.dark` CSS block.

**Architecture:** Pure logic (CSS string builder, preset construction) lives in small tested `.ts` modules. Token discovery stays in `theme-tokens.tsx` (single source from `theme.css`). The editor maintains light/dark palette signals, injects a `<style>` element with `:root {…}` + `.dark {…}` blocks (replacing the old inline-on-`<html>` approach that clobbered both modes), and a self-contained `Canvas` renders the realistic preview with a `.dark` wrapper for dark mode. Surfaced as a `layout:'fullscreen'` story.

**Tech Stack:** SolidJS, Storybook (storybook-solidjs-vite), Vitest (jsdom for pure logic), Tailwind v4 `@theme` tokens.

---

## File Structure

New module dir: `src/stories/docs/theme-editor/`

- `theme-css.ts` — `Palette` type + `buildThemeCss(light, dark)` pure exporter. **Tested.**
- `presets.ts` — `Preset` type, `BRAND_OVERRIDES`, `buildPresets(base)`. **Tested.**
- `inspector.tsx` — left panel: color swatches + radius slider (presentational).
- `canvas.tsx` — realistic chat scene + coverage rail; `.dark` wrapper for mode.
- `theme-editor.tsx` — composition: state, injected `<style>`, top bar, presets, copy/reset.

Modified:
- `src/stories/docs/theme-tokens.tsx` — extract `collectTokens()`; add exported `discoverPalettes()`, export `toHex` + `PURPOSE`; remove `ThemeEditor` + `Preview` + `inlineCode`; keep `TokenTable` / `discover` / `Swatch`.
- `src/stories/theme-editor.stories.tsx` — **new** fullscreen story.
- `src/stories/theming-playground.stories.tsx` — drop `LiveEditor`, keep `TokenReference`.
- `src/stories/docs/Theming.mdx` — remove embedded editor `<Canvas>`; link out to the editor story.

---

## Task 1: Pure CSS exporter (`theme-css.ts`)

**Files:**
- Create: `src/stories/docs/theme-editor/theme-css.ts`
- Test: `src/stories/docs/theme-editor/theme-css.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/stories/docs/theme-editor/theme-css.test.ts
import { describe, it, expect } from 'vitest';
import { buildThemeCss } from './theme-css';

describe('buildThemeCss', () => {
  it('emits sorted :root and .dark blocks', () => {
    const css = buildThemeCss(
      { '--color-primary': '#ffffff', '--radius': '0.6rem' },
      { '--color-primary': '#000000' },
    );
    expect(css).toBe(
      ':root {\n  --color-primary: #ffffff;\n  --radius: 0.6rem;\n}\n\n.dark {\n  --color-primary: #000000;\n}',
    );
  });

  it('keys are sorted within each block', () => {
    const css = buildThemeCss({ '--b': '2', '--a': '1' }, {});
    expect(css).toBe(':root {\n  --a: 1;\n  --b: 2;\n}\n\n.dark {\n\n}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stories/docs/theme-editor/theme-css.test.ts`
Expected: FAIL — cannot resolve `./theme-css`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/stories/docs/theme-editor/theme-css.ts

/** A map of CSS custom-property name → value, e.g. { '--color-primary': '#fff' }. */
export type Palette = Record<string, string>;

function block(selector: string, palette: Palette): string {
  const body = Object.keys(palette)
    .sort()
    .map((k) => `  ${k}: ${palette[k]};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

/** Build a paste-ready theme override block: full light set on :root, dark set on .dark. */
export function buildThemeCss(light: Palette, dark: Palette): string {
  return `${block(':root', light)}\n\n${block('.dark', dark)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stories/docs/theme-editor/theme-css.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stories/docs/theme-editor/theme-css.ts src/stories/docs/theme-editor/theme-css.test.ts
git commit -m "feat(theme-editor): pure :root/.dark CSS exporter"
```

---

## Task 2: Presets (`presets.ts`)

**Files:**
- Create: `src/stories/docs/theme-editor/presets.ts`
- Test: `src/stories/docs/theme-editor/presets.test.ts`

Presets share the live-discovered neutral base; only the brand tokens (`--color-primary`, `--color-primary-foreground`, `--color-ring`, `--color-code-foreground`) are overridden per preset. This keeps neutrals from drifting from `theme.css`. "Default" applies no overrides.

- [ ] **Step 1: Write the failing test**

```ts
// src/stories/docs/theme-editor/presets.test.ts
import { describe, it, expect } from 'vitest';
import { buildPresets, BRAND_OVERRIDES } from './presets';

const base = {
  light: { '--color-primary': 'hsl(240 5.9% 10%)', '--color-border': 'hsl(240 5.9% 90%)', '--radius': '0.6rem' },
  dark: { '--color-primary': 'hsl(0 0% 98%)', '--color-border': 'hsl(240 3.7% 15.9%)' },
};

describe('buildPresets', () => {
  it('orders Default first, then the brand presets', () => {
    expect(buildPresets(base).map((p) => p.name)).toEqual(['Default', 'Violet', 'Emerald', 'Mono']);
  });

  it('Default preset equals the base palette (no drift)', () => {
    const def = buildPresets(base).find((p) => p.name === 'Default')!;
    expect(def.light).toEqual(base.light);
    expect(def.dark).toEqual(base.dark);
  });

  it('brand presets override primary but preserve base neutrals', () => {
    const violet = buildPresets(base).find((p) => p.name === 'Violet')!;
    expect(violet.light['--color-primary']).toBe(BRAND_OVERRIDES.Violet.light['--color-primary']);
    expect(violet.light['--color-border']).toBe(base.light['--color-border']);
    expect(violet.light['--radius']).toBe(base.light['--radius']);
  });

  it('does not mutate the base palette', () => {
    const snapshot = JSON.stringify(base);
    buildPresets(base);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stories/docs/theme-editor/presets.test.ts`
Expected: FAIL — cannot resolve `./presets`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/stories/docs/theme-editor/presets.ts
import type { Palette } from './theme-css';

export type Preset = { name: string; light: Palette; dark: Palette };
export type BrandOverride = { light: Palette; dark: Palette };

/** Per-preset brand-token overrides (light + dark). Neutrals come from the live base. */
export const BRAND_OVERRIDES: Record<string, BrandOverride> = {
  Violet: {
    light: {
      '--color-primary': 'hsl(262 83% 58%)',
      '--color-primary-foreground': 'hsl(0 0% 100%)',
      '--color-ring': 'hsl(262 83% 58%)',
      '--color-code-foreground': 'hsl(262 83% 58%)',
    },
    dark: {
      '--color-primary': 'hsl(263 70% 65%)',
      '--color-primary-foreground': 'hsl(0 0% 100%)',
      '--color-ring': 'hsl(263 70% 65%)',
      '--color-code-foreground': 'hsl(263 90% 80%)',
    },
  },
  Emerald: {
    light: {
      '--color-primary': 'hsl(160 84% 39%)',
      '--color-primary-foreground': 'hsl(0 0% 100%)',
      '--color-ring': 'hsl(160 84% 39%)',
      '--color-code-foreground': 'hsl(160 84% 32%)',
    },
    dark: {
      '--color-primary': 'hsl(158 64% 52%)',
      '--color-primary-foreground': 'hsl(160 30% 8%)',
      '--color-ring': 'hsl(158 64% 52%)',
      '--color-code-foreground': 'hsl(158 70% 65%)',
    },
  },
  Mono: {
    light: {
      '--color-primary': 'hsl(0 0% 20%)',
      '--color-primary-foreground': 'hsl(0 0% 98%)',
      '--color-ring': 'hsl(0 0% 40%)',
      '--color-code-foreground': 'hsl(0 0% 30%)',
    },
    dark: {
      '--color-primary': 'hsl(0 0% 92%)',
      '--color-primary-foreground': 'hsl(0 0% 12%)',
      '--color-ring': 'hsl(0 0% 70%)',
      '--color-code-foreground': 'hsl(0 0% 75%)',
    },
  },
};

const ORDER = ['Default', 'Violet', 'Emerald', 'Mono'];

/** Build full presets by layering brand overrides onto the live-discovered base palette. */
export function buildPresets(base: { light: Palette; dark: Palette }): Preset[] {
  return ORDER.map((name) => {
    const ov = BRAND_OVERRIDES[name];
    return {
      name,
      light: ov ? { ...base.light, ...ov.light } : { ...base.light },
      dark: ov ? { ...base.dark, ...ov.dark } : { ...base.dark },
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stories/docs/theme-editor/presets.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stories/docs/theme-editor/presets.ts src/stories/docs/theme-editor/presets.test.ts
git commit -m "feat(theme-editor): full-theme presets (Default/Violet/Emerald/Mono)"
```

---

## Task 3: Refactor `theme-tokens.tsx` (discovery + cleanup)

**Files:**
- Modify: `src/stories/docs/theme-tokens.tsx`
- Modify: `src/stories/theming-playground.stories.tsx`

Goal: add `discoverPalettes()` and export the helpers the editor needs, remove the old `ThemeEditor`/`Preview` (replaced by the new module), and fix the only importer so the build stays green.

- [ ] **Step 1: Replace the `discover()` function with a shared walk + two derivations**

In `src/stories/docs/theme-tokens.tsx`, replace the existing `discover()` function (the `function discover(): {...} { ... }` block) with:

```tsx
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
```

- [ ] **Step 2: Add the `Palette` import at the top of the file**

Add below the existing imports in `theme-tokens.tsx`:

```tsx
import type { Palette } from './theme-editor/theme-css';
```

- [ ] **Step 3: Export `toHex` and `PURPOSE`**

Change `const PURPOSE: Record<string, string> = {` to `export const PURPOSE: Record<string, string> = {`.
Change `function toHex(css: string): string {` to `export function toHex(css: string): string {`.

- [ ] **Step 4: Remove the now-unused `ThemeEditor`, `Preview`, and `inlineCode`**

Delete the `inlineCode` const, the `function Preview() { ... }` block, and the `export function ThemeEditor() { ... }` block (everything from `const inlineCode` to the end of `ThemeEditor`). Keep `Swatch`, `TokenTable`, `discover`, `collectTokens`, `discoverPalettes`, `toHex`, `PURPOSE`, and the cell style consts.

- [ ] **Step 5: Fix the importer — `theming-playground.stories.tsx`**

Replace the whole file contents with:

```tsx
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { TokenTable } from './docs/theme-tokens';

// Renders in the Solid preview (unlike MDX, which is React) and is embedded
// into the Theming docs page via <Canvas of={...}>.
const meta = {
  title: 'Theming/Playground',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Auto-generated reference of every overridable token. */
export const TokenReference: Story = {
  render: () => <TokenTable />,
  parameters: { docs: { source: { code: '/* override any of these on :root or a scoped parent */', language: 'css' } } },
};
```

- [ ] **Step 6: Verify build is clean**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 7: Commit**

```bash
git add src/stories/docs/theme-tokens.tsx src/stories/theming-playground.stories.tsx
git commit -m "refactor(theme-editor): add discoverPalettes, drop inline kitchen-sink editor"
```

---

## Task 4: Inspector panel (`inspector.tsx`)

**Files:**
- Create: `src/stories/docs/theme-editor/inspector.tsx`

Presentational: a labelled color swatch per `--color-*` token (value from the active mode) plus one radius slider. No state of its own.

- [ ] **Step 1: Write the component**

```tsx
// src/stories/docs/theme-editor/inspector.tsx
import { For, type JSX } from 'solid-js';
import { toHex, PURPOSE } from '../theme-tokens';
import type { Palette } from './theme-css';

const RADIUS_MAX = 1.4; // rem

export function Inspector(props: {
  tokens: string[]; // ordered '--color-*' names
  values: Palette; // active-mode palette (drives swatch colors)
  radius: string; // e.g. '0.6rem'
  onColorChange: (token: string, hex: string) => void;
  onRadiusChange: (rem: string) => void;
}) {
  const radiusRem = () => parseFloat(props.radius) || 0;
  const swatch: JSX.CSSProperties = {
    width: '1.5rem', height: '1.5rem', padding: '0', border: '1px solid var(--color-border)',
    'border-radius': '4px', background: 'none', cursor: 'pointer',
  };
  return (
    <div class="p-3 text-foreground">
      <div class="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Tokens</div>
      <div class="flex flex-col gap-2">
        <For each={props.tokens}>
          {(name) => {
            let initial = '#888888';
            try {
              initial = toHex(props.values[name]);
            } catch {
              /* keep default */
            }
            return (
              <label class="flex items-center gap-2 text-xs">
                <input
                  type="color"
                  value={initial}
                  onInput={(e) => props.onColorChange(name, e.currentTarget.value)}
                  style={swatch}
                />
                <span class="flex flex-col">
                  <code class="text-[11px]">{name.replace('--color-', '')}</code>
                  <span class="text-[10px] text-muted-foreground">{PURPOSE[name] ?? ''}</span>
                </span>
              </label>
            );
          }}
        </For>
      </div>

      <div class="text-xs font-semibold mt-4 mb-2 text-muted-foreground uppercase tracking-wide">Radius</div>
      <label class="flex items-center gap-2 text-xs">
        <input
          type="range"
          min="0"
          max={RADIUS_MAX}
          step="0.05"
          value={radiusRem()}
          onInput={(e) => props.onRadiusChange(`${e.currentTarget.value}rem`)}
          class="flex-1"
        />
        <code class="text-[11px] w-14 text-right">{props.radius}</code>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Verify build is clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/stories/docs/theme-editor/inspector.tsx
git commit -m "feat(theme-editor): inspector panel (swatches + radius slider)"
```

---

## Task 5: Realistic preview canvas (`canvas.tsx`)

**Files:**
- Create: `src/stories/docs/theme-editor/canvas.tsx`

A faithful chat scene built from the kit's components/token classes (sidebar + thread + prompt input) plus a coverage rail for tokens chat doesn't naturally exercise. The `.dark` wrapper makes descendants resolve dark tokens when `mode === 'dark'`. (Extension point: swap this scene for a multi-surface gallery later — nothing else changes.)

- [ ] **Step 1: Write the component**

```tsx
// src/stories/docs/theme-editor/canvas.tsx
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Loader } from '../../../components/loader';
import type { JSX } from 'solid-js';

const inlineCode: JSX.CSSProperties = {
  color: 'var(--color-code-foreground)',
  background: 'color-mix(in oklab, var(--color-code-foreground) 15%, transparent)',
  padding: '.1em .35em',
  'border-radius': '4px',
  'font-family': 'ui-monospace, monospace',
};

/** Realistic chat preview + coverage rail. `mode` toggles the .dark wrapper. */
export function Canvas(props: { mode: 'light' | 'dark' }) {
  return (
    <div classList={{ dark: props.mode === 'dark' }} class="h-full">
      <div class="h-full rounded-xl border border-border bg-background text-foreground overflow-hidden flex flex-col">
        {/* Chat layout */}
        <div class="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div class="w-44 shrink-0 bg-sidebar border-r border-border p-2 space-y-1 text-xs">
            <Button size="sm" class="w-full mb-2">New chat</Button>
            <div class="px-2 py-1 font-medium text-muted-foreground">Recent</div>
            <div class="bg-muted rounded-md px-2 py-1.5">SolidJS vs React</div>
            <div class="px-2 py-1.5 text-muted-foreground hover:bg-accent rounded-md">Tailwind v4 setup</div>
            <div class="px-2 py-1.5 text-muted-foreground hover:bg-accent rounded-md">Deploy to Pages</div>
          </div>

          {/* Thread */}
          <div class="flex-1 min-w-0 flex flex-col">
            <div class="h-12 shrink-0 border-b border-border px-4 flex items-center justify-between">
              <span class="text-sm font-semibold">SolidJS reactivity</span>
              <Badge>claude-opus-4</Badge>
            </div>
            <div class="flex-1 min-h-0 overflow-auto p-4 space-y-3 bg-card text-card-foreground">
              <div class="bg-primary text-primary-foreground rounded-2xl px-3 py-2 w-fit ml-auto text-sm max-w-[80%]">
                How do signals differ from React hooks?
              </div>
              <div class="bg-muted text-foreground rounded-2xl px-3 py-2 w-fit text-sm max-w-[80%] space-y-2">
                <p>Signals are fine-grained: reading <span style={inlineCode}>count()</span> subscribes only that spot, so no re-render of the whole component.</p>
                <pre class="bg-secondary text-secondary-foreground rounded-md p-2 text-xs overflow-auto"><code>const [count, setCount] = createSignal(0);</code></pre>
              </div>
              <div class="text-muted-foreground text-xs flex items-center gap-2">
                <Loader variant="dots" size="sm" /> thinking…
              </div>
            </div>
            {/* Prompt input */}
            <div class="shrink-0 border-t border-border p-3 flex items-center gap-2">
              <input class="flex-1 bg-input border border-border rounded-md px-3 h-9 text-sm" placeholder="Message…" />
              <Button size="sm">Send</Button>
            </div>
          </div>
        </div>

        {/* Coverage rail: tokens the chat doesn't naturally hit */}
        <div class="shrink-0 border-t border-border p-3 flex flex-wrap items-center gap-2 bg-background">
          <span class="text-[11px] text-muted-foreground mr-1">Coverage:</span>
          <button class="bg-destructive text-destructive-foreground rounded-md px-3 h-8 text-xs font-medium">Delete</button>
          <button class="bg-secondary text-secondary-foreground rounded-md px-3 h-8 text-xs font-medium">Secondary</button>
          <span class="bg-accent text-accent-foreground rounded-md px-2 py-1 text-xs">Accent</span>
          <span class="bg-popover text-popover-foreground border border-border shadow rounded-md px-2 py-1 text-xs">Popover</span>
          <input class="bg-input border border-border rounded-md px-2 h-8 text-xs ring-2 ring-ring" placeholder="Focus ring" />
          <Badge>Badge</Badge>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build is clean**

Run: `npx tsc --noEmit`
Expected: exit 0. (If `../../../components/loader` or `../../../ui/badge` paths don't resolve, confirm the path depth from `src/stories/docs/theme-editor/` — it is three `../` to reach `src/`. The existing `theme-tokens.tsx` uses `../../ui/button` from one level shallower.)

- [ ] **Step 3: Commit**

```bash
git add src/stories/docs/theme-editor/canvas.tsx
git commit -m "feat(theme-editor): realistic chat preview canvas + coverage rail"
```

---

## Task 6: Editor composition (`theme-editor.tsx`)

**Files:**
- Create: `src/stories/docs/theme-editor/theme-editor.tsx`

Owns all state: mode, light/dark palettes, current preset. Seeds from `discoverPalettes()` on mount, keeps an injected `<style>` in sync, wires top-bar actions.

- [ ] **Step 1: Write the component**

```tsx
// src/stories/docs/theme-editor/theme-editor.tsx
import { createSignal, createEffect, onMount, onCleanup, For } from 'solid-js';
import { Button } from '../../../ui/button';
import { discoverPalettes } from '../theme-tokens';
import { buildThemeCss, type Palette } from './theme-css';
import { buildPresets, type Preset } from './presets';
import { Inspector } from './inspector';
import { Canvas } from './canvas';

const STYLE_ID = 'kitn-theme-editor-overrides';

/** Full-screen live theme editor: edit light/dark tokens, preview a real chat, export CSS. */
export function ThemeEditor() {
  const [presets, setPresets] = createSignal<Preset[]>([]);
  const [mode, setMode] = createSignal<'light' | 'dark'>('light');
  const [light, setLight] = createSignal<Palette>({});
  const [dark, setDark] = createSignal<Palette>({});
  const [presetName, setPresetName] = createSignal('Default');
  const [copied, setCopied] = createSignal(false);

  onMount(() => {
    const ps = buildPresets(discoverPalettes());
    setPresets(ps);
    const def = ps.find((p) => p.name === 'Default')!;
    setLight({ ...def.light });
    setDark({ ...def.dark });
  });

  let styleEl: HTMLStyleElement | undefined;
  createEffect(() => {
    if (!Object.keys(light()).length) return; // not seeded yet
    const css = buildThemeCss(light(), dark());
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  });
  onCleanup(() => styleEl?.remove());

  const colorTokens = () => Object.keys(light()).filter((n) => n.startsWith('--color-')).sort();
  const activeValues = () => (mode() === 'light' ? light() : dark());

  const setColor = (token: string, hex: string) => {
    if (mode() === 'light') setLight((v) => ({ ...v, [token]: hex }));
    else setDark((v) => ({ ...v, [token]: hex }));
  };
  const setRadius = (rem: string) => setLight((v) => ({ ...v, '--radius': rem }));

  const loadPreset = (name: string) => {
    const p = presets().find((x) => x.name === name);
    if (!p) return;
    setLight({ ...p.light });
    setDark({ ...p.dark });
    setPresetName(name);
  };
  const reset = () => loadPreset('Default');

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(buildThemeCss(light(), dark()));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div class="h-screen w-full flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <div class="flex items-center justify-between gap-3 border-b border-border px-4 h-12 shrink-0">
        <div class="flex items-center gap-3">
          <strong class="text-sm">Theme editor</strong>
          <div class="flex rounded-md border border-border overflow-hidden text-xs">
            <button class="px-2.5 py-1" classList={{ 'bg-secondary': mode() === 'light' }} onClick={() => setMode('light')}>
              Light
            </button>
            <button class="px-2.5 py-1" classList={{ 'bg-secondary': mode() === 'dark' }} onClick={() => setMode('dark')}>
              Dark
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <select
            class="bg-input border border-border rounded-md text-xs px-2 h-8"
            value={presetName()}
            onChange={(e) => loadPreset(e.currentTarget.value)}
          >
            <For each={presets()}>{(p) => <option value={p.name}>{p.name}</option>}</For>
          </select>
          <Button size="sm" variant="outline" onClick={copyCss}>
            {copied() ? 'Copied!' : 'Copy CSS'}
          </Button>
          <Button size="sm" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Body */}
      <div class="flex-1 flex min-h-0">
        <div class="w-[300px] shrink-0 border-r border-border overflow-auto">
          <Inspector
            tokens={colorTokens()}
            values={activeValues()}
            radius={light()['--radius'] ?? '0.6rem'}
            onColorChange={setColor}
            onRadiusChange={setRadius}
          />
        </div>
        <div class="flex-1 min-w-0 p-3">
          <Canvas mode={mode()} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build is clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/stories/docs/theme-editor/theme-editor.tsx
git commit -m "feat(theme-editor): compose editor (state, injected style, top bar)"
```

---

## Task 7: Fullscreen story + drop old `LiveEditor`

**Files:**
- Create: `src/stories/theme-editor.stories.tsx`
- (Note: `theming-playground.stories.tsx` already lost `LiveEditor` in Task 3.)

- [ ] **Step 1: Create the story**

```tsx
// src/stories/theme-editor.stories.tsx
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { ThemeEditor } from './docs/theme-editor/theme-editor';

const meta = {
  title: 'Theming/Editor',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Full-screen live theme editor. */
export const Editor: Story = {
  render: () => <ThemeEditor />,
};
```

- [ ] **Step 2: Confirm the story is picked up by Storybook's glob**

Run: `grep -n "stories" .storybook/main.ts`
Expected: a `stories: [...]` glob that includes `../src/**/*.stories.@(...)` (or similar covering `src/stories/*.stories.tsx`). If the new file's location isn't covered, place it where the existing `*.stories.tsx` siblings live (it already is — `src/stories/`).

- [ ] **Step 3: Verify build is clean**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/stories/theme-editor.stories.tsx
git commit -m "feat(theme-editor): fullscreen 'Theming/Editor' story"
```

---

## Task 8: Update Theming docs (`Theming.mdx`)

**Files:**
- Modify: `src/stories/docs/Theming.mdx`

Replace the embedded live-editor `<Canvas>` with a link to the new full-screen story; keep the token reference table.

- [ ] **Step 1: Replace the "Live editor" section**

In `src/stories/docs/Theming.mdx`, replace this block:

```mdx
## Live editor

Click any swatch to override that token and watch the components re-skin. Press **Reset** to restore the defaults.

<Canvas of={Playground.LiveEditor} />
```

with:

```mdx
## Live editor

Edit every token for **light and dark** modes and watch a real chat UI re-skin live — pick a preset, tweak swatches, then **Copy CSS** for a paste-ready `:root` + `.dark` block.

👉 [**Open the theme editor →**](?path=/story/theming-editor--editor)

_(Opens full-screen — it needs more room than this docs column.)_
```

- [ ] **Step 2: Verify the `Playground` import is still used**

`<Canvas of={Playground.TokenReference} />` remains under "## Token reference", so the `import * as Playground` line stays valid. No import change needed.

- [ ] **Step 3: Commit**

```bash
git add src/stories/docs/Theming.mdx
git commit -m "docs(theming): link out to full-screen theme editor"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite (jsdom project)**

Run: `npx vitest run src/stories/docs/theme-editor`
Expected: PASS — `theme-css.test.ts` (2) + `presets.test.ts` (4).

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Build Storybook**

Run: `npm run build-storybook`
Expected: completes without error.

- [ ] **Step 4: Manual visual checklist (`npm run storybook`, open Theming/Editor)**

Confirm:
- Editor fills the iframe (no narrow docs column).
- Switching **Light/Dark** flips the chat preview; editing a swatch in Light changes only `:root`, in Dark only `.dark` (toggle back to confirm the other mode is unchanged).
- Selecting **Violet/Emerald/Mono** reskins primary/ring/code; **Reset** returns to Default.
- The **radius slider** changes corner rounding across buttons/bubbles/inputs.
- **Copy CSS** yields a valid `:root { … }\n\n.dark { … }` block (paste into a scratch file to eyeball).
- Theming docs page still shows the **token reference table** and the "Open the theme editor →" link navigates to the story.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test(theme-editor): verification fixes"
```

---

## Notes / Extension Points

- **Multi-surface gallery (deferred Option C):** swap the scene inside `canvas.tsx` for multiple surfaces; the editor, inspector, and state are untouched because the canvas only consumes tokens via CSS.
- **Editor chrome reskins with light edits:** the top bar/inspector live outside the `.dark` wrapper, so they resolve `:root` values and visibly reskin when editing light-mode tokens. This is expected (it's the same "whole page reskins" behavior as the old editor) and the dark canvas stays isolated under its `.dark` wrapper.
