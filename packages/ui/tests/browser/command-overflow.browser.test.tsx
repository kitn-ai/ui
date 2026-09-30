import { describe, expect, it, afterEach } from 'vitest';
import '../../src/web-components/command/command';

/**
 * A row whose label is longer than the palette must truncate inside it. jsdom has no layout,
 * so the claim (no horizontal scroll in the results, the label ends inside the panel) is only
 * settled in a browser.
 */
afterEach(() => document.body.replaceChildren());
const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));

const mount = async () => {
  document.body.innerHTML = '<div style="width:470px"><kai-command id="c"></kai-command></div>'; // test-authored markup
  const cmd = document.getElementById('c') as HTMLElement & { items: unknown };
  await customElements.whenDefined('kai-command');
  cmd.items = [
    { id: 'a', label: 'Streaming reasoning parts into the thread without any flicker or layout shift at all', description: 'Assistant UI' },
    { id: 'b', label: 'Short', description: 'Recents' },
  ];
  await tick();
  return cmd;
};

describe('kai-command long labels', () => {
  it('truncate inside the panel instead of overflowing it', async () => {
    const cmd = await mount();
    const scroller = cmd.shadowRoot!.querySelector('[role="listbox"]')!.parentElement as HTMLElement;
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    const option = cmd.shadowRoot!.querySelector('[role="option"]') as HTMLElement;
    const label = option.querySelector('span.font-medium') as HTMLElement;
    expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(option.getBoundingClientRect().right);
    // The label gives way first: a short description is never clipped itself.
    const desc = label.nextElementSibling as HTMLElement;
    expect(desc.textContent).toBe('Assistant UI');
    expect(desc.scrollWidth).toBeLessThanOrEqual(desc.clientWidth);
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
  });
});

describe('kai-command search focus', () => {
  it('shows a rounded ring on the wrapper, not the square base outline on the input', async () => {
    const cmd = await mount();
    const input = cmd.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.focus();
    await tick();
    expect(getComputedStyle(input).outlineStyle).toBe('none');
    const wrapper = input.parentElement as HTMLElement;
    expect(parseFloat(getComputedStyle(wrapper).borderTopLeftRadius)).toBeGreaterThan(0);
    expect(getComputedStyle(wrapper).boxShadow).not.toBe('none');
  });
});
