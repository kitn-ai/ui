// tests/components/card-renderer.test.tsx
import { render } from '@solidjs/testing-library';
import { CardFallback } from '../../src/components/card-fallback';

afterEach(() => { document.body.innerHTML = ''; });

test('CardFallback shows the unsupported type and is a polite alert', () => {
  const { getByRole } = render(() => <CardFallback type="mystery" cardId="x1" />);
  const alert = getByRole('alert');
  expect(alert.textContent).toContain('mystery');
});
