import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { VoiceOutput, type VoiceOutputController } from './voice-output';

// jsdom ships no Web Speech API, so stub speechSynthesis + the utterance ctor.
// The stub captures the spoken utterance and lets a test fire its `onend` to
// drive the speaking → idle transition the component listens for.
let lastUtterance: { text: string; onend?: () => void; onerror?: () => void } | undefined;
const speakSpy = vi.fn((u: typeof lastUtterance) => { lastUtterance = u; });
const cancelSpy = vi.fn();

class FakeUtterance {
  text: string;
  onend?: () => void;
  onerror?: () => void;
  constructor(text: string) { this.text = text; }
}

beforeEach(() => {
  lastUtterance = undefined;
  speakSpy.mockClear();
  cancelSpy.mockClear();
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', { speak: speakSpy, cancel: cancelSpy, pause: vi.fn(), resume: vi.fn() });
  // jsdom defines `window` but not the speechSynthesis property; mirror the stub.
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = (globalThis as unknown as { speechSynthesis: unknown }).speechSynthesis;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('VoiceOutput — native path (speechSynthesis)', () => {
  it('speak() calls speechSynthesis.speak with the text and fires speaking-change(true)', () => {
    const onSpeakingChange = vi.fn();
    let controller!: VoiceOutputController;
    render(() => (
      <VoiceOutput text="hello world" onSpeakingChange={onSpeakingChange} controllerRef={(c) => (controller = c)} />
    ));

    controller.speak();

    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(lastUtterance?.text).toBe('hello world');
    expect(onSpeakingChange).toHaveBeenLastCalledWith(true);
  });

  it('clicking the button speaks, then stops on a second click (fires speaking-change(false))', () => {
    const onSpeakingChange = vi.fn();
    const { getByRole } = render(() => (
      <VoiceOutput text="read me" onSpeakingChange={onSpeakingChange} />
    ));
    const btn = getByRole('button');

    fireEvent.click(btn);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(onSpeakingChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(btn);
    expect(cancelSpy).toHaveBeenCalled();
    expect(onSpeakingChange).toHaveBeenLastCalledWith(false);
  });

  it('fires speaking-change(false) when the utterance ends', () => {
    const onSpeakingChange = vi.fn();
    let controller!: VoiceOutputController;
    render(() => (
      <VoiceOutput text="bye" onSpeakingChange={onSpeakingChange} controllerRef={(c) => (controller = c)} />
    ));

    controller.speak();
    expect(onSpeakingChange).toHaveBeenLastCalledWith(true);

    lastUtterance?.onend?.();
    expect(onSpeakingChange).toHaveBeenLastCalledWith(false);
  });

  it('renders disabled when speechSynthesis is unavailable and no synthesize is set', () => {
    vi.unstubAllGlobals();
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    const { getByRole } = render(() => <VoiceOutput text="no speech" />);
    expect(getByRole('button')).toBeDisabled();
  });
});

describe('VoiceOutput — model path (synthesize)', () => {
  beforeEach(() => {
    // jsdom implements neither URL.createObjectURL nor HTMLMediaElement.play/pause.
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    }));
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockReturnValue(undefined);
  });

  it('speak() invokes the synthesize callback with the text and emits the blob', async () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    const onSynthesize = vi.fn(async () => blob);
    const onSynthesized = vi.fn();
    let controller!: VoiceOutputController;
    render(() => (
      <VoiceOutput
        text="say this"
        onSynthesize={onSynthesize}
        onSynthesized={onSynthesized}
        controllerRef={(c) => (controller = c)}
      />
    ));

    controller.speak();
    // Native path must NOT be used when synthesize is set.
    expect(speakSpy).not.toHaveBeenCalled();
    expect(onSynthesize).toHaveBeenCalledWith('say this');

    // Let the synthesize promise resolve so the blob is emitted.
    await onSynthesize.mock.results[0].value;
    expect(onSynthesized).toHaveBeenCalledWith(blob);
  });
});
