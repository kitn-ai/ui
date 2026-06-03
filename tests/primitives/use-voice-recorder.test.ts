import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { useVoiceRecorder } from '../../src/primitives/use-voice-recorder';

describe('useVoiceRecorder', () => {
  it('returns isRecording signal and control functions', () => {
    createRoot((dispose) => {
      const { isRecording, start, stop } = useVoiceRecorder();
      expect(isRecording()).toBe(false);
      expect(typeof start).toBe('function');
      expect(typeof stop).toBe('function');
      dispose();
    });
  });
});
