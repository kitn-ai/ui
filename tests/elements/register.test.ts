import '../../src/elements/register';

test('all three custom elements are defined', () => {
  expect(customElements.get('kai-chat')).toBeTruthy();
  expect(customElements.get('kai-conversations')).toBeTruthy();
  expect(customElements.get('kai-prompt-input')).toBeTruthy();
});
