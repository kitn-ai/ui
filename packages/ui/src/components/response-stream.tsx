import { splitProps, Show, For, createEffect, on } from 'solid-js';
import { cn } from '../utils/cn';
import { useTextStream } from '../primitives/use-text-stream';

export type Mode = 'typewriter' | 'fade';

export interface ResponseStreamProps {
  textStream: string | AsyncIterable<string>;
  mode?: Mode;
  speed?: number;
  class?: string;
  onComplete?: () => void;
  as?: string;
  fadeDuration?: number;
  segmentDelay?: number;
  characterChunkSize?: number;
}

function ResponseStream(props: ResponseStreamProps) {
  const [local] = splitProps(props, [
    'textStream', 'mode', 'speed', 'class', 'onComplete',
    'as', 'fadeDuration', 'segmentDelay', 'characterChunkSize',
  ]);

  const mode = () => local.mode ?? 'typewriter';
  const speed = () => local.speed ?? 20;

  const stream = useTextStream({
    mode: mode(),
    speed: speed(),
    characterChunkSize: local.characterChunkSize,
    fadeDuration: local.fadeDuration,
  });

  createEffect(on(
    () => local.textStream,
    (source) => {
      if (source) stream.startStreaming(source);
    }
  ));

  createEffect(on(
    () => stream.isComplete(),
    (complete) => {
      if (complete) local.onComplete?.();
    }
  ));

  const fadeStyle = () => {
    const dur = local.fadeDuration ?? Math.round(1000 / Math.sqrt(Math.min(100, Math.max(1, speed()))));
    return `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .fade-segment {
        display: inline-block;
        opacity: 0;
        animation: fadeIn ${dur}ms ease-out forwards;
      }
      .fade-segment-space {
        white-space: pre;
      }
    `;
  };

  const segDelay = () => {
    if (typeof local.segmentDelay === 'number') return Math.max(0, local.segmentDelay);
    const normalizedSpeed = Math.min(100, Math.max(1, speed()));
    return Math.max(1, Math.round(100 / Math.sqrt(normalizedSpeed)));
  };

  return (
    <div class={local.class}>
      <Show
        when={mode() === 'fade'}
        fallback={<>{stream.displayedText()}</>}
      >
        <style>{fadeStyle()}</style>
        <div class="relative">
          <For each={stream.segments()}>
            {(segment, idx) => {
              const isWhitespace = () => /^\s+$/.test(segment.text);
              return (
                <span
                  class={cn(
                    'fade-segment',
                    isWhitespace() && 'fade-segment-space'
                  )}
                  style={{ 'animation-delay': `${idx() * segDelay()}ms` }}
                >
                  {segment.text}
                </span>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

export { ResponseStream };
