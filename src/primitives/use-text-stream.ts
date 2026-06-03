import { createSignal, onCleanup } from 'solid-js';

export interface UseTextStreamOptions {
  mode: 'typewriter' | 'fade';
  speed?: number;
  characterChunkSize?: number;
  fadeDuration?: number;
}

export interface TextStreamSegment {
  text: string;
  index: number;
}

export function useTextStream(options: UseTextStreamOptions) {
  const speed = options.speed ?? 20;
  const chunkSize = options.characterChunkSize ?? 3;

  const [displayedText, setDisplayedText] = createSignal('');
  const [isComplete, setIsComplete] = createSignal(true);
  const [segments, setSegments] = createSignal<TextStreamSegment[]>([]);

  let fullText = '';
  let charIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isPaused = false;
  let asyncIterator: AsyncIterator<string> | undefined;

  function clearInterval_() {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  }

  function typewriterTick() {
    if (isPaused) return;
    if (charIndex >= fullText.length) {
      if (!asyncIterator) {
        clearInterval_();
        setIsComplete(true);
      }
      return;
    }
    const end = Math.min(charIndex + chunkSize, fullText.length);
    charIndex = end;
    setDisplayedText(fullText.slice(0, charIndex));
  }

  async function consumeAsyncIterable(source: AsyncIterable<string>) {
    asyncIterator = source[Symbol.asyncIterator]();
    try {
      while (true) {
        const { value, done } = await asyncIterator.next();
        if (done) break;
        if (value) {
          fullText += value;
          setSegments((prev) => [...prev, { text: value, index: prev.length }]);
        }
      }
    } finally {
      asyncIterator = undefined;
    }
  }

  function startStreaming(source: string | AsyncIterable<string>) {
    reset();
    setIsComplete(false);

    if (typeof source === 'string') {
      fullText = source;
      if (options.mode === 'typewriter') {
        intervalId = setInterval(typewriterTick, speed);
      } else {
        // Deliver all segments at once — CSS animation-delay handles staggered fade-in
        const words = source.split(/(\s+)/).filter(Boolean);
        setSegments(words.map((text, index) => ({ text, index })));
        setDisplayedText(source);
        // isComplete fires after animation has time to play
        // (segments count * delay per segment from ResponseStream)
      }
    } else {
      if (options.mode === 'typewriter') {
        intervalId = setInterval(typewriterTick, speed);
      }
      consumeAsyncIterable(source).then(() => {
        if (options.mode === 'fade') {
          setDisplayedText(fullText);
          setIsComplete(true);
        }
      });
    }
  }

  function pause() { isPaused = true; }
  function resume() { isPaused = false; }

  function reset() {
    clearInterval_();
    fullText = '';
    charIndex = 0;
    isPaused = false;
    asyncIterator = undefined;
    setDisplayedText('');
    setIsComplete(true);
    setSegments([]);
  }

  onCleanup(() => clearInterval_());

  return { displayedText, isComplete, segments, startStreaming, pause, resume, reset };
}
