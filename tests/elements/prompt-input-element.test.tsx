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

test('renders suggestions and emits suggestionclick when a chip is clicked', async () => {
  const el = document.createElement('kitn-prompt-input') as HTMLElement & {
    suggestions?: string[];
  };
  el.suggestions = ['Hi', 'Bye'];
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hi');
  expect(el.shadowRoot!.textContent).toContain('Bye');

  let clicked: string | null = null;
  el.addEventListener('suggestionclick', (e) => (clicked = (e as CustomEvent).detail.value));

  const chips = Array.from(
    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button:not([data-testid="send"])'),
  );
  const hiChip = chips.find((b) => b.textContent?.trim() === 'Hi')!;
  // A real .click() produces a composed event, so it reaches Solid's delegated
  // listeners across the shadow boundary in jsdom.
  hiChip.click();
  expect(clicked).toBe('Hi');

  el.remove();
});

test('send button is disabled when loading even with non-empty value', async () => {
  const el = document.createElement('kitn-prompt-input') as HTMLElement & {
    loading?: boolean;
  };
  document.body.appendChild(el);
  await Promise.resolve();

  const textarea = el.shadowRoot!.querySelector('textarea')!;
  textarea.value = 'something';
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

  el.loading = true;
  await Promise.resolve();

  const send = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-testid="send"]')!;
  expect(send.disabled).toBe(true);

  el.remove();
});
