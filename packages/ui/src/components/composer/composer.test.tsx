import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Composer, type ComposerController } from './composer';
import type { ComposerDoc } from '../../primitives/composer-model';
import { createEntityEl, ZWSP } from './composer-dom';

afterEach(cleanup);

function editable(container: HTMLElement) {
  return container.querySelector('[data-kai-composer-editable]') as HTMLElement;
}

/** Put a collapsed caret at `offset` in the editable's first text node — the
 *  position a click or an arrow sequence leaves behind. */
function setCaretInFirstTextNode(el: HTMLElement, offset: number) {
  const range = document.createRange();
  range.setStart(el.firstChild!, offset);
  range.collapse(true);
  const sel = document.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

/** The collapsed caret's text offset inside `el`, counting whole child nodes
 *  before it. Handles both anchors a Range can hold: a text node, or `el` itself
 *  (offset 0..childNodes.length). */
function caretOffset(el: HTMLElement): number {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return -1;
  const { startContainer, startOffset } = sel.getRangeAt(0);
  const width = (n: Node) => (n.textContent ?? '').length;
  if (startContainer === el) {
    let offset = 0;
    for (let i = 0; i < startOffset; i++) offset += width(el.childNodes[i]);
    return offset;
  }
  let offset = 0;
  for (const node of Array.from(el.childNodes)) {
    if (node === startContainer) return offset + startOffset;
    offset += width(node);
  }
  return -1;
}

describe('Composer view', () => {
  it('renders a string value into the editable surface', () => {
    const { container } = render(() => <Composer value="hello" />);
    expect(editable(container).textContent).toContain('hello');
  });

  it('emits onChange with doc/text/entities on input', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Composer onChange={onChange} />);
    const el = editable(container);
    el.textContent = 'hi there';
    fireEvent.input(el);
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls.at(-1)![0];
    expect(arg.text).toBe('hi there');
    expect(arg.doc).toEqual([{ type: 'text', text: 'hi there' }]);
    expect(arg.entities).toEqual([]);
  });

  it('Enter submits, Shift+Enter does not', () => {
    const onSubmit = vi.fn();
    const { container } = render(() => <Composer value="go" onSubmit={onSubmit} />);
    const el = editable(container);
    fireEvent.keyDown(el, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].text).toBe('go');
  });

  it('does not submit when disabled or loading', () => {
    const onSubmit = vi.fn();
    const { container } = render(() => <Composer value="go" disabled onSubmit={onSubmit} />);
    fireEvent.keyDown(editable(container), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('Composer controlled value reactivity', () => {
  it('re-renders the editable when the value signal changes (unfocused)', async () => {
    const [value, setValue] = createSignal<string>('initial');
    const { container } = render(() => <Composer value={value()} />);
    const el = editable(container);

    // Initial render
    expect(el.textContent).toContain('initial');

    // Update to a plain string
    setValue('updated text');
    // SolidJS effects run synchronously in the same microtask in the test env
    await Promise.resolve();
    expect(el.textContent).toContain('updated text');

    // Update to a doc with entity-like text
    setValue('new value');
    await Promise.resolve();
    expect(el.textContent).toContain('new value');
  });
});

describe('Composer suggestion menu placement', () => {
  // jsdom does not implement `Range#getClientRects` at all (not even as a zero-sized
  // stub), and `getCaretRect` reads it to decide whether to open the menu. Defined
  // for the duration of these tests, then removed again so nothing downstream sees a
  // jsdom that lies about rects.
  const rangeProto = Range.prototype as unknown as { getClientRects?: () => DOMRectList };
  const hadGetClientRects = 'getClientRects' in rangeProto;

  afterEach(() => {
    vi.restoreAllMocks();
    if (!hadGetClientRects) delete rangeProto.getClientRects;
  });

  it('portals the suggestion menu out of a clipping ancestor', () => {
    // The bug this guards: the menu is `position: fixed`, and fixed does NOT escape a
    // containing block. The `transform` below makes this div one, so a menu that is
    // not portaled is laid out — and clipped by `overflow: hidden` — inside it.
    //
    // The faked caret rect is this environment's, not the menu's: nothing about the
    // trigger detection, the items, the position or the dismissal is stubbed.
    rangeProto.getClientRects = () => [
      { width: 1, height: 16, top: 0, left: 0, right: 1, bottom: 16, x: 0, y: 0, toJSON: () => ({}) },
    ] as unknown as DOMRectList;

    let clip!: HTMLDivElement;
    render(() => (
      <div ref={clip} style={{ overflow: 'hidden', transform: 'translateZ(0)' }}>
        <Composer triggers={[{ char: '/', kind: 'skill', items: [{ id: 'rec', label: 'Record & Replay' }] }]} />
      </div>
    ));
    const el = clip.querySelector('[data-kai-composer-editable]') as HTMLElement;
    el.textContent = '/';
    const range = document.createRange();
    range.setStart(el.firstChild!, 1);
    range.collapse(true);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.input(el);

    const menu = screen.getByRole('listbox');
    expect(clip.contains(menu)).toBe(false);
    // No provider -> `portalMount()` is undefined -> Solid's `<Portal>` default,
    // `document.body` (inside the wrapper div Solid inserts there).
    expect(document.body.contains(menu)).toBe(true);
  });
});

describe('Composer caret on an external value set', () => {
  // The bug these pin: a voice transcript (or any consumer-set value) arrives while
  // the caret is in the editable, `renderDoc` rebuilds the children, and the caret
  // lands at offset 0 — so the next keystroke goes IN FRONT of the new text.
  it('puts the caret at the END when a consumer sets the value (the voice path)', async () => {
    const [value, setValue] = createSignal('draft');
    const { container } = render(() => <Composer value={value()} />);
    const el = editable(container);
    // The caret is in the editable, which is where it stays while a toolbar
    // button holds focus — a blur does not move the selection out of a
    // contenteditable (verified in Chromium, light DOM and shadow root alike).
    el.focus();
    setCaretInFirstTextNode(el, 5);
    // The transcript is appended to the draft and written back as the value.
    setValue('draft and the transcript');
    await Promise.resolve();
    expect(el.textContent).toBe('draft and the transcript');
    expect(caretOffset(el)).toBe('draft and the transcript'.length);
  });

  it('leaves the caret alone on the ECHO of the user’s own typing', async () => {
    // A doc-valued consumer: its echo is a NEW array — so the value effect really
    // runs — carrying exactly the text the editable already shows. That equality
    // is what distinguishes the echo from an external set, and it is what keeps
    // the caret still for a user typing in the middle of the text.
    const [value, setValue] = createSignal<string | ComposerDoc>([{ type: 'text', text: 'hello!' }] as ComposerDoc);
    const { container } = render(() => <Composer value={value()} onChange={(c) => setValue(c.doc)} />);
    const el = editable(container);
    el.textContent = 'hello!';
    // Deliberately NOT at the end, so a fix that moves the caret on every value
    // change fails here instead of passing both cases.
    setCaretInFirstTextNode(el, 2);
    fireEvent.input(el);
    await Promise.resolve();
    expect(caretOffset(el)).toBe(2);
  });

  it('does not take a caret the user left in another field', async () => {
    const [value, setValue] = createSignal('a');
    const { container } = render(() => <Composer value={value()} />);
    const el = editable(container);
    const other = document.createElement('div');
    other.textContent = 'elsewhere';
    document.body.appendChild(other);
    const range = document.createRange();
    range.setStart(other.firstChild!, 3);
    range.collapse(true);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    setValue('a b');
    await Promise.resolve();

    // The value still applied; the caret did not move into the composer.
    expect(el.textContent).toBe('a b');
    expect(sel.getRangeAt(0).startContainer).toBe(other.firstChild);
    expect(el.contains(sel.getRangeAt(0).startContainer)).toBe(false);
    other.remove();
  });

  it('still inserts a pill AT the caret, and the echoed value does not drag it away', async () => {
    const [value, setValue] = createSignal<string | ComposerDoc>('hello world');
    let controller!: ComposerController;
    const { container } = render(() => (
      <Composer
        value={value()}
        controllerRef={(c) => (controller = c)}
        // The controlled round-trip a real consumer does (the assistant block's
        // `kai-value-change` writes the doc straight back).
        onChange={(c) => setValue(c.doc)}
      />
    ));
    const el = editable(container);
    setCaretInFirstTextNode(el, 5); // mid-text: 'hello| world'
    controller.insertEntity({ kind: 'skill', id: 'rec', label: 'Record & Replay' });
    await Promise.resolve();

    const pill = el.querySelector('[data-kai-entity]');
    expect(pill).toBeTruthy();
    const range = document.getSelection()!.getRangeAt(0);
    // The caret sits past the pill's zero-width filler, inside the trailing text,
    // where the next character belongs — not before the pill, and not dragged to
    // the end of the content by the echoed value.
    expect(range.startContainer).toBe(el);
    expect(el.childNodes[range.startOffset - 1].textContent).toBe(ZWSP);
    expect(range.startOffset).toBeLessThan(el.childNodes.length);
  });
});

describe('Composer trigger-menu glyphs', () => {
  // Same jsdom gap as the placement test: `getCaretRect` reads `Range#getClientRects`
  // to decide whether to open the menu, and jsdom does not implement it at all.
  const rangeProto = Range.prototype as unknown as { getClientRects?: () => DOMRectList };
  const hadGetClientRects = 'getClientRects' in rangeProto;

  afterEach(() => {
    if (!hadGetClientRects) delete rangeProto.getClientRects;
  });

  /** Open the menu for `triggers` by putting the trigger char at the caret. */
  function openMenu(triggers: { char: string; kind: string; items: { id: string; label: string; icon?: string }[] }[]) {
    rangeProto.getClientRects = () => [
      { width: 1, height: 16, top: 0, left: 0, right: 1, bottom: 16, x: 0, y: 0, toJSON: () => ({}) },
    ] as unknown as DOMRectList;
    const { container } = render(() => <Composer triggers={triggers} />);
    const el = editable(container);
    el.textContent = triggers[0].char;
    const range = document.createRange();
    range.setStart(el.firstChild!, 1);
    range.collapse(true);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    fireEvent.input(el);
    return screen.getByRole('option');
  }

  it('leads a row with the kind’s trigger char when the kind has no glyph and the icon is a name', () => {
    // `icon: 'file-text'` is a Lucide NAME, and it used to go straight into an
    // <img src> — a broken image in the row. The chain now treats it as absent and
    // ends at the kind's trigger char, so the row reads '@q3.pdf'.
    const option = openMenu([
      { char: '@', kind: 'mention', items: [{ id: 'f', label: 'q3.pdf', icon: 'file-text' }] },
    ]);
    expect(option.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('@');
    expect(option.querySelector('img')).toBeNull();
  });

  it('keeps the built-in glyph for a known kind, and a usable icon src still wins', () => {
    // agent: no icon → the built-in robot glyph, unchanged.
    const agent = openMenu([{ char: '@', kind: 'agent', items: [{ id: 'a', label: 'researcher' }] }]);
    expect(agent.querySelector('svg')).toBeTruthy();
    expect(agent.querySelector('.kai-composer-pill-sigil')).toBeNull();
    cleanup();
    // an actual image source is still an <img>
    const iconed = openMenu([
      { char: '@', kind: 'mentions', items: [{ id: 'b', label: 'deck.md', icon: '/icons/deck.png' }] },
    ]);
    expect(iconed.querySelector('img')?.getAttribute('src')).toBe('/icons/deck.png');
  });

  it('gives the pill the kind’s trigger char, derived from the triggers prop', () => {
    // The end-to-end half of the chain: the character comes from the same
    // `triggers` prop the trigger detection reads, so a consumer kind (here
    // `mention`) leads with the `@` the user typed to create it.
    let controller!: ComposerController;
    render(() => (
      <Composer
        triggers={[{ char: '@', kind: 'mention', items: [{ id: 'f', label: 'q3.pdf', icon: 'file-text' }] }]}
        controllerRef={(c) => (controller = c)}
      />
    ));
    const el = document.querySelector('[data-kai-composer-editable]') as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    controller.insertEntity({ kind: 'mention', id: 'f', label: 'q3.pdf', icon: 'file-text' });

    const pill = el.querySelector('[data-kai-entity]') as HTMLElement;
    expect(pill.querySelector('.kai-composer-pill-sigil')?.textContent).toBe('@');
    expect(pill.querySelector('img')).toBeNull();
  });
});

describe('Composer entity pills', () => {
  it('Backspace removes a whole pill atomically and fires onEntityRemove', () => {
    const onEntityRemove = vi.fn();
    const onChange = vi.fn();
    const { container } = render(() => <Composer onEntityRemove={onEntityRemove} onChange={onChange} />);
    const el = editable(container);
    const skill = { kind: 'skill', id: 'rec', label: 'Record & Replay' };
    const pill = createEntityEl(document, skill);
    el.appendChild(pill);
    el.appendChild(document.createTextNode(ZWSP));
    // place caret right after the ZWSP (end of content)
    const range = document.createRange();
    range.selectNodeContents(el); range.collapse(false);
    const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(range);
    fireEvent.keyDown(el, { key: 'Backspace' });
    expect(onEntityRemove).toHaveBeenCalledWith(skill);
    expect(el.querySelector('[data-kai-entity]')).toBeNull();
  });
});

describe('Composer focus events', () => {
  it('fires onFocus and onBlur (focus/blur are not composed, so the element re-exposes them)', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const { container } = render(() => <Composer onFocus={onFocus} onBlur={onBlur} />);
    const el = editable(container);
    fireEvent.focus(el);
    expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent.blur(el);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

/**
 * The editable's one-line floor.
 *
 * jsdom computes no layout, so this asserts the RULE rather than its effect: the floor
 * and its fallback are both in the injected sheet, in that order. The effect — the
 * placeholder sitting ON the row's centreline rather than half a line below it — is
 * measured in a real browser by `scripts/probe-composer-states.mjs`, because a computed
 * height here would be the jsdom default and prove nothing.
 *
 * DELETION is the risk this guards. An empty doc leaves no in-flow content and the
 * placeholder pseudo-element is absolute, so without the floor the editable is 0px tall:
 * centred by `items-center` its top lands at the body's middle and the placeholder renders
 * about 10px low. That is a defect no computed-style assertion can see, which is how it
 * reached the owner's eyes in the first place.
 */
describe('Composer editable floor', () => {
  it('declares a one-line min-height on the editable, with its fallback first', () => {
    const { container } = render(() => <Composer />);
    const css = Array.from(container.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');

    expect(css).toContain('min-height: 1lh');
    expect(css).toContain('min-height: 1.25rem');
    // Ordered, not merely present: a fallback declared AFTER the unit it backs would
    // override it wherever both are supported, which is the opposite of a fallback.
    expect(css.indexOf('min-height: 1.25rem')).toBeLessThan(css.indexOf('min-height: 1lh'));
  });
});

/**
 * An EMPTY composer must still have a definite width.
 *
 * `Composer` renders the editable inside its own `div.relative`, and that wrapper
 * declares no width of its own: it is a shrink-to-fit box. Two facts together make
 * that fatal once the composer is empty, and neither is visible in this file:
 *
 *  1. The `bare` consumer's body is a flex container (`prompt-input.tsx` centres the
 *     one-line text in it), so the wrapper is a flex ITEM whose automatic basis takes
 *     its width from its content.
 *  2. The placeholder is a `::before` with `position: absolute` — deliberately, so the
 *     caret sits at the start of the field instead of after the placeholder text — so
 *     it is out of flow and contributes no content width.
 *
 * The wrapper was therefore 0px wide while the composer was empty, and because the
 * editable also carries `overflow: auto` (which computes the other axis to `auto`
 * too) the absolutely-positioned placeholder was CLIPPED and invisible. Measured live
 * in Chromium: empty editable 0px wide inside a 608px body, 68px after typing one
 * phrase — which is why typed text was always visible and only the placeholder was
 * not.
 *
 * These assert the CLASS, not geometry: jsdom lays nothing out, so a width assertion
 * here would pass on the broken tree. The pixel claim belongs to
 * `scripts/probe-composer-states.mjs`, and the class is what stops it regressing.
 */
describe('Composer: the editable wrapper carries a definite width', () => {
  const wrapperOf = (container: HTMLElement) => editable(container).parentElement as HTMLElement;

  it('inside a flex parent with an empty value — the case that was broken', () => {
    const { container } = render(() => (
      <div class="flex">
        <Composer bare placeholder="Ask anything" value="" />
      </div>
    ));
    expect(wrapperOf(container).className).toContain('w-full');
  });

  it('standalone, where the parent is the shell rather than a flex body', () => {
    const { container } = render(() => <Composer placeholder="Ask anything" value="" />);
    expect(wrapperOf(container).className).toContain('w-full');
  });

  it('with content, so the class is not conditional on emptiness', () => {
    const { container } = render(() => (
      <div class="flex">
        <Composer bare placeholder="Ask anything" value="hello" />
      </div>
    ));
    expect(wrapperOf(container).className).toContain('w-full');
  });
});
