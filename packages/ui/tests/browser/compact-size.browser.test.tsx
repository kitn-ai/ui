// Real-Chromium measurement of the `xs` size: the one height a 28px toolbar row can hold.
//
// jsdom has no layout, so a class string proves nothing about pixels. This measures the
// rendered host box for every size of `kai-input` and `kai-segmented` next to a `kai-button`
// `icon-sm`, so "xs matches the button" is a measurement and not a claim, and `sm` / `md` are
// pinned at their existing heights (redefining them would move every existing layout).
import { afterEach, describe, expect, it } from 'vitest';
import '../../src/web-components/input/input';
import '../../src/web-components/segmented/segmented';
import '../../src/web-components/button/button';

const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));
afterEach(() => { document.body.innerHTML = ''; });

async function height(html: string, setup?: (el: HTMLElement) => void): Promise<number> {
  const host = document.createElement('div');
  host.style.cssText = 'width:320px;display:flex;align-items:flex-start';
  host.innerHTML = html;
  document.body.append(host);
  setup?.(host.firstElementChild as HTMLElement);
  await tick();
  return host.firstElementChild!.getBoundingClientRect().height;
}

const OPTIONS = [{ value: 'a', label: 'Preview', icon: 'eye' }, { value: 'b', label: 'Code', icon: 'code' }];
const seg = (el: HTMLElement) => { (el as HTMLElement & { options: unknown }).options = OPTIONS; (el as HTMLElement & { value: string }).value = 'a'; };

describe('heights', () => {
  it('kai-button icon-sm is the 28px reference', async () => {
    expect(await height('<kai-button size="icon-sm" icon="home" label="Home"></kai-button>')).toBe(28);
  });

  it('kai-input keeps md 38 and sm 30, and xs is 28', async () => {
    expect(await height('<kai-input aria-label="x"></kai-input>')).toBe(38);
    expect(await height('<kai-input size="sm" aria-label="x"></kai-input>')).toBe(30);
    expect(await height('<kai-input size="xs" aria-label="x"></kai-input>')).toBe(28);
  });

  it('kai-input xs stays 28 with a leading affix (the row layout) and with a value', async () => {
    expect(await height('<kai-input size="xs" aria-label="x"><span slot="leading">@</span></kai-input>')).toBe(28);
    expect(await height('<kai-input size="xs" value="https://example.com/a/b" readonly aria-label="x"></kai-input>')).toBe(28);
  });

  it('kai-segmented keeps md 36 and sm 32, and xs is 28', async () => {
    expect(await height('<kai-segmented></kai-segmented>', seg)).toBe(36);
    expect(await height('<kai-segmented size="sm"></kai-segmented>', seg)).toBe(32);
    expect(await height('<kai-segmented size="xs"></kai-segmented>', seg)).toBe(28);
  });

  it('kai-segmented xs segments are 24px', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<kai-segmented size="xs"></kai-segmented>';
    document.body.append(host);
    seg(host.firstElementChild as HTMLElement);
    await tick();
    const segs = [...(host.firstElementChild as HTMLElement).shadowRoot!.querySelectorAll('button')];
    expect(segs.length).toBe(2);
    for (const b of segs) expect(b.getBoundingClientRect().height).toBe(24);
  });

  it('a 28px row of kit parts stays 28px tall', async () => {
    const host = document.createElement('div');
    host.style.cssText = 'display:flex;align-items:center;gap:6px;width:600px';
    host.innerHTML =
      '<kai-button size="icon-sm" icon="arrow-left" label="Back"></kai-button>' +
      '<kai-input size="xs" readonly aria-label="Address" style="flex:1"></kai-input>' +
      '<kai-segmented size="xs"></kai-segmented>' +
      '<kai-button size="icon-sm" icon="external-link" label="Open"></kai-button>';
    document.body.append(host);
    seg(host.children[2] as HTMLElement);
    await tick();
    expect(host.getBoundingClientRect().height).toBe(28);
  });
});
