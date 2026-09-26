import { Index, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { normalizeVolumeBands } from '../../primitives/audio-bands';
import { useSequencer } from '../../primitives/use-sequencer';
import { gridSequence } from '../../primitives/visualizer-sequences';
import { GRID_CELL, GRID_GAP, defaultGridCount } from './sizes';
import { amplitudeRenderState, type VariantProps } from './variant-bar';

/*
 * The speaking thresholds below DIVERGE from upstream's GridCell math, which
 * spreads them evenly across 0..1. Two blind spots this element exposes:
 *
 * (1) Real speech through the aligned analysis pipeline peaks near 0.5, so the
 *     outermost rows of a 5-row grid never light.
 * (2) The middle row's threshold is 0, so it stays lit on a silent mic.
 *
 * So the ramp is scaled to the realistic speech ceiling, and the would-be-0
 * centre threshold becomes a small silence floor: the grid fills centre-outward
 * as a cross, and is empty when the mic is silent.
 *
 * A third divergence: at IDLE the grid highlights nothing. Upstream rests one
 * stationary centre cell there. Grid only: bar and radial already idle dark, so
 * this makes the family consistent.
 */
/** Realistic top of the aligned pipeline's speech range (measured 0.51-0.54 live, 0.68 fixture). */
const SPEECH_LEVEL_CEILING = 0.65;
/** Real speech bands sit at ~0.1 and up; true silence idles at ~0, so this splits them cleanly. */
const SILENCE_FLOOR = 0.02;

/**
 * A grid of dots that pulses with the audio.
 *
 * Ported from livekit/components-js
 * `packages/shadcn/components/agents-ui/agent-audio-visualizer-grid.tsx`
 * (Apache License 2.0), except the speaking threshold remap; see the
 * divergence note above.
 */
export function GridVisualizer(
  props: VariantProps & {
    // Replaced the former independent rowCount/columnCount pre-1.0: columns alone
    // carry the audio signal, so a non-square grid only ever changed
    // threshold-ring resolution, never expression. Upstream is square by default
    // too (`rowCount ?? columnCount`).
    /** Rows and columns of the always-square grid; defaults to the size preset's count. */
    count?: number;
    /** Ring distance from center for the connecting animation, in cells. */
    spread?: number;
    /** Ms between scripted frames. Default 100. */
    interval?: number;
  },
): JSX.Element {
  const rows = () => props.count ?? defaultGridCount(props.size);
  const cols = () => rows();
  const interval = () => props.interval ?? 100;
  const items = () => Array.from({ length: rows() * cols() }, (_, i) => i);

  // The state the rendering follows: `listeningAmplitude` folds `listening`
  // into the speaking presentation. See amplitudeRenderState in variant-bar.
  const renderState = () => amplitudeRenderState(props.state, props.listeningAmplitude);

  const tick = useSequencer(() =>
    // Speaking is driven by audio, not the clock; freezing also parks it.
    props.frozen || renderState() === 'speaking' ? Infinity : interval(),
  );

  const sequence = () => gridSequence(renderState(), rows(), cols(), props.spread);
  const active = () => sequence()[tick() % sequence().length] ?? { x: -1, y: -1 };

  // Bands only mean anything while speaking (or listening under the
  // `listeningAmplitude` opt-in, folded in by renderState). Everywhere else
  // the sequence is the whole story, so a stale level never leaks into a
  // scripted state (same guard as BarVisualizer, so the render-prop's `value`
  // means one thing across every variant).
  const levels = () =>
    renderState() === 'speaking' ? normalizeVolumeBands(props.bands, cols()) : new Array(cols()).fill(0);

  /**
   * While speaking, a cell lights when its column's level clears a threshold
   * that grows with distance from the middle row: the column fills
   * centre-outward, so the grid reads as a spectrum. A silent column shows
   * nothing (the floor), a loud one reaches the edges (the scaled ramp) —
   * both per the divergence note at the top of this file.
   */
  function isLit(index: number): boolean {
    if (renderState() === 'speaking') {
      const y = Math.floor(index / cols());
      const mid = Math.floor(rows() / 2);
      const scaled = (Math.abs(mid - y) / (mid + 1)) * SPEECH_LEVEL_CEILING;
      // max() applies the floor exactly where the ramp would be 0 (the middle
      // row); every other threshold already clears it.
      const threshold = Math.max(scaled, SILENCE_FLOOR);
      return (levels()[index % cols()] ?? 0) >= threshold;
    }
    // Idle shows a fully dark grid — divergence (3) above;
    // upstream rests one stationary centre cell here. 'disconnected' (first-
    // class) mirrors idle's dark grid for now, pending the LiveKit
    // disconnected-state measurement.
    if (renderState() === 'idle' || renderState() === 'disconnected') return false;
    return active().x === index % cols() && active().y === Math.floor(index / cols());
  }

  /** Snap on, fade off: highlighted cells transition 10x faster than they decay. */
  function transition(index: number): string {
    if (renderState() === 'speaking') return '150ms';
    return `${interval() / (isLit(index) ? 1000 : 100)}s`;
  }

  return (
    <div
      data-kai-state={props.state}
      class={cn('grid', props.class)}
      style={{
        'grid-template-columns': `repeat(${cols()}, 1fr)`,
        gap: `${GRID_GAP[props.size]}px`,
        ...(props.color ? { color: props.color } : {}),
      }}
    >
      {/*
        <Index>, not <For>, matching BarVisualizer: `items()` positions are
        stable, but mapping by POSITION (rather than by `===` on the array
        value) is the correct primitive here too, and it keeps the render-prop
        contract identical across variants. See the note in variant-bar.tsx.
      */}
      <Index each={items()}>
        {(_value, index) => {
          // Every column repeats down every row, so a cell's level comes from
          // its column band, not its flat position: index % cols(), not index.
          // `highlighted`/`value` are live accessors: the callback below runs
          // once per position, so a consumer's render-prop must call them
          // itself to stay current rather than close over a one-time snapshot.
          const item = {
            index,
            highlighted: () => isLit(index),
            value: () => levels()[index % cols()] ?? 0,
          };
          return (
            props.children?.(item) ?? (
              // The lit state is a SECOND part TOKEN (`part(cell highlighted)`),
              // not a `data-*` attribute selector on `::part(cell)`: a CSS
              // attribute selector cannot follow a pseudo-element, so
              // `::part(cell)[data-kai-highlighted="true"]` never matches
              // anything from outside the shadow root. `data-kai-highlighted`
              // stays on the element for the render-prop and for styling from
              // inside the shadow root; `part` is the external seam.
              <div
                part={item.highlighted() ? 'cell highlighted' : 'cell'}
                data-kai-index={item.index}
                data-kai-highlighted={item.highlighted()}
                class={cn(
                  'place-self-center rounded-full bg-current/10 transition-all ease-out',
                  'data-[kai-highlighted=true]:bg-current',
                )}
                style={{
                  width: `${GRID_CELL[props.size]}px`,
                  height: `${GRID_CELL[props.size]}px`,
                  'transition-duration': transition(index),
                }}
              />
            )
          );
        }}
      </Index>
    </div>
  );
}
