// tests/elements/artifact-element.test.tsx
import '../../src/elements/file-tree';
import '../../src/elements/artifact';
import {
  configurePdfPreview,
  __resetPdfPreviewForTests,
} from '../../src/primitives/pdf-preview';

afterEach(() => __resetPdfPreviewForTests());

// jsdom has no layout; assert DOM structure, attributes and events only.
// Real iframe framing / nav / visuals are verified via Playwright.

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.querySelectorAll('kc-artifact, kc-file-tree').forEach((e) => e.remove());
});

test('both kc-artifact and kc-file-tree register', () => {
  expect(customElements.get('kc-artifact')).toBeTruthy();
  expect(customElements.get('kc-file-tree')).toBeTruthy();
});

// --- kc-file-tree ---------------------------------------------------------

test('kc-file-tree builds nested folders from /-delimited paths', async () => {
  const el = document.createElement('kc-file-tree') as HTMLElement & { files: unknown };
  el.files = [{ path: 'index.html' }, { path: 'src/app.ts' }, { path: 'src/lib/util.ts' }];
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  const folders = root.querySelectorAll('[data-tree-kind="folder"]');
  // 'src' and 'src/lib' are folders.
  const folderPaths = Array.from(folders).map((f) => f.getAttribute('data-tree-path'));
  expect(folderPaths).toContain('src');
  expect(folderPaths).toContain('src/lib');
  // The tree role exists.
  expect(root.querySelector('[role="tree"]')).toBeTruthy();
});

test('kc-file-tree fires a `select` event with detail.path on file click', async () => {
  const el = document.createElement('kc-file-tree') as HTMLElement & { files: unknown };
  el.files = [{ path: 'index.html', type: 'html' }];
  document.body.appendChild(el);
  await flush();
  let detail: { path: string } | null = null;
  el.addEventListener('select', (e) => (detail = (e as CustomEvent).detail));
  const fileRow = el.shadowRoot!.querySelector<HTMLElement>('[data-tree-kind="file"]')!;
  fileRow.click();
  expect(detail).not.toBeNull();
  expect(detail!.path).toBe('index.html');
});

// --- kc-artifact ----------------------------------------------------------

test('kc-artifact reflects src + sandbox onto the iframe', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement & { src: string };
  el.setAttribute('src', 'https://example.com/page.html');
  el.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
  document.body.appendChild(el);
  await flush();
  const iframe = el.shadowRoot!.querySelector('iframe')!;
  expect(iframe).toBeTruthy();
  expect(iframe.getAttribute('src')).toBe('https://example.com/page.html');
  expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups');
  expect(iframe.getAttribute('title')).toBeTruthy();
});

test('kc-artifact defaults the iframe sandbox to allow-scripts allow-forms (no allow-same-origin)', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement & { src: string };
  el.setAttribute('src', 'https://example.com/');
  document.body.appendChild(el);
  await flush();
  const iframe = el.shadowRoot!.querySelector('iframe')!;
  expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
  expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
});

test('kc-artifact tab toggle switches Preview/Code and fires tabchange', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement & { files: unknown };
  el.files = [{ path: 'a.ts', code: 'const a = 1;', language: 'ts', type: 'other' }];
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  // starts on preview → iframe present, no file tree
  expect(root.querySelector('iframe')).toBeTruthy();

  let changed: { tab: string } | null = null;
  el.addEventListener('tabchange', (e) => (changed = (e as CustomEvent).detail));

  const codeTab = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).find(
    (t) => t.textContent?.includes('Code'),
  )!;
  codeTab.click();
  await flush();
  expect(changed).not.toBeNull();
  expect(changed!.tab).toBe('code');
  // Code tab now shows the tree (no iframe).
  expect(root.querySelector('[role="tree"]')).toBeTruthy();
  expect(root.querySelector('iframe')).toBeNull();
});

test('kc-artifact file-select emits navigate + fileselect and navigates the iframe', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement & {
    files: unknown;
    tab: string;
  };
  el.files = [
    { path: 'index.html', url: 'https://cdn.test/index.html', code: '<h1>hi</h1>', language: 'html', type: 'html' },
    { path: 'about.html', url: 'https://cdn.test/about.html', code: '<h1>about</h1>', language: 'html', type: 'html' },
  ];
  el.setAttribute('tab', 'code');
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;

  const events: string[] = [];
  let navUrl: string | null = null;
  let selPath: string | null = null;
  el.addEventListener('navigate', (e) => {
    events.push('navigate');
    navUrl = (e as CustomEvent).detail.url;
  });
  el.addEventListener('fileselect', (e) => {
    events.push('fileselect');
    selPath = (e as CustomEvent).detail.path;
  });

  const aboutRow = Array.from(root.querySelectorAll<HTMLElement>('[data-tree-kind="file"]')).find(
    (r) => r.textContent?.includes('about.html'),
  )!;
  aboutRow.click();
  await flush();

  expect(events).toContain('navigate');
  expect(events).toContain('fileselect');
  expect(selPath).toBe('about.html');
  expect(navUrl).toBe('https://cdn.test/about.html');
});

