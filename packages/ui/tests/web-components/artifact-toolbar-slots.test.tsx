// kai-artifact toolbar slots + read-only history state (E3).
import '../../src/web-components/artifact/artifact';

const flush = () => new Promise((r) => setTimeout(r, 0));

type ArtifactEl = HTMLElement & {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  navigate(u: string): void;
  back(): void;
  forward(): void;
};

const mount = async (setup?: (el: ArtifactEl) => void, attrs: Record<string, string> = {}) => {
  const el = document.createElement('kai-artifact') as unknown as ArtifactEl;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  setup?.(el);
  document.body.appendChild(el);
  await flush();
  return el;
};

const builtIn = (el: HTMLElement) => el.shadowRoot!.querySelector('[data-artifact-toolbar]');

afterEach(() => {
  document.querySelectorAll('kai-artifact').forEach((e) => e.remove());
});

test('default: the built-in toolbar renders when nothing is slotted', async () => {
  const el = await mount(undefined, { src: 'https://x.test/a' });
  expect(builtIn(el)).toBeTruthy();
  expect(el.shadowRoot!.querySelector('[aria-label="Back"]')).toBeTruthy();
});

test('a slot="toolbar" child replaces the built-in toolbar', async () => {
  const el = await mount(
    (e) => {
      const t = document.createElement('div');
      t.slot = 'toolbar';
      t.textContent = 'mine';
      e.appendChild(t);
    },
    { src: 'https://x.test/a' },
  );
  expect(builtIn(el)).toBeNull();
  expect(el.shadowRoot!.querySelector('[aria-label="Back"]')).toBeNull();
  expect(el.shadowRoot!.querySelector('slot[name="toolbar"]')).toBeTruthy();
});

test('slot="toolbar" added AFTER first render still replaces it (hydration order)', async () => {
  const el = await mount(undefined, { src: 'https://x.test/a' });
  expect(builtIn(el)).toBeTruthy();
  const t = document.createElement('div');
  t.slot = 'toolbar';
  el.appendChild(t);
  await flush();
  expect(builtIn(el)).toBeNull();
  t.remove();
  await flush();
  expect(builtIn(el)).toBeTruthy(); // and comes back when the slot empties
});

test('an empty <div slot="toolbar"> removes the toolbar', async () => {
  const el = await mount(
    (e) => {
      const t = document.createElement('div');
      t.slot = 'toolbar';
      e.appendChild(t);
    },
    { src: 'https://x.test/a' },
  );
  expect(builtIn(el)).toBeNull();
  expect(el.shadowRoot!.querySelector('input#kai-artifact-path')).toBeNull();
});

test('toolbar-start / toolbar-end slots sit at the built-in toolbar ends', async () => {
  const el = await mount(undefined, { src: 'https://x.test/a' });
  const bar = builtIn(el)!;
  const start = bar.querySelector('slot[name="toolbar-start"]');
  const end = bar.querySelector('slot[name="toolbar-end"]');
  expect(start).toBeTruthy();
  expect(end).toBeTruthy();
  expect(bar.firstElementChild).toBe(start);
  expect(bar.lastElementChild).toBe(end);
});

test('history: canGoBack is false after load, and the getters are read-only state', async () => {
  const el = await mount(undefined, { src: 'https://x.test/a' });
  expect(el.canGoBack).toBe(false);
  expect(el.canGoForward).toBe(false);
  expect(el.url).toBe('https://x.test/a');
  const back = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Back"]')!;
  expect(back.disabled).toBe(true);
});

test('history: navigate x2 → canGoBack, one kai-history-change per navigation; back → canGoForward', async () => {
  const el = await mount(undefined, { src: 'https://x.test/' });
  const seen: Array<{ url: string; canGoBack: boolean; canGoForward: boolean }> = [];
  el.addEventListener('kai-history-change', (e) => seen.push((e as CustomEvent).detail));
  el.navigate('https://x.test/a');
  el.navigate('https://x.test/b');
  await flush();
  expect(el.canGoBack).toBe(true);
  expect(el.url).toBe('https://x.test/b');
  expect(seen).toEqual([
    { url: 'https://x.test/a', urlSafe: true, canGoBack: true, canGoForward: false },
    { url: 'https://x.test/b', urlSafe: true, canGoBack: true, canGoForward: false },
  ]);
  el.back();
  await flush();
  expect(el.canGoForward).toBe(true);
  expect(seen).toHaveLength(3);
  expect(seen[2]).toEqual({ url: 'https://x.test/a', urlSafe: true, canGoBack: true, canGoForward: true });
  el.forward();
  await flush();
  expect(seen[3]).toEqual({ url: 'https://x.test/b', urlSafe: true, canGoBack: true, canGoForward: false });
});

test('history getters have no setter: assigning does not change state', async () => {
  const el = await mount(undefined, { src: 'https://x.test/a' });
  try {
    (el as unknown as { canGoBack: boolean }).canGoBack = true;
  } catch {
    /* strict-mode TypeError on a getter-only accessor is fine */
  }
  expect(el.canGoBack).toBe(false);
});

test('the no* props are gone: noNav / no-nav has no effect', async () => {
  const el = await mount(undefined, { src: 'https://x.test/a', 'no-nav': '', 'no-tabs': '' });
  expect(el.shadowRoot!.querySelector('[aria-label="Back"]')).toBeTruthy();
  expect(el.shadowRoot!.querySelector('[role="tablist"]')).toBeTruthy();
});
