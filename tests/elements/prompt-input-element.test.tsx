import '../../src/elements/prompt-input';

test('emits valuechange on input and submit on Enter', async () => {
  const el = document.createElement('kc-prompt-input') as HTMLElement & {
    value?: string; placeholder?: string;
  };
  el.placeholder = 'Ask...';
  document.body.appendChild(el);
  await Promise.resolve();

  const textarea = el.shadowRoot!.querySelector('textarea')!;
  expect(textarea.placeholder).toBe('Ask...');

  let changed: string | null = null;
  let submitted: string | null = null;
  el.addEventListener('kc-value-change', (e) => (changed = (e as CustomEvent).detail.value));
  el.addEventListener('kc-submit', (e) => (submitted = (e as CustomEvent).detail.value));

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
  const el = document.createElement('kc-prompt-input') as HTMLElement & { suggestions?: string[] };
  el.suggestions = ['Hi', 'Bye'];
  document.body.appendChild(el);
  await Promise.resolve();

  expect(el.shadowRoot!.textContent).toContain('Hi');

  let submitted: string | null = null;
  let suggestionClicked: string | null = null;
  el.addEventListener('kc-submit', (e) => (submitted = (e as CustomEvent).detail.value));
  el.addEventListener('kc-suggestion-click', (e) => (suggestionClicked = (e as CustomEvent).detail.value));

  // A real .click() produces a composed event that reaches Solid's delegated
  // listeners across the shadow boundary in jsdom.
  suggestionChip(el, 'Hi').click();
  expect(submitted).toBe('Hi');           // default = submit
  expect(suggestionClicked).toBe(null);   // suggestionclick is NOT fired in submit mode

  el.remove();
});

test('suggestionMode "fill": clicking a suggestion fills the input and emits suggestionclick', async () => {
  const el = document.createElement('kc-prompt-input') as HTMLElement & {
    suggestions?: string[]; suggestionMode?: 'submit' | 'fill';
  };
  el.suggestions = ['Hi', 'Bye'];
  el.suggestionMode = 'fill';
  document.body.appendChild(el);
  await Promise.resolve();

  let submitted: string | null = null;
  let clicked: string | null = null;
  el.addEventListener('kc-submit', (e) => (submitted = (e as CustomEvent).detail.value));
  el.addEventListener('kc-suggestion-click', (e) => (clicked = (e as CustomEvent).detail.value));

  suggestionChip(el, 'Bye').click();
  expect(clicked).toBe('Bye');   // fill mode emits suggestionclick
  expect(submitted).toBe(null);  // and does NOT submit
  expect(el.shadowRoot!.querySelector('textarea')!.value).toBe('Bye'); // filled into the input

  el.remove();
});

test('disallows leading whitespace at the start of the prompt', async () => {
  const el = document.createElement('kc-prompt-input') as HTMLElement & { value?: string };
  document.body.appendChild(el);
  await Promise.resolve();

  const textarea = el.shadowRoot!.querySelector('textarea')!;
  let changed: string | null = null;
  el.addEventListener('kc-value-change', (e) => (changed = (e as CustomEvent).detail.value));

  // Leading spaces are stripped on input.
  textarea.value = '   hello';
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  expect(textarea.value).toBe('hello');
  expect(changed).toBe('hello');

  // A lone leading space collapses to empty (hitting space at the start does nothing).
  textarea.value = ' ';
  textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  expect(textarea.value).toBe('');

  el.remove();
});

test('slash command: selecting (Enter) inserts the command into the input', async () => {
  const el = document.createElement('kc-prompt-input') as HTMLElement & {
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
  const el = document.createElement('kc-prompt-input') as HTMLElement & {
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

test('send button and textarea have accessible names (a11y A1)', async () => {
  const el = document.createElement('kc-prompt-input') as HTMLElement & {
    placeholder?: string;
  };
  el.placeholder = 'Ask anything...';
  document.body.appendChild(el);
  await Promise.resolve();

  const send = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-testid="send"]')!;
  expect(send.getAttribute('aria-label')).toBe('Send message');

  const textarea = el.shadowRoot!.querySelector('textarea')!;
  expect(textarea.getAttribute('aria-label')).toBe('Ask anything...');

  el.remove();
});

test('textarea always has a non-empty accessible name', async () => {
  // With no explicit placeholder the element supplies its default placeholder,
  // which becomes the accessible name. When the placeholder is empty the label
  // falls back to "Message" so the control is never unnamed.
  const withDefault = document.createElement('kc-prompt-input');
  document.body.appendChild(withDefault);
  await Promise.resolve();
  const defaultTextarea = withDefault.shadowRoot!.querySelector('textarea')!;
  expect(defaultTextarea.getAttribute('aria-label')).toBeTruthy();
  withDefault.remove();

  const emptyPlaceholder = document.createElement('kc-prompt-input') as HTMLElement & {
    placeholder?: string;
  };
  emptyPlaceholder.placeholder = '';
  document.body.appendChild(emptyPlaceholder);
  await Promise.resolve();
  const emptyTextarea = emptyPlaceholder.shadowRoot!.querySelector('textarea')!;
  expect(emptyTextarea.getAttribute('aria-label')).toBe('Message');
  emptyPlaceholder.remove();
});
