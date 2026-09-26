/**
 * `<kai-chat>`'s `density` axis: the pass-through from the element's property/attribute
 * down to the `ChatThread` it renders. The component-level behavior (which classes each
 * value produces, and the loud fallback) is pinned in
 * `src/components/chat/chat-thread.test.tsx`; what this file rules out is the element
 * declaring and documenting a `density` that never reaches the thread — i.e. a prop that
 * looks wired and changes nothing.
 *
 * `<kai-chat>` is the batteries-included surface, so its density covers the message band,
 * the gap AND the composer band, which is the whole owner-facing scenario.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import './chat';
import type { KaiChatElement } from '../web-component-types';

// jsdom doesn't implement Element.scrollTo; mounting a real <kai-chat> calls it via the
// stick-to-bottom primitive on a requestAnimationFrame. Same shim as
// card-schemas.declarative.test.tsx.
if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};

afterEach(() => {
  document.querySelectorAll('kai-chat').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

// The generated `KaiChatElement` learns `density` only when the API generator runs
// (`build:api`), and a generated artifact is not hand-edited — so the extra member is
// intersected in here rather than compiled against a stale declaration.
type DensityChatElement = KaiChatElement & { density?: string };

async function mount(set: (el: DensityChatElement) => void) {
  const el = document.createElement('kai-chat') as DensityChatElement;
  set(el);
  document.body.append(el);
  await customElements.whenDefined('kai-chat');
  await new Promise((r) => setTimeout(r, 0));
  const root = el.shadowRoot!;
  const composerBand = () =>
    (root.querySelector('[data-kai-composer-editable]') as HTMLElement | null)?.closest('.shrink-0');
  return {
    el,
    band: () => root.querySelector('[role="log"]')?.getAttribute('class'),
    column: () => root.querySelector('[role="log"]')?.firstElementChild?.getAttribute('class'),
    composer: () => composerBand()?.getAttribute('class'),
  };
}

describe('<kai-chat> density axis', () => {
  it('defaults to the shipped box', async () => {
    const t = await mount(() => {});
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-4 py-3');
    expect(t.column()).toBe('flex flex-col mx-auto w-full max-w-3xl space-y-4');
    expect(t.composer()).toBe('shrink-0 px-4 pb-4');
    expect(t.el.density).toBe('default');
  });

  it('takes the tighter band, gap and composer padding from the ATTRIBUTE', async () => {
    const t = await mount((el) => el.setAttribute('density', 'compact'));
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-3 py-2');
    expect(t.column()).toBe('flex flex-col mx-auto w-full max-w-3xl space-y-2');
    expect(t.composer()).toBe('shrink-0 px-3 pb-3');
  });

  it('takes the tighter set from the JS PROPERTY', async () => {
    const t = await mount((el) => (el.density = 'compact'));
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-3 py-2');
    expect(t.composer()).toBe('shrink-0 px-3 pb-3');
  });

  it('falls back to `default`, loudly, for an unknown attribute value', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = await mount((el) => el.setAttribute('density', 'cosy'));
    expect(t.band()).toBe('flex flex-col overflow-y-auto kai-focus-inset h-full px-4 py-3');
    expect(t.composer()).toBe('shrink-0 px-4 pb-4');
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('cosy');
  });
});
