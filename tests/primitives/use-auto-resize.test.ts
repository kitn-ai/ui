import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { useAutoResize } from '../../src/primitives/use-auto-resize';

describe('useAutoResize', () => {
  it('returns a ref callback', () => {
    createRoot((dispose) => {
      const { ref } = useAutoResize();
      expect(typeof ref).toBe('function');
      dispose();
    });
  });

  it('accepts a maxHeight option', () => {
    createRoot((dispose) => {
      const { ref } = useAutoResize({ maxHeight: 200 });
      expect(typeof ref).toBe('function');
      dispose();
    });
  });
});
