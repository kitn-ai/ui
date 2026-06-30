import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { EditableLabel } from './editable-label';

afterEach(cleanup);

/** Let the autofocus/select queueMicrotask run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

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
});
