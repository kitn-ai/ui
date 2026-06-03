import '../../src/elements/register';

test('all three custom elements are defined', () => {
  expect(customElements.get('kitn-chat')).toBeTruthy();
  expect(customElements.get('kitn-conversation-list')).toBeTruthy();
  expect(customElements.get('kitn-prompt-input')).toBeTruthy();
});
