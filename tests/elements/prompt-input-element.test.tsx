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

const suggestionChip = (el: HTMLElement, label: string) =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button:not([data-testid="send"])'))
    .find((b) => b.textContent?.trim() === label)!;

test('default suggestionMode "submit": clicking a suggestion emits submit (sends it)', async () => {
  const el = document.createElement('kitn-prompt-input') as HTMLElement & { suggestions?: string[] };
  el.suggestions = ['Hi', 'Bye'];
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hi');

  let submitted: string | null = null;
  let suggestionClicked: string | null = null;
  el.addEventListener('submit', (e) => (submitted = (e as CustomEvent).detail.value));
  el.addEventListener('suggestionclick', (e) => (suggestionClicked = (e as CustomEvent).detail.value));

  // A real .click() produces a composed event that reaches Solid's delegated
  // listeners across the shadow boundary in jsdom.
  suggestionChip(el, 'Hi').click();
  expect(submitted).toBe('Hi');           // default = submit
  expect(suggestionClicked).toBe(null);   // suggestionclick is NOT fired in submit mode

  el.remove();
});

test('suggestionMode "fill": clicking a suggestion fills the input and emits suggestionclick', async () => {
  const el = document.createElement('kitn-prompt-input') as HTMLElement & {
    suggestions?: string[]; suggestionMode?: 'submit' | 'fill';
  };
  el.suggestions = ['Hi', 'Bye'];
  el.suggestionMode = 'fill';
  document.body.appendChild(el);
  await Promise.resolve();

  let submitted: string | null = null;
  let clicked: string | null = null;
  el.addEventListener('submit', (e) => (submitted = (e as CustomEvent).detail.value));
  el.addEventListener('suggestionclick', (e) => (clicked = (e as CustomEvent).detail.value));

  suggestionChip(el, 'Bye').click();
  expect(clicked).toBe('Bye');   // fill mode emits suggestionclick
  expect(submitted).toBe(null);  // and does NOT submit
  expect(el.shadowRoot!.querySelector('textarea')!.value).toBe('Bye'); // filled into the input

  el.remove();
});

test('slash command: selecting (Enter) inserts the command into the input', async () => {
  const el = document.createElement('kitn-prompt-input') as HTMLElement & {
    slashCommands?: { id: string; label: string; description?: string }[];
  };
  el.slashCommands = [{ id: 'summarize', label: '/summarize', description: 'Summarize' }];
  document.body.appendChild(el);
  await Promise.resolve();

  const textarea = el.shadowRoot!.querySelector('textarea')!;
  // Type a slash query to open the palette
  textarea.value = '/sum';
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await Promise.resolve();
  await Promise.resolve();

  // The palette should be open and showing the command
  expect(el.shadowRoot!.textContent).toContain('/summarize');

  // Press Enter to select — should insert the command label into the input
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  await Promise.resolve();

  expect(textarea.value.trim()).toBe('/summarize');

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
