// tests/components/card-renderer.test.tsx
import { render } from '@solidjs/testing-library';
import { CardFallback } from '../../src/components/card-fallback';

afterEach(() => { document.body.innerHTML = ''; });

test('CardFallback shows the unsupported type and is a polite alert', () => {
  const { getByRole } = render(() => <CardFallback type="mystery" cardId="x1" />);
  const alert = getByRole('alert');
  expect(alert.textContent).toContain('mystery');
});

import { fireEvent } from '@solidjs/testing-library';
import { CardRenderer, renderCard } from '../../src/components/card-renderer';
import { CardProvider } from '../../src/primitives/card-host';
import type { CardEnvelope, CardEvent, CardContext } from '../../src/primitives/card-contract';

const CTX: CardContext = { theme: { mode: 'light' }, locale: 'en' };

function withHost(node: () => any) {
  const events: CardEvent[] = [];
  const r = render(() => (
    <CardProvider context={CTX} policy={{ onAction: () => {}, onError: () => {} }}>
      {node()}
    </CardProvider>
  ));
  return { ...r, events };
}

test('CardRenderer renders a confirm card for a confirm envelope', () => {
  const env: CardEnvelope = {
    type: 'confirm', id: 'c1', title: 'Heads up',
    data: { body: 'Proceed?', actions: [{ id: 'ok', label: 'OK', default: true }] },
  };
  const { getByText } = withHost(() => <CardRenderer envelope={env} />);
  expect(getByText('OK')).toBeTruthy();
});

test('unknown type renders CardFallback AND emits one error via the host', () => {
  const events: CardEvent[] = [];
  const env: CardEnvelope = { type: 'mystery', id: 'm1', data: {} };
  const { getByRole } = render(() => (
    <CardProvider context={CTX} policy={{ onError: (id, msg) => events.push({ kind: 'error', cardId: id, message: msg }) }}>
      <CardRenderer envelope={env} />
    </CardProvider>
  ));
  expect(getByRole('alert').textContent).toContain('mystery');
  expect(events.filter((e) => e.kind === 'error')).toHaveLength(1);
});

test('types override renders a custom component for a known type', () => {
  const env: CardEnvelope = { type: 'confirm', id: 'c2', data: {} };
  const { getByTestId } = render(() => (
    <CardProvider context={CTX} policy={{}}>
      <CardRenderer envelope={env} types={{ confirm: (p) => <div data-testid="custom">{p.envelope.id}</div> }} />
    </CardProvider>
  ));
  expect(getByTestId('custom').textContent).toBe('c2');
});

test('renderCard(envelope) is equivalent to <CardRenderer envelope>', () => {
  const env: CardEnvelope = { type: 'link', id: 'l1', data: { url: 'https://example.com', title: 'Ex' } };
  const { container } = render(() => (
    <CardProvider context={CTX} policy={{}}>{renderCard(env)}</CardProvider>
  ));
  expect(container.querySelector('a')).toBeTruthy();
});
