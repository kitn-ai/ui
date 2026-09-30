/** `<kai-message>` composed mode: a bare text node child is the body, rendered as text. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import './message';
import '../markdown/markdown';
import type { KaiMessageElement } from '../web-component-types';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount(inner: string, set?: (el: KaiMessageElement) => void) {
  const host = document.createElement('div');
  host.innerHTML = `<kai-message>${inner}</kai-message>`; // test-authored markup, not model output
  const el = host.firstElementChild as KaiMessageElement;
  set?.(el);
  document.body.append(el);
  await customElements.whenDefined('kai-message');
  await tick();
  await tick();
  const root = el.shadowRoot!;
  return {
    el,
    root,
    row: () => root.querySelector('[part="row"]') as HTMLElement | null,
    defaultSlot: () => root.querySelector('slot:not([name])') as HTMLSlotElement | null,
  };
}

describe('<kai-message> text child', () => {
  it('renders a bare text node child as the body, as TEXT and never as HTML', async () => {
    const t = await mount('', (el) => { el.role = 'user'; });
    t.el.append(document.createTextNode('hello <img src=x onerror=alert(1)> world'));
    await tick();
    await tick();
    expect(t.defaultSlot()).not.toBeNull();
    expect(t.el.querySelector('img')).toBeNull();
    expect(t.el.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(t.row()!.querySelector('img')).toBeNull();
  });

  it('shows a lone text child in the user row (markup form)', async () => {
    const t = await mount('hello', (el) => { el.role = 'user'; });
    expect(t.defaultSlot()).not.toBeNull();
    expect(t.defaultSlot()!.assignedNodes().map((n) => n.textContent)).toEqual(['hello']);
  });

  it('ignores whitespace-only text between elements and alone', async () => {
    const t = await mount('\n  \n', (el) => {
      el.message = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'from data' }] };
    });
    expect(t.defaultSlot()).toBeNull();
    expect(t.root.textContent).toContain('from data');
  });

  it('copy() copies a text child, in document order with element children', async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const t = await mount('plain words', (el) => { el.role = 'assistant'; });
    (t.el as unknown as { copy(): void }).copy();
    expect(writeText).toHaveBeenCalledWith('plain words');
  });
});
