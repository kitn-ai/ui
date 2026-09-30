/**
 * `<kai-message>` composed mode: part children as the body.
 *
 * The row chrome stays the element's: alignment, the speaker's role, the action bar and
 * the named slots. Only the BODY changes hands, from `message.parts` to the app's own
 * children. `role` on the host is the speaker, not an ARIA role, so it is set as a
 * property here exactly as a framework does.
 */
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

describe('<kai-message> composed mode', () => {
  it('renders default-slot children as the body inside a right-aligned user row with the action bar', async () => {
    const t = await mount(
      '<kai-markdown content="hello"></kai-markdown><kai-action id="copy" label="Copy"></kai-action>',
      (el) => { el.role = 'user'; },
    );
    const row = t.row()!;
    expect(row.getAttribute('role')).toBe('article');
    expect(row.getAttribute('aria-label')).toBe('User message');
    expect(row.className).toContain('items-end');
    const slot = t.defaultSlot()!;
    expect(row.contains(slot)).toBe(true);
    // The declarative <kai-action> is an action descriptor, never body content: the native
    // slot still ASSIGNS it, so the shadow root hides it.
    expect(slot.assignedElements().map((e) => e.tagName.toLowerCase())).toEqual(['kai-markdown', 'kai-action']);
    expect([...t.root.querySelectorAll('style')].some((st) => st.textContent === '::slotted(kai-action){display:none}')).toBe(true);
    expect(row.querySelector('button')).not.toBeNull();
  });

  it('fires kai-message-action from the host when an action is clicked', async () => {
    const t = await mount('<kai-markdown content="hello"></kai-markdown><kai-action id="like" label="Like"></kai-action>', (el) => { el.role = 'assistant'; });
    const seen: unknown[] = [];
    t.el.addEventListener('kai-message-action', (e) => seen.push((e as CustomEvent).detail));
    (t.row()!.querySelector('button') as HTMLButtonElement).click();
    await tick();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ action: 'like', state: 'on' });
  });

  it('keeps before-body, after-body and the avatar around the children, in order', async () => {
    const t = await mount(
      `<span slot="before-body">B</span><kai-markdown content="x"></kai-markdown><span slot="after-body">A</span><span slot="avatar">AV</span>`,
      (el) => { el.role = 'assistant'; },
    );
    const slots = [...t.row()!.querySelectorAll('slot')].map((s) => s.getAttribute('name') ?? '(default)');
    expect(slots).toContain('avatar');
    expect(slots.filter((n) => n !== 'avatar')).toEqual(['before-body', '(default)', 'after-body']);
  });

  it('warns once when `message` is also set, and the children win', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = await mount('<kai-markdown content="mine"></kai-markdown>', (el) => {
      el.message = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'FROM DATA' }] };
    });
    expect(t.root.textContent).not.toContain('FROM DATA');
    expect(t.defaultSlot()).not.toBeNull();
    t.el.message = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'FROM DATA 2' }] };
    await tick();
    const ours = warn.mock.calls.filter((c) => String(c[0]).includes('<kai-message>'));
    expect(ours).toHaveLength(1);
  });

  it('leaves data mode exactly as it was: no default slot without children', async () => {
    const t = await mount('', (el) => {
      el.message = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'plain' }] };
    });
    expect(t.defaultSlot()).toBeNull();
    expect(t.root.textContent).toContain('plain');
  });

  it('copy() copies the children text rather than nothing', async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const t = await mount('<kai-markdown content="copy me"></kai-markdown>', (el) => { el.role = 'assistant'; });
    (t.el as unknown as { copy(): void }).copy();
    expect(writeText).toHaveBeenCalledWith('copy me');
  });
  it('gives a bare <kai-action action="copy"> its built-in label, not an empty aria-label', async () => {
    const t = await mount(
      '<kai-markdown content="hi"></kai-markdown><kai-action action="copy"></kai-action><kai-action action="share"></kai-action><kai-action action="regenerate" label="Again"></kai-action>',
      (el) => { el.role = 'assistant'; },
    );
    const names = [...t.row()!.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Copy', 'share', 'Again']);
  });
});
