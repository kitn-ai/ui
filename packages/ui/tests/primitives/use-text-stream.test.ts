import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { useTextStream } from '../../src/primitives/use-text-stream';

describe('useTextStream', () => {
  it('returns displayedText, isComplete, and control functions', () => {
    createRoot((dispose) => {
      const stream = useTextStream({ mode: 'typewriter' });
      expect(stream.displayedText()).toBe('');
      expect(stream.isComplete()).toBe(true);
      expect(typeof stream.reset).toBe('function');
      expect(typeof stream.startStreaming).toBe('function');
      expect(typeof stream.pause).toBe('function');
      expect(typeof stream.resume).toBe('function');
      dispose();
    });
  });

  it('streams text from a string source', async () => {
    const result = await new Promise<string>((resolve) => {
      createRoot(async (dispose) => {
        const stream = useTextStream({ mode: 'typewriter', speed: 1, characterChunkSize: 100 });
        stream.startStreaming('Hello, world!');
        await new Promise((r) => setTimeout(r, 50));
        resolve(stream.displayedText());
        dispose();
      });
    });
    expect(result).toBe('Hello, world!');
  });
});
