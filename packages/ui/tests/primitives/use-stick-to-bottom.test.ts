import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { useStickToBottom } from '../../src/primitives/use-stick-to-bottom';

describe('useStickToBottom', () => {
  it('returns ref, isAtBottom signal, and scrollToBottom function', () => {
    createRoot((dispose) => {
      const { ref, isAtBottom, scrollToBottom } = useStickToBottom();
      expect(typeof ref).toBe('function');
      expect(typeof isAtBottom).toBe('function');
      expect(typeof scrollToBottom).toBe('function');
      dispose();
    });
  });

  it('defaults to isAtBottom = true', () => {
    createRoot((dispose) => {
      const { isAtBottom } = useStickToBottom();
      expect(isAtBottom()).toBe(true);
      dispose();
    });
  });
});
