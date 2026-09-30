import { describe, expect, it } from 'vitest';

/**
 * A property set on a `kai-*` element BEFORE its custom element is defined must survive
 * the upgrade. It is the commonest consumer pattern there is (`createElement('kai-menu');
 * el.items = [...]` before the module loads, or an element parsed from HTML and handed
 * its data before the autoloader gets to it), and it used to lose the value silently:
 * component-register's constructor ran `this[prop] = undefined` for every declared prop,
 * which overwrote the own data property the page had put on the not-yet-upgraded
 * element, so the `connectedCallback` harvest read `undefined`. The array and object
 * props have no attribute to fall back on, so they simply vanished.
 *
 * Real Chromium, because upgrade timing (`define()` upgrading connected elements
 * synchronously, `importNode` upgrading on adoption) is exactly what jsdom models
 * loosely.
 *
 * NOTHING is imported statically: every element below is created while its tag is still
 * undefined, and the define modules load afterwards. The `it` blocks run in order in one
 * iframe, so the first one to need the modules is the one that pulls them in.
 */
const items = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];
const messages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello from before define' }] }];
const tick = (ms = 120) => new Promise((r) => setTimeout(r, ms));

type Any = HTMLElement & Record<string, any>;
const make = (tag: string) => document.createElement(tag) as Any;

describe('a property set before the element is defined survives the upgrade', () => {
  // Built once, up front, while neither tag is defined: all five shapes x menu + thread.
  const built: Record<string, Any> = {};
  const host = document.createElement('div');
  document.body.append(host);

  const tpl = document.createElement('template');
  tpl.innerHTML = '<kai-menu></kai-menu>';
  const tplThread = document.createElement('template');
  tplThread.innerHTML = '<kai-thread></kai-thread>';

  const setAll = (el: Any, tag: string) => {
    if (tag === 'kai-menu') {
      el.items = items;
      el.triggerLabel = 'Pick one';
    } else {
      el.messages = messages;
    }
  };

  for (const tag of ['kai-menu', 'kai-thread']) {
    // 1. created, given props, still disconnected, appended after define
    const disc = make(tag);
    setAll(disc, tag);
    built[`${tag}:disconnected`] = disc;
    // 2. created, given props, CONNECTED, then defined
    const conn = make(tag);
    setAll(conn, tag);
    host.append(conn);
    built[`${tag}:connected`] = conn;
    // 3. innerHTML-parsed (connected), then given props
    const wrap = document.createElement('div');
    wrap.innerHTML = `<${tag}></${tag}>`;
    host.append(wrap);
    const inner = wrap.firstElementChild as Any;
    setAll(inner, tag);
    built[`${tag}:innerHTML`] = inner;
    // 4. template cloneNode (inert document fragment), given props, appended later
    const t = tag === 'kai-menu' ? tpl : tplThread;
    const cloned = (t.content.cloneNode(true) as DocumentFragment).firstElementChild as Any;
    setAll(cloned, tag);
    built[`${tag}:cloneNode`] = cloned;
    // 5. importNode from the template
    const imported = (document.importNode(t.content, true) as DocumentFragment).firstElementChild as Any;
    setAll(imported, tag);
    built[`${tag}:importNode`] = imported;
  }

  const define = async () => {
    expect(customElements.get('kai-menu')).toBeUndefined();
    await import('../../src/web-components/menu/menu');
    await import('../../src/web-components/thread/thread');
    await customElements.whenDefined('kai-menu');
    await customElements.whenDefined('kai-thread');
    for (const shape of ['disconnected', 'cloneNode', 'importNode']) {
      for (const tag of ['kai-menu', 'kai-thread']) host.append(built[`${tag}:${shape}`]);
    }
    await tick(400);
  };

  const shapes = ['disconnected', 'connected', 'innerHTML', 'cloneNode', 'importNode'];

  for (const shape of shapes) {
    it(`kai-menu ${shape}: array prop and scalar prop are kept`, async () => {
      if (!customElements.get('kai-menu')) await define();
      const el = built[`kai-menu:${shape}`];
      expect(el.constructor.name).not.toBe('HTMLElement'); // it really upgraded
      expect(el.items).toEqual(items);
      expect(el.triggerLabel).toBe('Pick one');
      expect(el.shadowRoot!.textContent).toContain('Pick one');
    });

    it(`kai-thread ${shape}: array prop is kept and rendered`, async () => {
      if (!customElements.get('kai-thread')) await define();
      const el = built[`kai-thread:${shape}`];
      expect(el.messages).toEqual(messages);
      expect(el.shadowRoot!.textContent).toContain('hello from before define');
    });
  }

  it('a value set before define can still be changed after the upgrade', async () => {
    if (!customElements.get('kai-menu')) await define();
    const el = built['kai-menu:connected'];
    expect(el.items).toEqual(items);
    const next = [{ id: 'z', label: 'Zeta' }];
    el.items = next;
    el.triggerLabel = 'Changed';
    await tick();
    expect(el.items).toEqual(next);
    expect(el.triggerLabel).toBe('Changed');
    expect(el.shadowRoot!.textContent).toContain('Changed');
    expect(el.shadowRoot!.textContent).not.toContain('Pick one');
  });

  it('control: a property set after define still works', async () => {
    if (!customElements.get('kai-menu')) await define();
    const el = make('kai-menu');
    host.append(el);
    el.items = items;
    el.triggerLabel = 'After define';
    await tick();
    expect(el.items).toEqual(items);
    expect(el.shadowRoot!.textContent).toContain('After define');
  });
});
