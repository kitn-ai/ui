/**
 * `<kai-thread>`'s `density` axis: the element the assistant block renders (that
 * block composes `kai-thread` + `kai-prompt-input` by hand, so the element — not
 * `<kai-chat>` — is where its spacing has to be reachable).
 *
 * The assertions are on the SHADOW-ROOT class attributes, i.e. the classes a consumer
 * cannot reach and therefore the thing the prop exists to move. Without the
 * pass-through in `thread.tsx`, `density="compact"` would be a declared, documented,
 * observed property that changes nothing on screen — which is what this file rules out.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import './thread';
import type { KaiThreadElement } from '../web-component-types';

// The generated `KaiThreadElement` learns `density` only when the API generator runs
// (`build:api`), and a generated artifact is not hand-edited — so the extra member is
// intersected in here rather than compiled against a stale declaration.
type DensityThreadElement = KaiThreadElement & { density?: string };

// jsdom doesn't implement Element.scrollTo; mounting a real <kai-thread> calls it via
// the stick-to-bottom primitive on a requestAnimationFrame. Same shim as
// thread-cards.declarative.test.tsx.
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};

afterEach(() => {
  document.querySelectorAll('kai-thread').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

/** The message band and the list's content column, inside the shadow root. */
async function mount(set: (el: DensityThreadElement) => void) {
  const el = document.createElement('kai-thread') as DensityThreadElement;
  set(el);
  document.body.append(el);
  await customElements.whenDefined('kai-thread');
  await new Promise((r) => setTimeout(r, 0));
  const root = el.shadowRoot!;
  return {
    el,
    band: () => root.querySelector('[role="log"]')?.getAttribute('class'),
    column: () => root.querySelector('[role="log"]')?.firstElementChild?.getAttribute('class'),
  };
}

describe('<kai-thread> density axis', () => {
  it('defaults to the shipped box', async () => {
    const t = await mount(() => {});
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-4 py-3');
    expect(t.column()).toBe('flex flex-col mx-auto w-full max-w-3xl min-h-full space-y-4');
    // The property reads back the registered default rather than `undefined` (an
    // attribute-declared prop has to be readable as well as settable).
    expect(t.el.density).toBe('default');
  });

  it('takes the tighter set from the ATTRIBUTE', async () => {
    // The HTML-author path: a scalar string, so `density="compact"` is legal markup.
    const t = await mount((el) => el.setAttribute('density', 'compact'));
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-3 py-2');
    expect(t.column()).toBe('flex flex-col mx-auto w-full max-w-3xl min-h-full space-y-2');
  });

  it('takes the tighter set from the JS PROPERTY', async () => {
    const t = await mount((el) => (el.density = 'compact'));
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-3 py-2');
    expect(t.column()).toBe('flex flex-col mx-auto w-full max-w-3xl min-h-full space-y-2');
  });

  it('falls back to `default`, loudly, for an unknown attribute value', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = await mount((el) => el.setAttribute('density', 'cosy'));
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-4 py-3');
    expect(t.column()).toBe('flex flex-col mx-auto w-full max-w-3xl min-h-full space-y-4');
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('cosy');
  });
});
