// Real-Chromium pin for `kai-artifact`'s `urlSafe` state.
//
// WHY THIS EXISTS. `el.url` and `kai-history-change.detail.url` are the RAW url, deliberately: a
// path field must show what was refused. A composed toolbar that writes `<a href={el.url}>` would
// therefore hand a model-steered `javascript:` to the host page, one click from running in the
// host origin. `urlSafe` is the answer the element gives so the consumer does not write a third
// scheme policy: it is `isSafeUrl` on the current url, the SAME predicate `canOpenInTab` uses.
// jsdom parses urls with a different implementation than the browser, and the newline/tab/case
// variants are exactly where parsers disagree, so this runs in Chromium.
import { afterEach, describe, expect, it } from 'vitest';
import '../../src/web-components/artifact/artifact';

type ArtifactEl = HTMLElement & {
  url: string;
  urlSafe: boolean;
  navigate(u: string): void;
};

const mount = async (src?: string) => {
  const el = document.createElement('kai-artifact') as unknown as ArtifactEl;
  if (src) el.setAttribute('src', src);
  document.body.appendChild(el);
  await new Promise((r) => setTimeout(r, 50));
  return el;
};

afterEach(() => {
  document.body.innerHTML = '';
});

const HOSTILE = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'java\nscript:alert(1)',
  'java\tscript:alert(1)',
  '  javascript:alert(1)',
  'vbscript:msgbox(1)',
  'VBScript:msgbox(1)',
  'vb\nscript:msgbox(1)',
  'data:text/html,<script>alert(1)</script>',
];

describe('kai-artifact urlSafe', () => {
  it('is true for https and stays true for a relative path', async () => {
    const el = await mount('https://example.com/a');
    expect(el.urlSafe).toBe(true);
    el.navigate('docs/report.pdf');
    expect(el.urlSafe).toBe(true);
  });

  for (const hostile of HOSTILE) {
    it(`is false for ${JSON.stringify(hostile)} while url still reports what arrived`, async () => {
      const el = await mount('https://example.com/a');
      const events: Array<{ url: string; urlSafe: boolean }> = [];
      el.addEventListener('kai-history-change', (e) => events.push((e as CustomEvent).detail));
      el.navigate(hostile);
      expect(el.urlSafe).toBe(false);
      expect(el.url).toBe(hostile); // raw on purpose: a path field shows what was refused
      expect(events.at(-1)).toMatchObject({ url: hostile, urlSafe: false });
    });
  }

  it('is false with no url at all (nothing to navigate to)', async () => {
    const el = await mount();
    expect(el.urlSafe).toBe(false);
  });

  it('returns the real url, not displayUrl (documented masking bypass)', async () => {
    const el = await mount('https://example.com/real');
    el.setAttribute('display-url', 'clean');
    await new Promise((r) => setTimeout(r, 30));
    expect(el.url).toBe('https://example.com/real');
  });
});