test('kc-artifact resolves a file url from src origin + path when url omitted', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement & {
    files: unknown;
    src: string;
  };
  el.setAttribute('src', 'https://host.test/base/index.html');
  el.files = [{ path: 'about.html', code: 'x', language: 'html', type: 'html' }];
  el.setAttribute('tab', 'code');
  document.body.appendChild(el);
  await flush();
  let navUrl: string | null = null;
  el.addEventListener('navigate', (e) => (navUrl = (e as CustomEvent).detail.url));
  const row = el.shadowRoot!.querySelector<HTMLElement>('[data-tree-kind="file"]')!;
  row.click();
  await flush();
  // new URL('about.html', 'https://host.test/base/index.html') → .../base/about.html
  expect(navUrl).toBe('https://host.test/base/about.html');
});

test('kc-artifact shows the fallback card for a PDF when inline preview is disabled', async () => {
  configurePdfPreview({ enabled: false });
  const el = document.createElement('kc-artifact') as HTMLElement & { src: string };
  el.src = 'https://example.com/report.pdf';
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  const links = Array.from(root.querySelectorAll('a')).map((a) => a.textContent ?? '');
  expect(links.some((t) => /Open in new tab/i.test(t))).toBe(true);
  expect(links.some((t) => /Download/i.test(t))).toBe(true);
});

test('kc-artifact frames non-PDF src in the iframe (no fallback card)', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement & { src: string };
  el.src = 'https://example.com/index.html';
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  expect(root.querySelector('iframe')).toBeTruthy();
});

test('expandable: expand button fires kc-maximize-intent (bubbles+composed) AND maximizechange', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test');
  el.setAttribute('expandable', '');
  document.body.appendChild(el);
  await flush();
  let intent: { requested: boolean } | null = null;
  let bubbles = false, composed = false;
  document.addEventListener('kc-maximize-intent', (e) => {
    intent = (e as CustomEvent).detail; bubbles = e.bubbles; composed = (e as CustomEvent).composed;
  }, { once: true });
  let mc: { maximized: boolean } | null = null;
  el.addEventListener('maximizechange', (e) => (mc = (e as CustomEvent).detail));
  const expand = el.shadowRoot!.querySelector<HTMLElement>('[aria-label="Expand"]')!;
  expand.click();
  await flush();
  expect(intent!.requested).toBe(true);
  expect(bubbles).toBe(true);
  expect(composed).toBe(true);
  expect(mc!.maximized).toBe(true);
});

test('kc-maximize-state on the host flips the artifact button label', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test');
  el.setAttribute('expandable', '');
  document.body.appendChild(el);
  await flush();
  el.dispatchEvent(new CustomEvent('kc-maximize-state', { detail: { maximized: true }, composed: true }));
  await flush();
  expect(el.shadowRoot!.querySelector('[aria-label="Collapse"]')).toBeTruthy();
  el.dispatchEvent(new CustomEvent('kc-maximize-state', { detail: { maximized: false }, composed: true }));
  await flush();
  expect(el.shadowRoot!.querySelector('[aria-label="Expand"]')).toBeTruthy();
});

test('no-* attributes hide affordances; standalone toggles root chrome', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test');
  el.setAttribute('no-nav', '');
  el.setAttribute('no-tabs', '');
  el.setAttribute('standalone', '');
  document.body.appendChild(el);
  await flush();
  const root = el.shadowRoot!;
  expect(root.querySelector('[aria-label="Back"]')).toBeNull();
  expect(root.querySelector('[role="tablist"]')).toBeNull();
  expect(root.querySelector('.rounded-xl')).toBeTruthy(); // standalone chrome
});

test('readonly-path: input readonly + submit emits no navigate', async () => {
  const el = document.createElement('kc-artifact') as HTMLElement;
  el.setAttribute('src', 'https://x.test/a');
  el.setAttribute('readonly-path', '');
  document.body.appendChild(el);
  await flush();
  const navs: string[] = [];
  el.addEventListener('navigate', (e) => navs.push((e as CustomEvent).detail.url));
  const input = el.shadowRoot!.querySelector<HTMLInputElement>('input#kc-artifact-path')!;
  expect(input.readOnly).toBe(true);
  input.value = 'https://x.test/b';
  input.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await flush();
  expect(navs).toEqual([]);
});
