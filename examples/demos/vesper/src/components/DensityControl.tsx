import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { Density } from './LookGrid';
import './density-control.css';

const OPTIONS: { id: Density; label: string; icon: () => JSX.Element }[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    icon: () => (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <rect x="3" y="3" width="8" height="12" rx="1.5" />
        <rect x="13" y="9" width="8" height="12" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'grid',
    label: 'Grid',
    icon: () => (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'index',
    label: 'Index',
    icon: () => (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <For each={[3, 9, 15]}>
          {(y) => (
            <For each={[3, 9, 15]}>
              {(x) => <rect x={x} y={y} width="6" height="6" rx="1" />}
            </For>
          )}
        </For>
      </svg>
    ),
  },
];

/**
 * Neumorphic segmented control. A radiogroup with roving focus rather than
 * three buttons: arrow keys move between densities the way they do in every
 * other segmented control, and only the selected one is a tab stop.
 */
export default function DensityControl(props: {
  value: Density;
  onChange: (density: Density) => void;
}) {
  const move = (delta: number) => {
    const i = OPTIONS.findIndex((o) => o.id === props.value);
    const next = OPTIONS[(i + delta + OPTIONS.length) % OPTIONS.length]!;
    props.onChange(next.id);
    // Focus follows selection, which is what a roving radiogroup does.
    queueMicrotask(() =>
      document.querySelector<HTMLElement>(`[data-density-opt="${next.id}"]`)?.focus(),
    );
  };

  return (
    <div
      class="density neu-well"
      role="radiogroup"
      aria-label="Lookbook density"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      }}
    >
      <For each={OPTIONS}>
        {(option) => (
          <button
            class="density-opt"
            data-density-opt={option.id}
            role="radio"
            aria-checked={props.value === option.id ? 'true' : 'false'}
            tabindex={props.value === option.id ? 0 : -1}
            onClick={() => props.onChange(option.id)}
          >
            {option.icon()}
            <span>{option.label}</span>
          </button>
        )}
      </For>
    </div>
  );
}
