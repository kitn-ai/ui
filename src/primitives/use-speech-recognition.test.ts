import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'solid-js';
import { useSpeechRecognition } from './use-speech-recognition';

// Minimal fake SpeechRecognition: captures handlers, and lets a test drive a
// result + end to simulate the browser firing recognition events.
class FakeSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();

  /** Simulate a final-result event with the given transcript. */
  emitFinal(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript } } },
    });
  }
  /** Simulate an interim (non-final) result event. */
  emitInterim(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { isFinal: false, length: 1, 0: { transcript } } },
    });
  }
}

let last: FakeSpeechRecognition | undefined;
function installFake() {
  last = undefined;
  (window as unknown as Record<string, unknown>).SpeechRecognition = function () {
    last = new FakeSpeechRecognition();
    return last;
  } as unknown;
}
function uninstallFake() {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  last = undefined;
}

afterEach(() => uninstallFake());

describe('useSpeechRecognition', () => {
  it('returns isSupported + isListening signal + control functions', () => {
    installFake();
    createRoot((dispose) => {
      const r = useSpeechRecognition();
      expect(r.isSupported).toBe(true);
      expect(r.isListening()).toBe(false);
      expect(typeof r.start).toBe('function');
      expect(typeof r.stop).toBe('function');
      dispose();
    });
  });

  it('detects the webkit-prefixed constructor', () => {
    uninstallFake();
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
      FakeSpeechRecognition as unknown;
    createRoot((dispose) => {
      expect(useSpeechRecognition().isSupported).toBe(true);
      dispose();
    });
  });

  it('reports unsupported when no constructor is present', () => {
    uninstallFake();
    createRoot((dispose) => {
      const r = useSpeechRecognition();
      expect(r.isSupported).toBe(false);
      expect(r.start()).rejects.toThrow(/not supported/i);
      dispose();
    });
  });

  it('start() flips isListening and applies the lang', () => {
    installFake();
    createRoot((dispose) => {
      const r = useSpeechRecognition();
      void r.start({ lang: 'fr-FR' });
      expect(r.isListening()).toBe(true);
      expect(last!.start).toHaveBeenCalled();
      expect(last!.lang).toBe('fr-FR');
      dispose();
    });
  });

  it('resolves start() with the final transcript on end, and clears isListening', async () => {
    installFake();
    await createRoot(async (dispose) => {
      const r = useSpeechRecognition();
      const pending = r.start({ lang: 'en-US' });
      last!.emitFinal('hello world');
      r.stop(); // fires onend → resolves with the accumulated final text
      await expect(pending).resolves.toBe('hello world');
      expect(r.isListening()).toBe(false);
      dispose();
    });
  });

  it('forwards interim partials to onInterim when interim is enabled', () => {
    installFake();
    createRoot((dispose) => {
      const r = useSpeechRecognition({ interim: true });
      const onInterim = vi.fn();
      void r.start({ onInterim });
      expect(last!.interimResults).toBe(true);
      last!.emitInterim('hel');
      expect(onInterim).toHaveBeenCalledWith('hel');
      dispose();
    });
  });

  it('stop() is a no-op when not listening', () => {
    installFake();
    createRoot((dispose) => {
      const r = useSpeechRecognition();
      expect(() => r.stop()).not.toThrow();
      dispose();
    });
  });
});
