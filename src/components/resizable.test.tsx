import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@solidjs/testing-library';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';

// NOTE on file location: the task brief names `src/components/resizable.tsx`, but
// in this tree the resizable UI primitives live in `src/ui/resizable.tsx` and the
// custom element in `src/elements/resizable.tsx`. This test (kept at the requested
// `src/components/` path) exercises both the UI primitive (`ResizableHandle`
// dblclick-reset + default-size reflection) and the element (`<kc-resizable>`
// size-preservation across content-only re-renders).

// jsdom doesn't implement layout: getBoundingClientRect returns all-zeros, so the
// pixel-driven DRAG math (pointer move → flex-basis) and the live-percent settle
// are NOT meaningfully testable here. We test the *state logic* that is layout-
// independent: (a) the panel reflects its default size to a data-* attribute, and
// (b) dblclick on a handle restores adjacent panels' flex-basis from those
// defaults, even after their inline basis has been mutated (simulating a drag).
// The element test asserts that a content-only mutation does NOT clobber a panel's
// dragged inline flex-basis.

afterEach(cleanup);

describe('ResizablePanel default-size reflection', () => {
  it('reflects defaultSize to data-default-size-pct (percent) so a handle can reset to it', () => {
    const { container } = render(() => (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={30}>a</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>b</ResizablePanel>
      </ResizablePanelGroup>
    ));
    const panels = container.querySelectorAll('[style*="flex-basis"]');
    const first = panels[0] as HTMLElement;
    expect(first.dataset.defaultSizePct).toBe('30');
  });

  it('reflects a px defaultSize to data-default-size (pixels)', () => {
    const { container } = render(() => (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="280px">a</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>b</ResizablePanel>
      </ResizablePanelGroup>
    ));
    const first = container.querySelector('[data-default-size]') as HTMLElement;
    expect(first?.dataset.defaultSize).toBe('280');
  });
});

describe('ResizableHandle dblclick resets adjacent panels to defaults', () => {
  it('restores both adjacent panels flex-basis from their default sizes on dblclick', () => {
    const { container } = render(() => (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={30}>a</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={70}>b</ResizablePanel>
      </ResizablePanelGroup>
    ));
    const handle = container.querySelector('[role="separator"]') as HTMLElement;
    const prev = handle.previousElementSibling as HTMLElement;
    const next = handle.nextElementSibling as HTMLElement;

    // Simulate the result of a drag: panels carry pixel flex-basis inline.
    prev.style.flexBasis = '120px';
    next.style.flexBasis = '480px';

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(prev.style.flexBasis).toBe('30%');
    expect(next.style.flexBasis).toBe('70%');
  });

  it('resets a panel that has no explicit default back to flexible (clears inline basis)', () => {
    const { container } = render(() => (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={30}>a</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>b</ResizablePanel>
      </ResizablePanelGroup>
    ));
    const handle = container.querySelector('[role="separator"]') as HTMLElement;
    const prev = handle.previousElementSibling as HTMLElement;
    const next = handle.nextElementSibling as HTMLElement;

    prev.style.flexBasis = '120px';
    next.style.flexBasis = '480px';
    next.style.flexGrow = '0';
    next.style.flexShrink = '0';

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(prev.style.flexBasis).toBe('30%');
    // The flexible panel (no default) returns to growing: basis cleared, grow:1.
    expect(next.style.flexBasis).toBe('');
    expect(next.style.flexGrow).toBe('1');
  });

  it('does nothing on a static (locked) handle', () => {
    const { container } = render(() => (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={30}>a</ResizablePanel>
        <ResizableHandle static />
        <ResizablePanel defaultSize={70}>b</ResizablePanel>
      </ResizablePanelGroup>
    ));
    const handle = container.querySelector('[role="separator"]') as HTMLElement;
    const prev = handle.previousElementSibling as HTMLElement;
    prev.style.flexBasis = '120px';

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(prev.style.flexBasis).toBe('120px');
  });
});

