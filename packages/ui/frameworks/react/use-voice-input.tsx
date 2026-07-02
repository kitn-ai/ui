import { useCallback, useRef } from 'react';

/** Minimal shape of a Web Speech recognition result event — enough to read the
 *  first transcript. The full SpeechRecognition API isn't in TS's lib.dom yet. */
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  start(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Resolve the Chromium (`webkitSpeechRecognition`) or standard constructor, if any. */
function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Web Speech mic → one-shot transcript. Chromium-only (`webkitSpeechRecognition`);
 * `supported` is false elsewhere so the caller can degrade gracefully. This hook is
 * deliberately ONLY about speech recognition: it hands the raw transcript to
 * `onTranscript` and lets the caller decide what to do with it (e.g. a composer mic
 * button appends it to the live text). No composer or DOM knowledge.
 *
 * @param onTranscript called with the final recognized transcript.
 * @returns `supported` (Chromium-only availability) and a referentially stable,
 *   one-shot `start` (a no-op when unsupported).
 */
export function useVoiceInput(onTranscript: (transcript: string) => void): {
  supported: boolean;
  start: () => void;
} {
  // Latest-callback ref: keeps `start` stable while always calling the current
  // `onTranscript` (no stale closure, no re-created handler each render).
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  const supported = getSpeechRecognition() !== undefined;

  const start = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (event) => cbRef.current(event.results[0][0].transcript);
    rec.start();
  }, []);

  return { supported, start };
}
