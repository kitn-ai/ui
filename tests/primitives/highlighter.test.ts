import {
  highlight,
  configureCodeHighlighting,
  isCodeHighlightingEnabled,
  __resetCodeHighlightingForTests,
} from '../../src/primitives/highlighter';

afterEach(() => __resetCodeHighlightingForTests());

test('highlights a known language with real markup (JS engine, no WASM)', async () => {
  const html = await highlight('const x = 1', 'tsx', 'github-dark-dimmed');
  expect(html).toContain('<pre');
  expect(html).toContain('<span');
  // Shiki emits inline color styles for tokens
  expect(html).toMatch(/style="[^"]*color/);
});

test('resolves aliases (ts → typescript)', async () => {
  const html = await highlight('let n: number = 2', 'ts', 'github-dark-dimmed');
  expect(html).toContain('<span');
});

test('falls back to escaped plain <pre> for an unregistered language', async () => {
  const html = await highlight('++++.', 'brainfuck', 'github-dark-dimmed');
  expect(html).toBe('<pre><code>++++.</code></pre>');
});

test('escapes HTML in the plain fallback', async () => {
  const html = await highlight('<script>alert(1)</script>', 'brainfuck', 'github-dark-dimmed');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
});

test('when disabled, returns plain text and never builds a highlighter', async () => {
  configureCodeHighlighting({ enabled: false });
  expect(isCodeHighlightingEnabled()).toBe(false);
  const html = await highlight('const x = 1', 'tsx', 'github-dark-dimmed');
  expect(html).toBe('<pre><code>const x = 1</code></pre>');
});

test('consumer can register an additional language loader', async () => {
  configureCodeHighlighting({
    languages: { ruby: () => import('@shikijs/langs/ruby') },
  });
  const html = await highlight('puts "hi"', 'ruby', 'github-dark-dimmed');
  expect(html).toContain('<span');
});

test('unknown theme falls back to the default theme rather than failing', async () => {
  const html = await highlight('const x = 1', 'tsx', 'no-such-theme');
  expect(html).toContain('<span');
});
