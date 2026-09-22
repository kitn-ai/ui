import '../../src/web-components/editable-label/editable-label';

/** Let Solid's scheduler flush effects + renders. */
const flush = () => new Promise((r) => setTimeout(r, 0));

type EditableEl = HTMLElement & { value: string; editing: boolean; edit: () => void };

const readView = (el: EditableEl) => el.shadowRoot!.querySelector<HTMLElement>('[part="text"]');
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
const dblclick = (el: Element) => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));

test('committing a changed value fires kai-rename with detail.value', async () => {
  const el = document.createElement('kai-editable-label') as EditableEl;
  el.setAttribute('value', 'Old');
  document.body.appendChild(el);
  await flush();

  const renames: string[] = [];
  el.addEventListener('kai-rename', (e) => renames.push((e as CustomEvent<{ value: string }>).detail.value));

  el.edit();
  await flush();

  const input = el.shadowRoot!.querySelector<HTMLInputElement>('input')!;
  input.value = 'New';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  await flush();

  expect(renames).toEqual(['New']);
  expect(el.value).toBe('New');

  el.remove();
});

test('Esc fires kai-cancel and keeps the old value', async () => {
  const el = document.createElement('kai-editable-label') as EditableEl;
  el.setAttribute('value', 'Keep');
  document.body.appendChild(el);
  await flush();

  let cancelled = false;
  const renames: string[] = [];
  el.addEventListener('kai-cancel', () => { cancelled = true; });
  el.addEventListener('kai-rename', (e) => renames.push((e as CustomEvent<{ value: string }>).detail.value));

  el.edit();
  await flush();

  const input = el.shadowRoot!.querySelector<HTMLInputElement>('input')!;
  input.value = 'Discard';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
  await flush();

  expect(cancelled).toBe(true);
  expect(renames).toEqual([]);
  expect(el.value).toBe('Keep');

  el.remove();
});

test('edit() enters edit mode (renders the inner input)', async () => {
  const el = document.createElement('kai-editable-label') as EditableEl;
  el.setAttribute('value', 'Name');
  document.body.appendChild(el);
  await flush();

  expect(el.shadowRoot!.querySelector('input')).toBeNull();
  el.edit();
  await flush();
  expect(el.shadowRoot!.querySelector('input')).not.toBeNull();

  el.remove();
});

test('a single click does not enter edit mode by default', async () => {
  const el = document.createElement('kai-editable-label') as EditableEl;
  el.setAttribute('value', 'Name');
  document.body.appendChild(el);
  await flush();

  click(readView(el)!);
  await flush();
  expect(el.shadowRoot!.querySelector('input')).toBeNull();

  el.remove();
});

test('edit-trigger="click" enters edit mode on one click', async () => {
  const el = document.createElement('kai-editable-label') as EditableEl;
  el.setAttribute('value', 'Name');
  el.setAttribute('edit-trigger', 'click');
  document.body.appendChild(el);
  await flush();

  click(readView(el)!);
  await flush();
  expect(el.shadowRoot!.querySelector('input')).not.toBeNull();

  el.remove();
});

test('a double click in edit-trigger="click" mode keeps one field and does not re-enter', async () => {
  const el = document.createElement('kai-editable-label') as EditableEl;
  el.setAttribute('value', 'Name');
  el.setAttribute('edit-trigger', 'click');
  document.body.appendChild(el);
  await flush();

  // Browser order: click, click, then dblclick on the element the two clicks share.
  click(readView(el)!);
  await flush();
  const input = el.shadowRoot!.querySelector<HTMLInputElement>('input')!;
  click(input);
  dblclick(input);
  await flush();

  expect(el.shadowRoot!.querySelectorAll('input')).toHaveLength(1);
  expect(readView(el)).toBeNull();

  input.value = 'Renamed';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  await flush();

  expect(el.value).toBe('Renamed');
  expect(el.shadowRoot!.querySelector('input')).toBeNull();

  el.remove();
});

test('disabled blocks entry on both gestures, in either mode', async () => {
  for (const trigger of ['dblclick', 'click']) {
    const el = document.createElement('kai-editable-label') as EditableEl;
    el.setAttribute('value', 'Locked');
    el.setAttribute('edit-trigger', trigger);
    el.setAttribute('disabled', '');
    document.body.appendChild(el);
    await flush();

    click(readView(el)!);
    dblclick(readView(el)!);
    await flush();
    expect(el.shadowRoot!.querySelector('input'), `blocked while disabled (${trigger})`).toBeNull();

    el.remove();
  }
});
