import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Composer } from './composer';
import { createEntityEl, ZWSP } from './composer-dom';

afterEach(cleanup);

function editable(container: HTMLElement) {
  return container.querySelector('[data-kai-composer-editable]') as HTMLElement;
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

describe('Composer event surface (focus/blur/keydown/paste/focusin/focusout)', () => {
  it('fires onFocus and onBlur', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const { container } = render(() => <Composer onFocus={onFocus} onBlur={onBlur} />);
    const el = editable(container);
    fireEvent.focus(el);
    expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent.blur(el);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('fires onFocusIn and onFocusOut', () => {
    const onFocusIn = vi.fn();
    const onFocusOut = vi.fn();
    const { container } = render(() => <Composer onFocusIn={onFocusIn} onFocusOut={onFocusOut} />);
    const el = editable(container);
    fireEvent.focusIn(el);
    expect(onFocusIn).toHaveBeenCalledTimes(1);
    fireEvent.focusOut(el);
    expect(onFocusOut).toHaveBeenCalledTimes(1);
  });

  it('fires onKeydown for every key, passing the event', () => {
    const onKeydown = vi.fn();
    const { container } = render(() => <Composer onKeydown={onKeydown} />);
    fireEvent.keyDown(editable(container), { key: 'a' });
    expect(onKeydown).toHaveBeenCalledTimes(1);
    expect(onKeydown.mock.calls[0][0].key).toBe('a');
  });

  it('fires onKeydown even for keys the composer handles (Enter)', () => {
    const onKeydown = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(() => <Composer value="hi" onKeydown={onKeydown} onSubmit={onSubmit} />);
    fireEvent.keyDown(editable(container), { key: 'Enter' });
    expect(onKeydown).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1); // composer still handled it
  });

  it('fires onPaste', () => {
    const onPaste = vi.fn();
    const { container } = render(() => <Composer onPaste={onPaste} />);
    fireEvent.paste(editable(container));
    expect(onPaste).toHaveBeenCalledTimes(1);
  });
});
