// tests/elements/card-element.test.tsx
import '../../src/elements/card';

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.querySelectorAll('kc-card').forEach((e) => e.remove());
});

test('kc-card registers', () => {
  expect(customElements.get('kc-card')).toBeTruthy();
});

test('kc-card renders heading + description from attributes and projects default slot', async () => {
  const el = document.createElement('kc-card');
  el.setAttribute('heading', 'Share your feedback');
  el.setAttribute('description', 'Two quick questions.');
  el.innerHTML = '<p data-testid="body">the body</p>';
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  const h = root.querySelector('h3')!;
  expect(h).toBeTruthy();
  expect(h.textContent).toBe('Share your feedback');
  expect(root.textContent).toContain('Two quick questions.');
  // The default slot exists so light-DOM body projects.
  expect(root.querySelector('slot:not([name])')).toBeTruthy();
});

test('kc-card exposes named media + actions slots', async () => {
  const el = document.createElement('kc-card');
  el.setAttribute('heading', 'T');
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  expect(root.querySelector('slot[name="media"]')).toBeTruthy();
  expect(root.querySelector('slot[name="actions"]')).toBeTruthy();
});

test('kc-card error-message renders the inline role="alert" error and no slots', async () => {
  const el = document.createElement('kc-card');
  el.setAttribute('heading', 'T');
  el.setAttribute('error-message', "This form couldn't be displayed.");
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  const alert = root.querySelector('[role="alert"]')!;
  expect(alert).toBeTruthy();
  expect(alert.textContent).toContain("This form couldn't be displayed.");
  // body + actions slots are not rendered in the error state.
  expect(root.querySelector('slot:not([name])')).toBeNull();
  expect(root.querySelector('slot[name="actions"]')).toBeNull();
});
