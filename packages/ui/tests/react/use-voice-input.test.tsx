// tests/react/use-voice-input.test.tsx
// Run with `npm run test:react`. jsdom exposes no Web Speech API, so `supported`
// is false and `start` is a safe no-op — the graceful-degradation path.
import { renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { useVoiceInput } from '@kitn.ai/ui/react';

afterEach(cleanup);

test('supported is false when SpeechRecognition is absent', () => {
  const { result } = renderHook(() => useVoiceInput(() => {}));
  expect(result.current.supported).toBe(false);
  // start() must not throw when unsupported.
  expect(() => result.current.start()).not.toThrow();
});

test('start is referentially stable across renders', () => {
  const { result, rerender } = renderHook(({ cb }) => useVoiceInput(cb), {
    initialProps: { cb: () => {} },
  });
  const first = result.current.start;
  rerender({ cb: () => {} });
  expect(result.current.start).toBe(first);
});
