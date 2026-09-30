/**
 * A prop the wrapper wrote BEFORE the element was defined must not become the
 * element's "declared default". The kit now keeps a pre-upgrade own property through
 * the upgrade (the component-register patch), so a value written to the not-yet-upgraded
 * element survives and would be captured as the default; `undefined` would then restore
 * the caller's own old value instead of the element's real default. (Seen as a block
 * whose conversation starters never went away on the react page.)
 */
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { createWebComponent } from '../../frameworks/react/runtime';

afterEach(cleanup);

type LateProps = { label?: string };

test('undefined restores the element default, not a value written before the upgrade', async () => {
  const Late = createWebComponent<LateProps>('kai-late-default', ['label'], {});

  const { container, rerender } = render(<Late label="mine" />);
  const el = container.querySelector('kai-late-default') as HTMLElement & { label?: string };

  // Define it late, with the survive-the-upgrade semantics the patched runtime gives:
  // an own property set earlier is harvested, else the declared default applies.
  class LateEl extends HTMLElement {
    connectedCallback() {
      let value = (this as unknown as { label?: string }).label ?? 'default';
      Object.defineProperty(this, 'label', { get: () => value, set: (v) => { value = v; }, configurable: true });
    }
  }
  customElements.define('kai-late-default', LateEl);
  await customElements.whenDefined('kai-late-default');
  await Promise.resolve();

  rerender(<Late label={undefined} />);
  expect(el.label).toBe('default');
});
