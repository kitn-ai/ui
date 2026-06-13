import '../../src/elements/voice-input';

test('record button has an accessible name in its idle state (a11y A1)', async () => {
  const el = document.createElement('kc-voice-input');
  document.body.appendChild(el);
  await Promise.resolve();

  const button = el.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
  // Idle state mirrors the tooltip: "Voice input".
  expect(button.getAttribute('aria-label')).toBe('Voice input');

  el.remove();
});
