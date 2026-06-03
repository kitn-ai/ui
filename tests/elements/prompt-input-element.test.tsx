import '../../src/elements/prompt-input';

test('emits valuechange on input and submit on Enter', async () => {
  const el = document.createElement('kitn-prompt-input') as HTMLElement & {
    value?: string; placeholder?: string;
  };
  el.placeholder = 'Ask...';
  document.body.appendChild(el);
  await Promise.resolve();

  const textarea = el.shadowRoot!.querySelector('textarea')!;
  expect(textarea.placeholder).toBe('Ask...');

  let changed: string | null = null;
  let submitted: string | null = null;
  el.addEventListener('valuechange', (e) => (changed = (e as CustomEvent).detail.value));
  el.addEventListener('submit', (e) => (submitted = (e as CustomEvent).detail.value));

  textarea.value = 'hello';
  // jsdom shadow-DOM events must be `composed:true` to cross the shadow boundary
  // and reach SolidJS's document-level delegated listeners (mirrors real browser
  // behaviour where native input/keydown events are always composed).
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  expect(changed).toBe('hello');

  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  expect(submitted).toBe('hello');

  el.remove();
});
