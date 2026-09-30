/**
 * Removing an attribute must undo what setting it did, on every facade.
 *
 * component-register's attributeChangedCallback answers a removal with
 * `this[prop] = null` (scalars) or `undefined` (parsed props), never the declared
 * default, and for a bare boolean the prop was `undefined` before and after, so
 * nothing notified and `flag()` read the old attribute state. Both are pinned here
 * on a synthetic element and on two shipped facades.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { defineWebComponent } from '../../src/web-components/define/define';
import '../../src/web-components/prompt/prompt-dock';
import '../../src/web-components/prompt/prompt-suggestions';

afterEach(() => { document.body.innerHTML = ''; });
const tick = () => new Promise((r) => setTimeout(r, 0));

defineWebComponent<{ label?: string; loud?: boolean }>(
  'kai-test-removal',
  { label: 'default', loud: undefined },
  (props, { flag }) => (
    <span data-loud={flag('loud') ? 'yes' : 'no'}>{props.label}</span>
  ),
);

const mount = (html: string) => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement & Record<string, unknown>;
};

describe('attribute removal', () => {
  it('resets a scalar prop to its declared default', async () => {
    const el = mount('<kai-test-removal label="custom"></kai-test-removal>');
    await tick();
    expect(el.shadowRoot!.textContent).toContain('custom');
    el.removeAttribute('label');
    await tick();
    expect(el.label).toBe('default');
    expect(el.shadowRoot!.textContent).toContain('default');
  });

  it('a bare boolean attribute turns flag() on when added and off when removed', async () => {
    const el = mount('<kai-test-removal></kai-test-removal>');
    await tick();
    const loud = () => el.shadowRoot!.querySelector('span')!.getAttribute('data-loud');
    expect(loud()).toBe('no');
    el.setAttribute('loud', '');
    await tick();
    expect(loud()).toBe('yes');
    el.removeAttribute('loud');
    await tick();
    expect(loud()).toBe('no');
  });

  it('holds on kai-prompt-dock: frame returns to its default', async () => {
    const el = mount('<kai-prompt-dock frame="none"><div>in</div></kai-prompt-dock>');
    await tick();
    expect(el.frame).toBe('none');
    el.removeAttribute('frame');
    await tick();
    expect(el.frame).toBe('inset');
  });

  it('holds on kai-suggestions: a bare block attribute is undone by removal', async () => {
    const el = mount('<kai-suggestions block></kai-suggestions>');
    await tick();
    const cls = () => el.shadowRoot!.querySelector('[class*="gap-"]')!.className;
    expect(cls()).toContain('flex-col');
    el.removeAttribute('block');
    await tick();
    expect(cls()).not.toContain('flex-col');
  });
});

describe('kai-prompt-dock top-open through attributes', () => {
  const band = (el: HTMLElement) => el.shadowRoot!.querySelector('[data-dock-band="top"]') as HTMLElement;

  it('a bare attribute opens the band even with no child, removal returns to occupancy', async () => {
    const el = mount('<kai-prompt-dock><div>in</div></kai-prompt-dock>');
    await tick();
    expect(band(el).dataset.state).toBe('closed');
    el.setAttribute('top-open', '');
    await tick();
    expect(band(el).dataset.state).toBe('open');
    el.removeAttribute('top-open');
    await tick();
    expect(band(el).dataset.state).toBe('closed');
  });

  it('removal with a child still slotted goes back to occupancy (open)', async () => {
    const el = mount('<kai-prompt-dock top-open="false"><div slot="top">note</div><div>in</div></kai-prompt-dock>');
    await tick();
    expect(band(el).dataset.state).toBe('closed');
    el.removeAttribute('top-open');
    await tick();
    await tick();
    expect(el.topOpen).toBeUndefined();
    expect(band(el).dataset.state).toBe('open');
  });

  it('bare then removed with a child keeps occupancy mode open; top-open="false" then removed is not stale-closed', async () => {
    const el = mount('<kai-prompt-dock top-open><div slot="top">note</div><div>in</div></kai-prompt-dock>');
    await tick();
    expect(band(el).dataset.state).toBe('open');
    el.setAttribute('top-open', 'false');
    await tick();
    expect(band(el).dataset.state).toBe('closed');
    el.removeAttribute('top-open');
    await tick();
    await tick();
    expect(band(el).dataset.state).toBe('open');
  });
});
