import { vi } from 'vitest';
import '../../src/elements/voice-input';

test('record button has an accessible name in its idle state (a11y A1)', async () => {
  const el = document.createElement('kai-voice-input');
  document.body.appendChild(el);
  await Promise.resolve();

  const button = el.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
  // Idle state mirrors the tooltip: "Voice input".
  expect(button.getAttribute('aria-label')).toBe('Voice input');

  el.remove();
});

// --- native SpeechRecognition path (no `transcribe` callback set) ---

// A fake SpeechRecognition wired to window, so the native path is "supported".
class FakeSpeechRecognition {
  static last: FakeSpeechRecognition | undefined;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeSpeechRecognition.last = this;
  }
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  emitFinal(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript } } },
    });
  }
}

test('native recognition fires kai-transcription when no transcribe is set', async () => {
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeSpeechRecognition;
  FakeSpeechRecognition.last = undefined;

  const el = document.createElement('kai-voice-input');
  // no `el.transcribe` → native SpeechRecognition path
  el.setAttribute('recognition-lang', 'en-US');
  document.body.appendChild(el);
  await Promise.resolve();

  const transcripts: string[] = [];
  el.addEventListener('kai-transcription', (e) => {
    transcripts.push((e as CustomEvent<{ text: string }>).detail.text);
  });

  const button = el.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
  button.click(); // begin recognition
  await Promise.resolve();

  const recog = FakeSpeechRecognition.last!;
  expect(recog.start).toHaveBeenCalled();
  expect(recog.lang).toBe('en-US');

  recog.emitFinal('hello from native');
  button.click(); // stop → onend resolves with final text
  // let the resolved start() promise flush → onTranscription → dispatch
  await Promise.resolve();
  await Promise.resolve();

  expect(transcripts).toEqual(['hello from native']);

  el.remove();
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
});
