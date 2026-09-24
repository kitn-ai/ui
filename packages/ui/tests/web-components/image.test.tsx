/**
 * `<kai-image>` — the image RESOURCE element: an image already at a URL.
 *
 * WHY THIS FILE EXISTS. `kai-image` used to be the AI-payload renderer (base64 /
 * bytes) with no URL support at all; it now takes `src`, and the payload half
 * moved to `<kai-image-artifact>`. A facade that stops forwarding a prop renders
 * either nothing or an empty `<img>`, which looks the same as an image that has
 * not painted — so every assertion below names the DOM a consumer sees, through
 * the real element rather than a Solid fixture.
 */
import { afterEach, expect, test } from 'vitest';
import '../../src/web-components/image/image';

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Past a macrotask, several times: the facade mounts its Solid render a task
 * after connect, not during it.
 */
const flush = async (turns = 3) => {
  for (let i = 0; i < turns; i++) await new Promise((r) => setTimeout(r, 0));
};

async function mount(attrs: Record<string, string>): Promise<HTMLElement> {
  const el = document.createElement('kai-image');
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.appendChild(el);
  await flush();
  return el;
}

test('renders an <img> at the src attribute', async () => {
  const el = await mount({ src: 'https://example.com/cat.png', alt: 'A cat' });

  const img = el.shadowRoot!.querySelector('img');
  expect(img).not.toBeNull();
  expect(img!.getAttribute('src')).toBe('https://example.com/cat.png');
});

test('forwards alt onto the <img>', async () => {
  const el = await mount({ src: 'https://example.com/cat.png', alt: 'A ginger cat on a keyboard' });

  expect(el.shadowRoot!.querySelector('img')!.getAttribute('alt')).toBe('A ginger cat on a keyboard');
});

test('passes a data: URI through untouched — a resource, not a payload', async () => {
  const dataUri = 'data:image/svg+xml;base64,PHN2Zy8+';
  const el = await mount({ src: dataUri, alt: 'Inline icon' });

  // Untouched, not re-encoded: the element must not wrap a source it was handed.
  expect(el.shadowRoot!.querySelector('img')!.getAttribute('src')).toBe(dataUri);
});
