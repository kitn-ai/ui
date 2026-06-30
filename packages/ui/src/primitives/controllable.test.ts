import { describe, it, expect } from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { createControllableSignal } from './controllable';

describe('createControllableSignal', () => {
  it('uses the initial value when uncontrolled (controlled accessor is undefined)', () => {
    createRoot((dispose) => {
      const [value] = createControllableSignal(() => undefined, true);
      expect(value()).toBe(true);
      dispose();
    });
  });

  it('updates via the setter when uncontrolled', () => {
    createRoot((dispose) => {
      const [value, setValue] = createControllableSignal(() => undefined, false);
      setValue(true);
      expect(value()).toBe(true);
      dispose();
    });
  });

  it('reflects the controlled value and ignores the internal setter while controlled', () => {
    createRoot((dispose) => {
      const [controlled, setControlled] = createSignal<boolean | undefined>(false);
      const [value, setValue] = createControllableSignal(controlled, false);
      expect(value()).toBe(false);
      setValue(true); // masked while controlled
      expect(value()).toBe(false);
      setControlled(true); // the controlling value wins
      expect(value()).toBe(true);
      dispose();
    });
  });

  it('falls back to the internal value when control is released (becomes undefined)', () => {
    createRoot((dispose) => {
      const [controlled, setControlled] = createSignal<boolean | undefined>(true);
      const [value, setValue] = createControllableSignal(controlled, false);
      expect(value()).toBe(true);
      setValue(true); // sets internal (masked now)
      setControlled(undefined); // uncontrolled → internal shows
      expect(value()).toBe(true);
      dispose();
    });
  });
});
