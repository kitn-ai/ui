/**
 * The DEFAULT code theme follows the resolved colour scheme; an explicit `codeTheme` always wins.
 * jsdom has no `light-dark()` cascade, so the inherited `--kai-color-scheme` is stubbed on
 * getComputedStyle (the same seam `src/primitives/color-scheme.test.ts` uses).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@solidjs/testing-library';

const seen: string[] = [];
vi.mock('../../src/primitives/highlighter', () => ({
  isCodeHighlightingEnabled: () => true,
  highlight: async (_code: string, _lang: string, theme: string) => {
    seen.push(theme);
    return `<pre data-theme="${theme}"><code>x</code></pre>`;
  },
}));

import { CodeBlockCode } from '../../src/components/code-block/code-block';
import { ChatConfig } from '../../src/primitives/chat-config';

let knob = '';
const flush = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  knob = '';
  seen.length = 0;
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () => ({ getPropertyValue: (n: string) => (n === '--kai-color-scheme' ? knob : '') }) as unknown as CSSStyleDeclaration,
  );
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { vi.restoreAllMocks(); document.documentElement.className = ''; });

const themeOf = (c: HTMLElement) => c.querySelector('[data-theme]')?.getAttribute('data-theme');

describe('code theme default', () => {
  it('is a light theme in light mode', async () => {
    const { container } = render(() => <CodeBlockCode code="x" language="ts" />);
    await flush();
    expect(themeOf(container)).toBe('github-light');
  });

  it('is the dark theme in dark mode', async () => {
    knob = 'dark';
    const { container } = render(() => <CodeBlockCode code="x" language="ts" />);
    await flush();
    expect(themeOf(container)).toBe('github-dark-dimmed');
  });

  it('switches live when html.dark toggles, without re-highlighting in a loop', async () => {
    const { container } = render(() => <CodeBlockCode code="x" language="ts" />);
    await flush();
    expect(themeOf(container)).toBe('github-light');
    knob = 'dark';
    document.documentElement.className = 'dark';
    await flush();
    expect(themeOf(container)).toBe('github-dark-dimmed');
    expect(seen).toEqual(['github-light', 'github-dark-dimmed']);
  });

  it('an explicit codeTheme wins and a toggle does not switch it', async () => {
    const { container } = render(() => (
      <ChatConfig codeTheme="github-light"><CodeBlockCode code="x" language="ts" /></ChatConfig>
    ));
    await flush();
    knob = 'dark';
    document.documentElement.className = 'dark';
    await flush();
    expect(themeOf(container)).toBe('github-light');
    expect(seen).toEqual(['github-light']);
  });

  it('a per-block theme wins over the scheme', async () => {
    knob = 'dark';
    const { container } = render(() => <CodeBlockCode code="x" language="ts" theme="github-light" />);
    await flush();
    expect(themeOf(container)).toBe('github-light');
  });
});
