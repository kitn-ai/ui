import { WEB_COMPONENT_CSS } from '../../src/web-components/css';
test('WEB_COMPONENT_CSS is a non-empty compiled stylesheet', () => {
  expect(typeof WEB_COMPONENT_CSS).toBe('string');
  expect(WEB_COMPONENT_CSS.length).toBeGreaterThan(1000);
});
