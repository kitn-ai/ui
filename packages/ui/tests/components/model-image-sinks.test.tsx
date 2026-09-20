// tests/components/model-image-sinks.test.tsx
//
// A DECISION, PINNED. Model-supplied image urls (a choice option's media image, a link
// card's image and favicon, an embed's poster, the kit's own `data:<mediaType>` builder)
// are NOT scheme-filtered. That is deliberate, and SECURITY.md files the residual under
// "Decisions your app owns":
//
//   - There is no script sink to close. An `<img src>` does not navigate and does not
//     execute a scheme: `javascript:` in `src` is inert, and SVG in an `<img>` is
//     non-scripted and cannot load external resources.
//   - The legitimate case here IS a `data:` image (`data:image/svg+xml`,
//     `image.tsx`'s `data:<mediaType>;base64,`), which any navigable-url allowlist
//     refuses. So the guard for these sinks is not `isSafeUrl`.
//   - The residual is real and is the CONSUMER's call: a model can force the reader's
//     browser to issue an outbound GET (tracking pixel, referrer leak) with no user
//     action, and can choose an arbitrarily large image. Handling that belongs where
//     the app owns the request (CSP `img-src`, an image proxy, or filtering the
//     envelope) - adding a sixth policy inside the kit would decide it for them.
//
// WHAT THESE TESTS ASSERT, therefore, is the current behaviour and its inertness, not
// an absence: the value ARRIVES (so a future filter is a visible decision that fails
// here and has to be argued for), no element gains a script-capable attribute, and the
// render is not vacuous (the label, title or play affordance is still there). A test
// asserting "no img carries a script scheme" would demand a filter we decided not to
// add, and would be red today - which is the trap this file exists to avoid.
import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import { ChoiceCard } from '../../src/components/choice-card/choice-card';
import { LinkPreview } from '../../src/components/link-preview/link-preview';
import { Embed } from '../../src/components/embed/embed';
import { Image } from '../../src/components/image/image';

afterEach(() => {
  document.body.innerHTML = '';
});

/** No element anywhere in the tree may carry a script-capable attribute. */
function expectNoHandlerAttributes(container: HTMLElement) {
  for (const el of container.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      expect(attr.name.toLowerCase().startsWith('on'), `${el.tagName} carries ${attr.name}`).toBe(false);
    }
  }
}

const HOSTILE_IMAGE = 'javascript:window.__PWNED__=1';
const SVG_DATA = 'data:image/svg+xml,<svg onload="window.__PWNED__=2"></svg>';

describe('model image urls: the value passes through, inertly', () => {
  it('a choice option image reaches <img src> and the label still renders', () => {
    const { container } = render(() => (
      <ChoiceCard
        cardId="c1"
        heading="Pick one"
        data={{ options: [{ id: 'a', label: 'Option A', media: { image: HOSTILE_IMAGE } }] }}
      />
    ));
    // The label is the non-vacuous half: the card rendered its content.
    expect(container.textContent).toContain('Option A');
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe(HOSTILE_IMAGE);
    expectNoHandlerAttributes(container);
  });

  it('a link card image and favicon reach <img src>, and the real href still renders', () => {
    const { container } = render(() => (
      <LinkPreview
        cardId="c1"
        data={{ url: 'https://ex.test/page', title: 'A page', image: HOSTILE_IMAGE, favicon: HOSTILE_IMAGE }}
      />
    ));
    // Non-vacuous control: the SAFE url still produced an anchor, so a filter added
    // later cannot pass this file by rendering nothing.
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://ex.test/page');
    const srcs = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(srcs).toContain(HOSTILE_IMAGE);
    expectNoHandlerAttributes(container);
  });

  it('an embed poster reaches <img src>, and the play affordance still renders', () => {
    const { container } = render(() => (
      <Embed cardId="c1" data={{ provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'A video', poster: HOSTILE_IMAGE }} />
    ));
    expect(container.querySelector('button')).toBeTruthy(); // the play control
    expect(container.querySelector('img')?.getAttribute('src')).toBe(HOSTILE_IMAGE);
    expectNoHandlerAttributes(container);
  });

  it('the kit’s own data: builder passes its media type through, inertly', () => {
    const { container } = render(() => <Image base64="AAAA" mediaType="text/html" alt="x" />);
    // `data:text/html,...` in an <img> renders nothing and executes nothing; the
    // attribute is present exactly as built.
    expect(container.querySelector('img')?.getAttribute('src')).toBe('data:text/html;base64,AAAA');
    expectNoHandlerAttributes(container);
  });

  it('the case these sinks exist for still works: a data:image renders as an <img>', () => {
    const { container } = render(() => <Image base64="AAAA" mediaType="image/svg+xml" alt="icon" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/svg+xml;base64,AAAA');
    // And an inline SVG icon url is accepted by the image predicate the icon sink uses,
    // which is the reason a navigable-url allowlist was the wrong tool here.
    const { container: c2 } = render(() => <Image base64="AAAA" mediaType="image/png" alt="png" />);
    expect(c2.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('an svg data url carrying a handler reaches src and does NOT become a live element', () => {
    const { container } = render(() => (
      <Image base64="PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj48L3N2Zz4=" mediaType={SVG_DATA.slice('data:'.length)} alt="x" />
    ));
    // Whatever the media type string is, this renders ONE <img>: there is no HTML parse
    // step and no innerHTML write, so nothing in the value can become an element.
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('svg')).toBeNull();
    expectNoHandlerAttributes(container);
  });
});
