import { describe, it, expect } from 'vitest';
import { isBandControlled } from './prompt-dock';

describe('isBandControlled', () => {
  it('is uncontrolled when neither the prop nor the attribute is set', () => {
    expect(isBandControlled(undefined, false)).toBe(false);
  });
  it('is controlled by an explicit false, so false is not mistaken for unset', () => {
    expect(isBandControlled(false, false)).toBe(true);
    expect(isBandControlled(true, false)).toBe(true);
  });
  it('is controlled by a bare attribute, which parses to undefined', () => {
    expect(isBandControlled(undefined, true)).toBe(true);
  });
});
