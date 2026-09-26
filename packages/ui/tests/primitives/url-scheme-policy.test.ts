// tests/primitives/url-scheme-policy.test.ts
//
// The kit's scheme policies are the ONE place a URL decision is made, so each
// predicate is pinned here rather than only at its sinks. Three questions, three
// answers, and the differences are the point:
//
//   isSafeUrl       -> "may this be an href or go to window.open?" http(s)/mailto,
//                      resolved against a base so a relative markdown link passes.
//   isScriptUrl     -> "would navigating RUN this as script in the host origin?"
//                      javascript:/vbscript: only, the iframe question.
//   isSafeImageSrc  -> "can this be an <img src>?" Wider on one axis (a data: image
//                      is legitimate) and narrower on another (only data:image/,
//                      because the media type there can be model-supplied), and it
//                      must NOT resolve a bare word against a base: at the icon sink
//                      a bare word is an icon NAME, and resolving it made every
//                      typo'd icon paint as an <img>.
import { describe, expect, it } from 'vitest';
import { isSafeUrl, isSafeImageSrc, isScriptUrl } from '../../src/primitives/url-scheme-policy';

describe('isSafeUrl (href / window.open)', () => {
  it('allows http(s), mailto and anything relative (resolved against a base)', () => {
    for (const url of ['https://kitn.ai', 'http://x.test/a', 'mailto:a@b.test', '/docs', './rel', '#frag', 'docs/report.pdf']) {
      expect(isSafeUrl(url), url).toBe(true);
    }
  });

  it('refuses javascript:, vbscript: and data:', () => {
    for (const url of ['javascript:alert(1)', 'vbscript:msgbox(1)', 'data:text/html,<script>1</script>']) {
      expect(isSafeUrl(url), url).toBe(false);
    }
  });

  it('refuses a scheme the parser only sees after normalisation', () => {
    // The reason this module parses instead of matching a regex: the WHATWG parser
    // strips embedded tabs/newlines and trims, so these ARE javascript:.
    for (const url of ['java\nscript:alert(1)', '  javascript:alert(1)  ', 'jav\tascript:alert(1)']) {
      expect(isSafeUrl(url), JSON.stringify(url)).toBe(false);
    }
  });

  it('refuses an empty string (it would resolve against the base and inherit http:)', () => {
    expect(isSafeUrl('')).toBe(false);
  });
});

describe('isScriptUrl (iframe src)', () => {
  it('is true only for the two schemes that run in the EMBEDDER origin', () => {
    expect(isScriptUrl('javascript:alert(1)')).toBe(true);
    expect(isScriptUrl('vbscript:msgbox(1)')).toBe(true);
    // The documented allowances: a data: blob artifact and a blob: url are legitimate
    // iframe sources and get an opaque origin, so this must NOT be !isSafeUrl.
    expect(isScriptUrl('data:text/html,<b>x</b>')).toBe(false);
    expect(isScriptUrl('blob:https://x.test/abc')).toBe(false);
    expect(isScriptUrl('https://x.test')).toBe(false);
  });
});

describe('isSafeImageSrc (img src)', () => {
  it('allows absolute urls, inline images, blobs and relative PATHS', () => {
    for (const url of [
      'https://x.test/a.png', 'http://x.test/a.png', 'blob:https://x.test/abc',
      'data:image/svg+xml,<svg/>', 'data:image/png;base64,AAA', '/a.png', './a.png', '../a.png',
    ]) {
      expect(isSafeImageSrc(url), url).toBe(true);
    }
  });

  it('refuses a bare word, because at the icon sink a bare word is a NAME', () => {
    // The regression this pins: `schemeOf` resolves against a base, so
    // 'definitely-not-an-icon' parses as a relative url with protocol http: and the
    // first cut of this returned true. renderIcon then painted every typo'd icon as an
    // <img> and stopped reporting it, which the icon suite caught.
    for (const name of ['definitely-not-an-icon', 'send', 'CircleAlert']) {
      expect(isSafeImageSrc(name), name).toBe(false);
    }
  });

  it('refuses script schemes, and data: that is not an image', () => {
    for (const url of [
      'javascript:alert(1)', 'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>', 'data:application/pdf;base64,AAA',
    ]) {
      expect(isSafeImageSrc(url), url).toBe(false);
    }
  });

  it('refuses a scheme hidden behind whitespace, same as isSafeUrl', () => {
    expect(isSafeImageSrc('  javascript:alert(1)')).toBe(false);
    expect(isSafeImageSrc('java\nscript:alert(1)')).toBe(false);
  });
});
