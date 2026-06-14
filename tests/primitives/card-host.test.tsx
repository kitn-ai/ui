// tests/primitives/card-host.test.tsx
import { render } from '@solidjs/testing-library';
import { expect, test, vi } from 'vitest';
import { CardProvider, useCardHost } from '../../src/primitives/card-host';
import type { CardContext } from '../../src/primitives/card-contract';

test('useCardHost returns undefined with no provider', () => {
  let host: ReturnType<typeof useCardHost>;
  function Probe() { host = useCardHost(); return <span>x</span>; }
  render(() => <Probe />);
  expect(host).toBeUndefined();
});

test('CardProvider exposes context() and emit() routes through policy', () => {
  const onAction = vi.fn();
  const ctx: CardContext = { theme: { mode: 'light' }, locale: 'en' };
  let host: ReturnType<typeof useCardHost>;
  function Probe() { host = useCardHost(); return <span>x</span>; }
  render(() => (
    <CardProvider context={ctx} policy={{ onAction }}>
      <Probe />
    </CardProvider>
  ));
  expect(host!.context().theme.mode).toBe('light');
  host!.emit({ kind: 'action', cardId: 'c1', action: 'go' });
  expect(onAction).toHaveBeenCalledWith('c1', 'go', undefined);
});

test('CardProvider accepts a reactive context getter', () => {
  let host: ReturnType<typeof useCardHost>;
  function Probe() { host = useCardHost(); return <span>x</span>; }
  render(() => (
    <CardProvider context={() => ({ theme: { mode: 'dark' as const }, locale: 'fr' })}>
      <Probe />
    </CardProvider>
  ));
  expect(host!.context().locale).toBe('fr');
});
