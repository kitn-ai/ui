import { describe, it, expect } from 'vitest';
import * as solid from '../../src/solid';

describe('ChatApp rename', () => {
  it('exports ChatApp and not ChatThread', () => {
    expect(typeof (solid as Record<string, unknown>).ChatApp).toBe('function');
    expect((solid as Record<string, unknown>).ChatThread).toBeUndefined();
  });
});
