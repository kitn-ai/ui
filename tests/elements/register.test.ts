import '../../src/elements/register';

test('all three custom elements are defined', () => {
  expect(customElements.get('kc-chat')).toBeTruthy();
  expect(customElements.get('kc-conversations')).toBeTruthy();
  expect(customElements.get('kc-prompt-input')).toBeTruthy();
});
