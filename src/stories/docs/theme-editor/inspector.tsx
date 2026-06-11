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
    width: '1.75rem', height: '1.75rem', padding: '0', border: '1px solid var(--color-border)',
    'border-radius': '6px', background: 'none', cursor: 'pointer', 'flex-shrink': '0',
  };
  return (
    <div class="p-3 text-foreground">
      <div class="text-xs font-semibold mb-2.5 text-muted-foreground uppercase tracking-wide">Tokens</div>
      <div class="flex flex-col gap-2.5">
        <For each={props.tokens}>
          {(name) => {
            const hex = () => {
              try {
                return toHex(props.values[name]);
              } catch {
                return '#888888';
              }
            };
            return (
              <label class="flex items-center gap-2.5">
                <input
                  type="color"
                  value={hex()}
                  onInput={(e) => props.onColorChange(name, e.currentTarget.value)}
                  style={swatch}
                />
                <span class="flex min-w-0 flex-col leading-tight">
                  <span class="text-sm font-medium truncate">{name.replace('--color-', '')}</span>
                  <span class="text-xs text-muted-foreground truncate">{PURPOSE[name] ?? ''}</span>
                </span>
              </label>
            );
          }}
        </For>
      </div>

      <div class="text-xs font-semibold mt-5 mb-2.5 text-muted-foreground uppercase tracking-wide">Radius</div>
      <label class="flex items-center gap-2.5 text-sm">
        <input
          type="range"
          min="0"
          max={RADIUS_MAX}
          step="0.05"
          value={radiusRem()}
          onInput={(e) => props.onRadiusChange(`${e.currentTarget.value}rem`)}
          class="flex-1"
        />
        <span class="text-sm tabular-nums w-16 text-right">{props.radius}</span>
      </label>
    </div>
  );
}
