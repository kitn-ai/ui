import { afterEach, expect, test, vi } from 'vitest';
import {
  highlight,
  configureCodeHighlighting,
  isCodeHighlightingEnabled,
  __resetCodeHighlightingForTests,
} from '../../src/primitives/highlighter';

afterEach(() => {
  __resetCodeHighlightingForTests();
  vi.restoreAllMocks();
});

test('highlights a known language with real markup (JS engine, no WASM)', async () => {
  const html = await highlight('const x = 1', 'tsx', 'github-dark-dimmed');
  expect(html).toContain('<pre');
  expect(html).toContain('<span');
  // Shiki emits inline color styles for tokens
  expect(html).toMatch(/style="[^"]*color/);
});

test('highlights python with real markup, not the plain fallback', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const code = 'def fib(n: int) -> int:\n    return n';
  const html = await highlight(code, 'python', 'github-dark-dimmed');
  // "not plain" proven, not assumed: a token span and a color style are both
  // absent from every plain `<pre><code>` this file can return.
  expect(html).toContain('<span');
  expect(html).toMatch(/style="[^"]*color/);
  expect(html).not.toBe(`<pre><code>${code}</code></pre>`);
  expect(warn).not.toHaveBeenCalled();
});

test('resolves the py alias to the python grammar', async () => {
  const html = await highlight('def fib(n: int) -> int:\n    return n', 'py', 'github-dark-dimmed');
  expect(html).toContain('<span');
  expect(html).toMatch(/style="[^"]*color/);
});

test('a capitalised language id resolves to the same grammar, not to the fallback', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const html = await highlight('print("hi")', 'Python', 'github-dark-dimmed');
  expect(html).toContain('<span');
  expect(warn).not.toHaveBeenCalled();
});

test('resolves aliases (ts → typescript)', async () => {
  const html = await highlight('let n: number = 2', 'ts', 'github-dark-dimmed');
  expect(html).toContain('<span');
});

// The plain-text half of this case was always right and is kept verbatim. The
// SILENT half was the defect: an unregistered language rendered as escaped plain
// text with nothing anywhere saying it had, which is how `python` went unnoticed.
test('falls back to escaped plain <pre> for an unregistered language, and says so', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const html = await highlight('++++.', 'brainfuck', 'github-dark-dimmed');
  expect(html).toBe('<pre><code>++++.</code></pre>');

  expect(warn).toHaveBeenCalledTimes(1);
  const message = warn.mock.calls[0][0] as string;
  // Names the highlighter, not an element the reader may never have rendered —
  // markdown and message code blocks come through this same function.
  expect(message).toContain('[kai-highlighter]');
  // Names the language...
  expect(message).toContain('"brainfuck"');
  // ...and the exact call that fixes it, so the report is actionable rather than a hint.
  expect(message).toContain(
    "configureCodeHighlighting({ languages: { brainfuck: () => import('@shikijs/langs/brainfuck') } })",
  );
  // The roster is read off the live maps, so it names the newly shipped grammar.
  expect(message).toContain('python');
});

test('reports an unregistered language once, however many blocks ask for it', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await highlight('++++.', 'brainfuck', 'github-dark-dimmed');
  await highlight('++++++++', 'brainfuck', 'github-dark-dimmed');
  await highlight('++++.', 'Brainfuck', 'github-dark-dimmed');
  expect(warn).toHaveBeenCalledTimes(1);
});

test('reports a loader failure with the language, and still falls back to plain text', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  configureCodeHighlighting({
    languages: {
      broken: () => Promise.reject(new Error('grammar chunk 404')),
    },
  });
  const html = await highlight('const x = 1', 'broken', 'github-dark-dimmed');
  expect(html).toBe('<pre><code>const x = 1</code></pre>');
  expect(warn).toHaveBeenCalledTimes(1);
  const message = warn.mock.calls[0][0] as string;
  expect(message).toContain('"broken"');
  expect(message).toContain('grammar chunk 404');
});

