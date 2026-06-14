import { ELEMENT_CSS } from '../../src/elements/css';
test('ELEMENT_CSS is a non-empty compiled stylesheet', () => {
  expect(typeof ELEMENT_CSS).toBe('string');
  expect(ELEMENT_CSS.length).toBeGreaterThan(1000);
});
