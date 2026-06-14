// src/stories/docs/theme-editor/theme-editor.tsx
import { createSignal, createEffect, onMount, onCleanup, For } from 'solid-js';
import { Button } from '../../../ui/button';
import { discoverPalettes } from '../theme-tokens';
import { buildThemeCss, type Palette } from './theme-css';
import { buildPresets, type Preset } from './presets';
import { Inspector } from './inspector';
import { Canvas, CANVAS_CLASS } from './canvas';

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

  // Apply the ACTIVE mode's palette directly onto the canvas wrapper. Scoping to
  // CANVAS_CLASS (rather than :root/.dark) means the preview reflects the editor's
  // mode independently of any ancestor `.dark` (e.g. Storybook's dark theme), and
  // only the canvas reskins — not the editor chrome. Export (Copy CSS) still emits
  // the full :root + .dark theme separately.
  let styleEl: HTMLStyleElement | undefined;
  createEffect(() => {
    if (!Object.keys(light()).length) return; // not seeded yet
    const colors: Palette = mode() === 'light' ? light() : dark();
    const radius = light()['--radius'] ?? '0.6rem';
    const colorBody = Object.keys(colors)
      .filter((k) => k.startsWith('--color-'))
      .sort()
      .map((k) => `  ${k}: ${colors[k]};`)
      .join('\n');
    // Re-express the radius scale on the wrapper. The kit's --radius-sm/md/lg/xl are
    // calc(var(--radius) …) declared at :root, so their var(--radius) resolves once
    // at :root and inherits as a fixed length — overriding --radius lower in the tree
    // doesn't move them. Re-declaring them here (against the wrapper's --radius) does.
    const radiusBody = [
      `  --radius: ${radius};`,
      `  --radius-sm: calc(var(--radius) - 4px);`,
      `  --radius-md: calc(var(--radius) - 2px);`,
      `  --radius-lg: var(--radius);`,
      `  --radius-xl: calc(var(--radius) + 4px);`,
    ].join('\n');
    // Re-establish the inherited `color` and native `color-scheme` on the wrapper:
    // tokens alone don't fix text whose color is inherited from outside the canvas
    // (e.g. elements with no explicit text-color class), nor native form controls.
    const css = `.${CANVAS_CLASS} {\n${colorBody}\n${radiusBody}\n  color: var(--color-foreground);\n  color-scheme: ${mode()};\n}`;
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
            aria-label="Theme preset"
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
