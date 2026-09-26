import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { EditableLabel } from './editable-label';

afterEach(cleanup);

/** Let the autofocus/select queueMicrotask run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

/** A real double click: two `click` events, then `dblclick` on the element the two
 *  clicks share. In `click` mode the read view is gone after the first one, so the
 *  second click and the `dblclick` land on whatever now sits there. */
const doubleClick = (container: HTMLElement) => {
  const readView = () => container.querySelector('[part="text"]');
  fireEvent.click(readView() ?? container.firstElementChild!);
  fireEvent.click(readView() ?? container.firstElementChild!);
  const input = container.querySelector('input');
  if (input) fireEvent.dblClick(input);
  else fireEvent.dblClick(readView()!);
};

describe('EditableLabel', () => {
  it('shows the value as text (no input)', () => {
    const { container } = render(() => <EditableLabel value="Project Alpha" />);
    expect(container.querySelector('[part="text"]')).toHaveTextContent('Project Alpha');
    expect(container.querySelector('input')).toBeNull();
  });

  it('dblclick enters edit mode with the value selected', async () => {
    const { container } = render(() => <EditableLabel value="Project Alpha" />);
    fireEvent.dblClick(container.querySelector('[part="text"]')!);

    const input = container.querySelector('input')!;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Project Alpha');
    await tick();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Project Alpha'.length);
  });

  it('Enter with a new value fires onRename and returns to the text view showing it', () => {
    const onRename = vi.fn();
    const { container } = render(() => <EditableLabel value="Old" onRename={onRename} />);
    fireEvent.dblClick(container.querySelector('[part="text"]')!);

    const input = container.querySelector('input')!;
    fireEvent.input(input, { target: { value: 'New' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith('New');
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('[part="text"]')).toHaveTextContent('New');
  });

  it('Esc fires onCancel and restores the old value', () => {
    const onRename = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(() => <EditableLabel value="Keep" onRename={onRename} onCancel={onCancel} />);
    fireEvent.dblClick(container.querySelector('[part="text"]')!);

    const input = container.querySelector('input')!;
    fireEvent.input(input, { target: { value: 'Discard' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onRename).not.toHaveBeenCalled();
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('[part="text"]')).toHaveTextContent('Keep');
  });

  it('committing the SAME value does not fire onRename', () => {
    const onRename = vi.fn();
    const { container } = render(() => <EditableLabel value="Same" onRename={onRename} />);
    fireEvent.dblClick(container.querySelector('[part="text"]')!);

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'Enter' }); // value left unchanged

    expect(onRename).not.toHaveBeenCalled();
    expect(container.querySelector('[part="text"]')).toHaveTextContent('Same');
  });

  it('a single click does NOT enter edit mode by default', () => {
    const { container } = render(() => <EditableLabel value="Project Alpha" />);
    fireEvent.click(container.querySelector('[part="text"]')!);

    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('[part="text"]')).toHaveTextContent('Project Alpha');
  });

  it('editTrigger="click" enters edit mode on one click, with the value selected', async () => {
    const { container } = render(() => <EditableLabel value="Project Alpha" editTrigger="click" />);
    fireEvent.click(container.querySelector('[part="text"]')!);

    const input = container.querySelector('input')!;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Project Alpha');
    await tick();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Project Alpha'.length);
  });

  it('a double click in editTrigger="click" mode leaves exactly one editing session', () => {
    const onRename = vi.fn();
    const { container } = render(() => <EditableLabel value="Click me" editTrigger="click" onRename={onRename} />);
    doubleClick(container);

    // The second click landed on the field: still one field, no re-entry.
    expect(container.querySelectorAll('input')).toHaveLength(1);
    expect(container.querySelector('[part="text"]')).toBeNull();

    const input = container.querySelector('input')!;
    fireEvent.input(input, { target: { value: 'Click me twice' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // One session, so one commit and one rename (a re-entered session would have
    // left more than one live field / fires).
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith('Click me twice');
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('[part="text"]')).toHaveTextContent('Click me twice');
  });

  it('disabled blocks both gestures in either mode', () => {
    for (const editTrigger of ['dblclick', 'click'] as const) {
      const { container, unmount } = render(() => (
        <EditableLabel value="Locked" disabled editTrigger={editTrigger} />
      ));

      fireEvent.click(container.querySelector('[part="text"]')!);
      doubleClick(container);

      expect(container.querySelector('input'), `${editTrigger} blocked while disabled`).toBeNull();
      unmount();
    }
  });
});
