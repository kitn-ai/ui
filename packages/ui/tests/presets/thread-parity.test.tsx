/**
 * Parity for `<kai-thread>`: the same conversation from `messages` and from `<kai-message>`
 * children, compared on the flattened outline (log region, speaker-named articles, text,
 * scroll button). The real accessibility tree for the same pair is asserted in Chromium by
 * tests/browser/thread-composed-a11y.browser.test.tsx; this is the jsdom-side structural check.
 * See tests/presets/message-parity.test.tsx for why the shadow roots themselves are not compared.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/web-components/thread/thread';
import '../../src/web-components/message/message';
import '../../src/web-components/markdown/markdown';
import { flattenedOutline } from '../helpers/flattened-outline';

if (!Element.prototype.scrollTo) (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
afterEach(() => document.body.replaceChildren());
const tick = () => new Promise((r) => setTimeout(r, 0));

const CONVO = [
  { role: 'user' as const, text: 'What is Solid?', actions: ['copy'] },
  { role: 'assistant' as const, text: 'A reactive UI library.', actions: ['copy', 'like'] },
];

async function outline(el: HTMLElement) {
  document.body.append(el);
  await customElements.whenDefined('kai-thread');
  await tick();
  await tick();
  return flattenedOutline(el);
}

const data = (loading = false) => {
  const el = document.createElement('kai-thread') as HTMLElement & { messages: unknown; loading: boolean };
  el.messages = CONVO.map((m, i) => ({ id: `m${i}`, role: m.role, parts: [{ type: 'text', text: m.text }], actions: m.actions }));
  el.loading = loading;
  return el;
};
const composed = (loading = false) => {
  const el = document.createElement('kai-thread') as HTMLElement & { loading: boolean };
  el.innerHTML = CONVO.map((m) =>
    `<kai-message role="${m.role}">${m.role === 'user' ? `<span>${m.text}</span>` : `<kai-markdown content="${m.text}"></kai-markdown>`}${m.actions.map((a) => `<kai-action id="${a}" label="${a[0].toUpperCase() + a.slice(1)}"></kai-action>`).join('')}</kai-message>`).join(''); // test-authored markup, not model output
  el.loading = loading;
  return el;
};

describe('kai-thread: messages= vs kai-message children', () => {
  it('flattens to the same outline', async () => {
    const a = await outline(data());
    document.body.replaceChildren();
    const b = await outline(composed());
    expect(a.join('\n')).toContain('log');
    expect(a.join('\n')).toContain('article "Assistant message"');
    expect(b).toEqual(a);
  });

  it('the pending indicator is the same after the last row in both', async () => {
    const a = await outline(data(true));
    document.body.replaceChildren();
    const b = await outline(composed(true));
    expect(b).toEqual(a);
    expect(a.join('\n')).toMatch(/Loading/i);
  });

  it('the parity check can fail: a missing row is a different outline', async () => {
    const a = await outline(data());
    document.body.replaceChildren();
    const c = composed();
    c.firstElementChild!.remove();
    expect(await outline(c)).not.toEqual(a);
  });
});