describe('<kc-resizable> size preservation across content-only re-renders', () => {
  beforeAll(async () => {
    // Importing registers the custom element. jsdom supports customElements.
    await import('../elements/resizable');
  });

  function mount(html: string): HTMLElement {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    return host;
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not clobber a dragged panel flex-basis when an item child re-renders content', async () => {
    const host = mount(`
      <kc-resizable orientation="horizontal" style="height:300px;width:600px">
        <kc-resizable-item size="30%"><p id="content">hi</p></kc-resizable-item>
        <kc-resizable-item><p>right</p></kc-resizable-item>
      </kc-resizable>
    `);
    const el = host.querySelector('kc-resizable') as HTMLElement & { shadowRoot: ShadowRoot };
    // Let solid-element upgrade + onMount run.
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    const panel = el.shadowRoot.querySelector('[data-panel]') as HTMLElement;
    expect(panel).toBeTruthy();

    // Simulate a settled drag: the handle writes inline flex-basis on the panel.
    panel.style.flexBasis = '55%';

    // Now mutate ONLY the slotted content of an existing item (no add/remove).
    const content = host.querySelector('#content') as HTMLElement;
    content.textContent = 'a new chat message arrived';

    // Allow the MutationObserver microtask + any re-render to flush.
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    const panelAfter = el.shadowRoot.querySelector('[data-panel]') as HTMLElement;
    // The dragged basis must survive (the bug reset it to "30%").
    expect(panelAfter.style.flexBasis).toBe('55%');
  });

  it('reflects each item default size onto its panel for handle dblclick-reset', async () => {
    const host = mount(`
      <kc-resizable orientation="horizontal" style="height:300px;width:600px">
        <kc-resizable-item size="30%"><p>a</p></kc-resizable-item>
        <kc-resizable-item><p>b</p></kc-resizable-item>
      </kc-resizable>
    `);
    const el = host.querySelector('kc-resizable') as HTMLElement & { shadowRoot: ShadowRoot };
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    const panels = el.shadowRoot.querySelectorAll('[data-panel]');
    expect((panels[0] as HTMLElement).dataset.defaultSizePct).toBe('30');
    // Second panel has no explicit default → no reflected default size.
    expect((panels[1] as HTMLElement).dataset.defaultSizePct).toBeUndefined();
  });

  it('keeps the ORIGINAL default for dblclick-reset even after sizes are persisted', async () => {
    const host = mount(`
      <kc-resizable orientation="horizontal" style="height:300px;width:600px">
        <kc-resizable-item size="30%"><p>a</p></kc-resizable-item>
        <kc-resizable-item size="70%"><p>b</p></kc-resizable-item>
      </kc-resizable>
    `);
    const el = host.querySelector('kc-resizable') as HTMLElement & { shadowRoot: ShadowRoot };
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    // Simulate persistence overwriting the live `size` attribute after a drag.
    const item = host.querySelector('kc-resizable-item') as HTMLElement;
    item.setAttribute('size', '55%');
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    const panel = el.shadowRoot.querySelector('[data-panel]') as HTMLElement;
    // The reflected DEFAULT (for dblclick-reset) stays the original 30, not 55.
    expect(panel.dataset.defaultSizePct).toBe('30');
  });

  it('still re-initializes when an item is actually added', async () => {
    const host = mount(`
      <kc-resizable orientation="horizontal" style="height:300px;width:600px">
        <kc-resizable-item size="30%"><p>a</p></kc-resizable-item>
        <kc-resizable-item><p>b</p></kc-resizable-item>
      </kc-resizable>
    `);
    const el = host.querySelector('kc-resizable') as HTMLElement & { shadowRoot: ShadowRoot };
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(el.shadowRoot.querySelectorAll('[data-panel]').length).toBe(2);

    const item = document.createElement('kc-resizable-item');
    item.innerHTML = '<p>c</p>';
    el.appendChild(item);

    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(el.shadowRoot.querySelectorAll('[data-panel]').length).toBe(3);
  });
});
