import { KITN_CSS } from '../../src/elements/css';
test('KITN_CSS is a non-empty compiled stylesheet', () => {
  expect(typeof KITN_CSS).toBe('string');
  expect(KITN_CSS.length).toBeGreaterThan(1000);
});
