/**
 * Parity for `<kai-message>`: the same row, built from `message` and built from children.
 *
 * Compared on the FLATTENED outline (see tests/helpers/flattened-outline.ts): a composed body
 * is projected through a slot, so its shadow root cannot equal the preset's byte for byte, but
 * what a reader gets (the speaker-named article, its text, the action bar's controls) must be
 * identical. Scoped to the parts a child can render today: text. Reasoning, tool, source and
 * file parts have no standalone child elements until B3's renderers land, so they are covered
 * on the preset side by the existing message tests and not here.
 */
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/web-components/message/message';
import '../../src/web-components/markdown/markdown';
import { flattenedOutline } from '../helpers/flattened-outline';
import type { KaiMessageElement } from '../../src/web-components/web-component-types';

afterEach(() => document.body.replaceChildren());
const tick = () => new Promise((r) => setTimeout(r, 0));

async function outline(build: () => HTMLElement) {
  const el = build();
  document.body.append(el);
  await customElements.whenDefined('kai-message');
  await tick();
  await tick();
  return flattenedOutline(el);
}

const preset = (role: 'user' | 'assistant', text: string, actions: string[]) => () => {
  const el = document.createElement('kai-message') as KaiMessageElement;
  el.message = { id: 'm', role, parts: [{ type: 'text', text }], actions: actions as never };
  return el;
};
const composed = (role: 'user' | 'assistant', text: string, actions: string[]) => () => {
  const el = document.createElement('kai-message') as KaiMessageElement;
  el.role = role;
  // Same choice the preset makes per role: plain text for a user turn, markdown for an assistant's.
  el.innerHTML = (role === 'user' ? `<span>${text}</span>` : `<kai-markdown content="${text}"></kai-markdown>`) +
    actions.map((a) => `<kai-action id="${a}" label="${a[0].toUpperCase() + a.slice(1)}"></kai-action>`).join(''); // test-authored markup, not model output
  return el;
};

describe('kai-message: message= vs children', () => {
  for (const role of ['user', 'assistant'] as const) {
    it(`${role}: same article, text and action bar`, async () => {
      const a = await outline(preset(role, 'Hello there', ['copy', 'like']));
      document.body.replaceChildren();
      const b = await outline(composed(role, 'Hello there', ['copy', 'like']));
      expect(a.join('\n')).toContain(`article "${role === 'user' ? 'User' : 'Assistant'} message"`);
      expect(a.join('\n')).toContain('Hello there');
      expect(a.filter((l) => /button/.test(l)).length).toBeGreaterThanOrEqual(2);
      // The assistant body is markdown in both, so it carries the same paragraph; the user's is plain.
      expect(b).toEqual(a);
    });
  }

  it('the parity check can fail: a different body is a different outline', async () => {
    const a = await outline(preset('assistant', 'Hello there', ['copy']));
    document.body.replaceChildren();
    const b = await outline(composed('assistant', 'Something else', ['copy']));
    expect(b).not.toEqual(a);
  });
});
