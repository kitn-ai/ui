import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { MessageActionBar, MessageAvatar } from './message';
import { actionIcon, BUILTIN_ACTION_LABEL } from '../ui/action-icons';
import type { ChatMessageAction, CustomAction } from '../elements/chat-types';

afterEach(cleanup);

describe('action-icons registry', () => {
  it('resolves every built-in action name to a component', () => {
    (['copy', 'like', 'dislike', 'regenerate', 'edit'] as ChatMessageAction[]).forEach((n) => {
      expect(actionIcon(n)).toBeTypeOf('function');
    });
  });

  it('resolves common custom icon names', () => {
    ['share', 'bookmark', 'download', 'link', 'trash', 'check', 'x', 'star', 'flag', 'reply', 'more'].forEach((n) => {
      expect(actionIcon(n)).toBeTypeOf('function');
    });
  });

  it('returns undefined for unknown or absent names', () => {
    expect(actionIcon('not-a-real-icon')).toBeUndefined();
    expect(actionIcon(undefined)).toBeUndefined();
    expect(actionIcon('')).toBeUndefined();
  });

  it('exposes labels for all built-ins', () => {
    expect(BUILTIN_ACTION_LABEL).toMatchObject({
      copy: 'Copy', like: 'Like', dislike: 'Dislike', regenerate: 'Regenerate', edit: 'Edit',
    });
  });
});

describe('MessageActionBar', () => {
  it('renders built-in actions and emits their name on click', () => {
    const onAction = vi.fn();
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['copy', 'like', 'regenerate']} onAction={onAction} />
    ));
    const copy = getByLabelText('Copy');
    expect(copy).toBeInTheDocument();
    expect(copy).toHaveAttribute('data-action', 'copy');
    // built-in renders an icon (svg), not the label text
    expect(copy.querySelector('svg')).toBeTruthy();

    fireEvent.click(copy);
    expect(onAction).toHaveBeenCalledWith('copy');
    fireEvent.click(getByLabelText('Regenerate'));
    expect(onAction).toHaveBeenCalledWith('regenerate');
  });

  it('renders a custom action with a known icon and emits its id', () => {
    const onAction = vi.fn();
    const share: CustomAction = { id: 'share', label: 'Share', icon: 'share' };
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={[share]} onAction={onAction} />
    ));
    const btn = getByLabelText('Share');
    expect(btn).toHaveAttribute('data-action', 'share');
    expect(btn.querySelector('svg')).toBeTruthy();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledWith('share');
  });

  it('renders a label-only button for an unknown custom icon (no crash)', () => {
    const onAction = vi.fn();
    const custom: CustomAction = { id: 'archive', label: 'Archive', icon: 'definitely-missing' };
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={[custom]} onAction={onAction} />
    ));
    const btn = getByLabelText('Archive');
    expect(btn).toBeInTheDocument();
    expect(btn.querySelector('svg')).toBeFalsy();
    expect(btn).toHaveTextContent('Archive');
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledWith('archive');
  });

  it('renders label-only when a custom action has no icon', () => {
    const onAction = vi.fn();
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={[{ id: 'mute', label: 'Mute' }]} onAction={onAction} />
    ));
    const btn = getByLabelText('Mute');
    expect(btn.querySelector('svg')).toBeFalsy();
    expect(btn).toHaveTextContent('Mute');
  });

  it('reveal="hover" adds the opacity/group-hover classes', () => {
    const { container } = render(() => (
      <MessageActionBar actions={['copy']} reveal="hover" onAction={() => {}} />
    ));
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain('opacity-0');
    expect(bar.className).toContain('group-hover:opacity-100');
  });

  it('reveal="always" (default) does not add the hover classes', () => {
    const { container } = render(() => (
      <MessageActionBar actions={['copy']} onAction={() => {}} />
    ));
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).not.toContain('opacity-0');
    expect(bar.className).not.toContain('group-hover:opacity-100');
  });
});

describe('MessageAvatar', () => {
  it('renders an img when src is set', () => {
    const { container } = render(() => (
      <MessageAvatar src="https://example.com/a.png" alt="Ada" fallback="AD" />
    ));
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
    expect(img).toHaveAttribute('alt', 'Ada');
  });

  it('renders the fallback text when there is no src', () => {
    const { container, getByText } = render(() => (
      <MessageAvatar src="" alt="Ada" fallback="AD" />
    ));
    expect(container.querySelector('img')).toBeFalsy();
    expect(getByText('AD')).toBeInTheDocument();
  });
});
