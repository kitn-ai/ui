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