test('escapes HTML in the plain fallback', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
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

// The theme half of the same defect class. Substitution was ALWAYS correct here
// (the block still highlights, with `github-dark-dimmed`); what was missing was any
// statement that it happened, which is what leaves a reader staring at the wrong
// colors with nothing to grep for.
test('an unregistered theme substitutes the fallback theme, and says so once', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const html = await highlight('const x = 1', 'tsx', 'no-such-theme');
  // Substituted, not dropped: the block is really highlighted...
  expect(html).toContain('<span');
  expect(html).toMatch(/style="[^"]*color/);
  // ...and byte-for-byte what the fallback theme produces, so "used the fallback"
  // is proven rather than inferred from "not plain". The second call asks for the
  // fallback directly and must add NO report of its own.
  expect(html).toBe(await highlight('const x = 1', 'tsx', 'github-dark-dimmed'));

  expect(warn).toHaveBeenCalledTimes(1);
  const message = warn.mock.calls[0][0] as string;
  // Names the theme asked for, the one used instead, and the fix.
  expect(message).toContain('"no-such-theme"');
  expect(message).toContain('"github-dark-dimmed"');
  expect(message).toContain('[kai-highlighter]');
  expect(message).toContain(
    "configureCodeHighlighting({ themes: { no-such-theme: () => import('@shikijs/themes/no-such-theme') } })",
  );
  // The roster is read off the live map, so it names the shipped themes.
  expect(message).toContain('github-light');
});

test('a theme asked with the wrong case reports the ask, and a fix that would resolve', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await highlight('const x = 1', 'tsx', 'Github-Light');
  const message = warn.mock.calls[0][0] as string;
  // Themes are matched exactly — there is no case-folding rescue as there is for a
  // language, so the report names the spelling that missed...
  expect(message).toContain('"Github-Light"');
  // ...and hands back a call whose KEY is that spelling (what `ensureTheme` looks up
  // next time) and whose SUBPATH is the lowercase one Shiki actually ships.
  expect(message).toContain(
    "configureCodeHighlighting({ themes: { Github-Light: () => import('@shikijs/themes/github-light') } })",
  );
});

test('reports a theme substitution once, however many blocks ask for it', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await highlight('const x = 1', 'tsx', 'no-such-theme');
  await highlight('let y = 2', 'tsx', 'no-such-theme');
  expect(warn).toHaveBeenCalledTimes(1);
});

// The second, worse theme path: nothing resolves, so the block comes out plain.
// Reached when the FALLBACK theme has no loader either, which is what the override
// below produces.
test('a theme that cannot resolve at all renders plain text, and says so once', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  configureCodeHighlighting({
    // The one shape that makes the fallback unresolvable too: `themes` MERGES, so an
    // override can clobber the fallback entry but never delete it.
    themes: { 'github-dark-dimmed': undefined as unknown as () => Promise<unknown> },
  });
  const html = await highlight('const x = 1', 'tsx', 'no-such-theme');
  expect(html).toBe('<pre><code>const x = 1</code></pre>');

  expect(warn).toHaveBeenCalledTimes(1);
  const message = warn.mock.calls[0][0] as string;
  // Names the theme, says plain text is the consequence of THAT...
  expect(message).toContain('"no-such-theme"');
  expect(message).toContain('plain text');
  expect(message).toContain('"github-dark-dimmed"');
  // ...and names the fix, so it is as actionable as the language report.
  expect(message).toContain(
    "configureCodeHighlighting({ themes: { no-such-theme: () => import('@shikijs/themes/no-such-theme') } })",
  );
  // Still DISTINCT from a language that is not registered: the grammar resolved and
  // loaded, so the report must not borrow the language wording.
  expect(message).not.toContain('no grammar registered');
});

test('unknown theme falls back to the default theme rather than failing', async () => {
  // The fallback is now reported too, so this test takes the console the same way
  // every other reporting case in this file does.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const html = await highlight('const x = 1', 'tsx', 'no-such-theme');
  expect(html).toContain('<span');
});

test('falls back without a console to report on', async () => {
  vi.stubGlobal('console', { warn: undefined });
  const html = await highlight('++++.', 'brainfuck', 'github-dark-dimmed');
  expect(html).toBe('<pre><code>++++.</code></pre>');
  vi.unstubAllGlobals();
});
