import { type JSX, Show, For, createMemo } from 'solid-js';
import { createPresence } from '../overlay/overlay';
import { cn } from '../../utils/cn';

/**
 * `Captions`, live closed-captioning: the text shown WHILE someone (the user or the
 * agent) is speaking, distinct from a scrollback transcript. Generic on purpose: any
 * voice surface that wants a caption line can use it directly.
 *
 * - Driven by `segments`, oldest first: the LAST entry is the current line, everything
 *   before it is history and only `stacked` renders it.
 * - `variant` picks the chrome: `lower-third` (a semi-opaque bar), `floating` (a card
 *   over a visualizer), `minimal` (bare text, the default), `stacked` (history fades in).
 * - Speaker-aware via `data-speaker` and a small label ("You" / "Assistant"), never a
 *   color swap: accent stays reserved for the visualizer.
 * - Interim (`final: false`) text renders a shade lighter, so a caption settles visibly
 *   when the model or the ASR commits it. Empty `segments`, or a blank current segment,
 *   renders NOTHING: a real `<Show>` around a presence gate, not a hidden node.
 * - ONE `role="status"` / `aria-live="polite"` region, wrapping ONLY the current line
 *   (`stacked`'s history is `aria-hidden`), so it cannot double-announce what a
 *   transcript elsewhere announces. Same policy as `toast.tsx`.
 * - `createPresence` plus a keyed `<For>`: a new segment object retriggers its own
 *   `animate-in`, and both carry `motion-reduce:animate-none`.
 */
export interface CaptionSegment {
  /** Whose speech this line represents. */
  speaker: 'user' | 'assistant';
  /** The line's text. Empty/whitespace on the CURRENT segment renders nothing. */
  text: string;
  /** Whether ASR/the model has committed this line. Default `true`. */
  final?: boolean;
}

export type CaptionsVariant = 'lower-third' | 'floating' | 'minimal' | 'stacked';

export interface CaptionsProps {
  /** Caption lines, oldest first. The last entry is the current line. */
  segments?: CaptionSegment[];
  /** Which visual treatment to render. Default `'minimal'`. */
  variant?: CaptionsVariant;
  class?: string;
}

const SPEAKER_LABEL: Record<CaptionSegment['speaker'], string> = {
  user: 'You',
  assistant: 'Assistant',
};

const VARIANT_CONTAINER: Record<CaptionsVariant, string> = {
  'lower-third':
    'w-full rounded-md border border-border bg-card/90 px-4 py-2.5 text-center backdrop-blur supports-[backdrop-filter]:bg-card/75',
  floating:
    'mx-auto w-fit max-w-xl rounded-2xl bg-card px-5 py-3 text-center kai-elevation',
  minimal: 'mx-auto max-w-xl px-4 py-2 text-center',
  stacked: 'mx-auto flex max-w-xl flex-col items-center gap-1 px-4 py-2 text-center',
};

function lineText(final: boolean | undefined): string {
  return final === false ? 'text-muted-foreground' : 'text-foreground';
}

export function Captions(props: CaptionsProps): JSX.Element {
  const variant = () => props.variant ?? 'minimal';

  const currentSegment = createMemo<CaptionSegment | undefined>(() => {
    const segs = props.segments;
    if (!segs || segs.length === 0) return undefined;
    const last = segs[segs.length - 1];
    return last?.text?.trim() ? last : undefined;
  });
  const hasContent = createMemo(() => !!currentSegment());
  const presence = createPresence(hasContent);

  // History for the `stacked` variant only: up to the two most recent
  // non-empty lines BEFORE the current one, oldest of the pair first.
  const historySegments = createMemo<CaptionSegment[]>(() => {
    const segs = props.segments;
    if (!segs || segs.length < 2) return [];
    return segs
      .slice(0, -1)
      .filter((s) => s.text?.trim())
      .slice(-2);
  });

  return (
    <Show when={presence.present()}>
      <div
        ref={presence.setRef}
        data-expanded={presence.state() === 'open' ? '' : undefined}
        data-closed={presence.state() === 'closed' ? '' : undefined}
        class={cn(
          'pointer-events-none',
          VARIANT_CONTAINER[variant()],
          'animate-in fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0 motion-reduce:animate-none',
          props.class,
        )}
      >
        <Show when={variant() === 'stacked'}>
          <div aria-hidden="true" class="flex flex-col items-center gap-0.5">
            <For each={historySegments()}>
              {(seg, i) => (
                <div
                  data-speaker={seg.speaker}
                  class={cn(
                    /* The recency fade is NOT an opacity blend: muted-foreground sits near 5.4:1 on
                       white, so any fade under ~91% opacity drops below WCAG AA while
                       looking identical to solid, and axe color-contrast fails it. The
                       hierarchy uses shades that each pass on their own: older lines
                       render solid muted-foreground, the newest mixes 35% foreground
                       into it.

                       An inline style, not a text-[color-mix(...)] class: Tailwind
                       JIT emission of arbitrary classes has been non-deterministic
                       across builds here, so a class can verify locally and be
                       missing from a CI-built compiled.css. */
                    'text-sm leading-snug text-balance',
                    i() !== historySegments().length - 1 && 'text-muted-foreground',
                  )}
                  style={
                    i() === historySegments().length - 1
                      ? { color: 'color-mix(in srgb, var(--color-foreground) 35%, var(--color-muted-foreground))' }
                      : undefined
                  }
                >
                  {seg.text}
                </div>
              )}
            </For>
          </div>
        </Show>

        <For each={currentSegment() ? [currentSegment()!] : []}>
          {(seg) => (
            <div
              role="status"
              aria-live="polite"
              data-speaker={seg.speaker}
              data-final={seg.final === false ? undefined : ''}
              class={cn(
                'flex flex-col items-center gap-0.5',
                'animate-in fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none',
              )}
            >
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {SPEAKER_LABEL[seg.speaker]}
              </span>
              <span
                class={cn(
                  'text-xl leading-snug text-balance',
                  seg.speaker === 'assistant' ? 'font-medium' : 'font-normal',
                  lineText(seg.final),
                  seg.final === false && 'italic',
                )}
              >
                {seg.text}
              </span>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
