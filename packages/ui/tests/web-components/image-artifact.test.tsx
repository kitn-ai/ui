/**
 * `<kai-image-artifact>` — the AI-PAYLOAD element: bare base64 or raw bytes plus
 * the media type that says what those bytes are.
 *
 * WHY THIS FILE EXISTS. This element exists because the old `kai-image` defaulted
 * `mediaType` to `image/png` SILENTLY, so a JPEG's base64 was labelled a PNG on
 * every surface that read the built data URI. The media type is now required and
 * its absence is reported, and BOTH input spellings (the `data` attribute for a
 * base64 string, the `data` property for bytes) have to reach the DOM — neither is
 * visible from the other, so each path gets its own assertion. jsdom implements
 * neither `URL.createObjectURL` nor `URL.revokeObjectURL`, so the bytes path is
 * exercised against stubs of exactly those two.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import '../../src/web-components/image/image-artifact';

const URL_KEYS = URL as unknown as Record<string, unknown>;
const realCreateObjectURL = URL_KEYS.createObjectURL;
const realRevokeObjectURL = URL_KEYS.revokeObjectURL;

let lastBlob: Blob | undefined;
const createObjectURL = vi.fn((blob: Blob) => {
  lastBlob = blob;
  return 'blob:kai-image-artifact-test';
});

beforeEach(() => {
  lastBlob = undefined;
  createObjectURL.mockClear();
  URL_KEYS.createObjectURL = createObjectURL;
  // Called from the Solid component's onCleanup when an object URL is dropped;
  // jsdom has no implementation, so an unstubbed call throws on teardown.
  URL_KEYS.revokeObjectURL = vi.fn();
});

afterEach(() => {
  if (realCreateObjectURL === undefined) delete URL_KEYS.createObjectURL;
  else URL_KEYS.createObjectURL = realCreateObjectURL;
  if (realRevokeObjectURL === undefined) delete URL_KEYS.revokeObjectURL;
  else URL_KEYS.revokeObjectURL = realRevokeObjectURL;
  document.body.replaceChildren();
});

/** Past a macrotask, several times: the facade mounts its Solid render a task
 *  after connect, not during it. */
const flush = async (turns = 3) => {
  for (let i = 0; i < turns; i++) await new Promise((r) => setTimeout(r, 0));
};

type ArtifactElement = HTMLElement & { data?: string | Uint8Array };

async function mount(
  attrs: Record<string, string>,
  data?: Uint8Array,
): Promise<ArtifactElement> {
  const el = document.createElement('kai-image-artifact') as ArtifactElement;
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  // Property, not attribute: the bytes path is JS-only in this kit.
  if (data) el.data = data;
  document.body.appendChild(el);
  await flush();
  return el;
}

const img = (el: Element) => el.shadowRoot!.querySelector('img');

test('builds a data URI from the data attribute and media-type', async () => {
  const el = await mount(
    { data: 'iVBORw0KGgo=', 'media-type': 'image/png', alt: 'A chart' },
  );

  const rendered = img(el);
  expect(rendered).not.toBeNull();
  expect(rendered!.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=');
  expect(rendered!.getAttribute('alt')).toBe('A chart');
});

test('builds an object URL from the data property (bytes), typed by media-type', async () => {
  const el = await mount({ 'media-type': 'image/jpeg' }, new Uint8Array([1, 2, 3]));

  const rendered = img(el);
  expect(rendered).not.toBeNull();
  expect(rendered!.getAttribute('src')!.startsWith('blob:')).toBe(true);
  // The bytes went through `new Blob([...], { type })`, so the media type is what
  // the object URL resolves as — the defect was labelling these bytes image/png.
  expect(lastBlob?.type).toBe('image/jpeg');
});

test('renders the skeleton and no <img> when there is no data', async () => {
  const el = await mount({ 'media-type': 'image/png', alt: 'Pending chart' });

  expect(img(el)).toBeNull();
  expect(el.shadowRoot!.querySelector('[part="skeleton"]')).not.toBeNull();
});

test('warns and renders no <img> when media-type is missing', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const el = await mount({ data: 'iVBORw0KGgo=', alt: 'A chart' });

    expect(img(el)).toBeNull();
    const said = warn.mock.calls.map((call) => call.map(String).join(' ')).join('\n');
    expect(said).toMatch(/media.?type|mime/i);
  } finally {
    warn.mockRestore();
  }
});
