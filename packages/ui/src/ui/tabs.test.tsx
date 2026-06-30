import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { Tabs, tabClass, TABLIST_CLASS, type KaiTabItem } from './tabs';

afterEach(cleanup);

const ITEMS: KaiTabItem[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'cowork', label: 'Cowork', disabled: true },
  { id: 'code', label: 'Code' },
];

const tabs = (c: HTMLElement) => [...c.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];

describe('TABLIST_CLASS / tabClass variant branch', () => {
  it('segmented uses a muted pill group; underline uses a bottom border', () => {
    expect(TABLIST_CLASS.segmented).toContain('bg-muted');
    expect(TABLIST_CLASS.underline).toContain('border-b');
  });

  it('an active segmented tab raises a background; an active underline tab marks its border', () => {
    expect(tabClass('segmented', true)).toContain('bg-background');
    expect(tabClass('segmented', false)).not.toContain('bg-background');
    expect(tabClass('underline', true)).toContain('border-primary');
    expect(tabClass('underline', false)).toContain('border-transparent');
  });
});

describe('Tabs', () => {
  it('renders a tablist with one tab per item', () => {
    const { container } = render(() => <Tabs items={ITEMS} />);
    expect(container.querySelector('[role="tablist"]')).toBeInTheDocument();
    expect(tabs(container)).toHaveLength(3);
  });

  it('marks the value tab active (aria-selected + data-active), the rest inactive', () => {
    const { container } = render(() => <Tabs items={ITEMS} value="code" />);
    const [chat, , code] = tabs(container);
    expect(code).toHaveAttribute('aria-selected', 'true');
    expect(code).toHaveAttribute('data-active');
    expect(chat).toHaveAttribute('aria-selected', 'false');
    expect(chat).not.toHaveAttribute('data-active');
  });

  it('emits the clicked tab id via onChange', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" onChange={onChange} />);
    fireEvent.click(tabs(container)[2]); // code
    expect(onChange).toHaveBeenCalledWith('code');
  });

  it('does not re-emit when the already-selected tab is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" onChange={onChange} />);
    fireEvent.click(tabs(container)[0]); // chat (already active)
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders disabled items disabled and never selects them on click', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" onChange={onChange} />);
    const cowork = tabs(container)[1];
    expect(cowork).toBeDisabled();
    fireEvent.click(cowork);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('puts exactly one tab (the active one) in the tab order via roving tabindex', () => {
    const { container } = render(() => <Tabs items={ITEMS} value="code" />);
    const [chat, cowork, code] = tabs(container);
    expect(code).toHaveAttribute('tabindex', '0');
    expect(chat).toHaveAttribute('tabindex', '-1');
    expect(cowork).toHaveAttribute('tabindex', '-1');
  });

  it('falls back to the first enabled tab for the tab order when nothing is selected', () => {
    const { container } = render(() => <Tabs items={ITEMS} />);
    expect(tabs(container)[0]).toHaveAttribute('tabindex', '0'); // chat
  });

  it('ArrowRight skips the disabled tab and selects the next enabled one', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" onChange={onChange} />);
    fireEvent.keyDown(tabs(container)[0], { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('code'); // cowork (disabled) is skipped
  });

  it('ArrowLeft wraps around to the last enabled tab', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" onChange={onChange} />);
    fireEvent.keyDown(tabs(container)[0], { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('code');
  });

  it('End jumps to the last enabled tab', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" onChange={onChange} />);
    fireEvent.keyDown(tabs(container)[0], { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('code');
  });

  it('Home jumps to the first enabled tab', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="code" onChange={onChange} />);
    fireEvent.keyDown(tabs(container)[2], { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('chat');
  });

  it('Enter / Space activate the focused tab', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" onChange={onChange} />);
    fireEvent.keyDown(tabs(container)[2], { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('code');
  });

  it('emits nothing when the whole strip is disabled', () => {
    const onChange = vi.fn();
    const { container } = render(() => <Tabs items={ITEMS} value="chat" disabled onChange={onChange} />);
    fireEvent.click(tabs(container)[2]);
    fireEvent.keyDown(tabs(container)[0], { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="tablist"]')).toHaveAttribute('aria-disabled', 'true');
  });
});
