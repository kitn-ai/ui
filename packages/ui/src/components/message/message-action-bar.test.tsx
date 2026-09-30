import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { createSignal } from 'solid-js';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { MessageActionBar, MessageAvatar } from './message';
import { actionIcon, BUILTIN_ACTION_LABEL } from '../action-icons/action-icons';
import type { ChatMessageAction, CustomAction, FeedbackVote } from '../../web-components/chat/chat-types';

afterEach(cleanup);

// The non-active vote button stays MOUNTED but collapses (width→0) so the active
// thumb can slide into its place; flush a tick where a test waits on a transition.
const tick = () => new Promise((r) => setTimeout(r, 0));

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

  // ── feedback + copied props (pure/prop-driven) ─────────────────────────────

  it('copied → the copy button swaps the Copy glyph for the success Check', () => {
    const [copied, setCopied] = createSignal(false);
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['copy']} copied={copied()} onAction={() => {}} />
    ));
    // default: aria-label "Copy", no success check. Asserted on the kit's semantic
    // class, not the raw hue it used to reach for ('.text-emerald-400'): that pin
    // survived a success mark that was illegible in light mode, because it named
    // the palette the component happened to use rather than the meaning.
    expect(getByLabelText('Copy').querySelector('.text-success')).toBeFalsy();

    setCopied(true);
    const btn = getByLabelText('Copied');
    expect(btn).toBeInTheDocument();
    expect(btn.querySelector('.text-success')).toBeTruthy();
  });

  it("activeFeedback='like' → like is pressed and dislike collapses", () => {
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['like', 'dislike']} activeFeedback="like" onAction={() => {}} />
    ));
    const like = getByLabelText('Like');
    expect(like).toHaveAttribute('aria-pressed', 'true');
    // The other vote stays mounted but collapses (width→0) so the active thumb slides in.
    expect(getByLabelText('Dislike').closest('[data-feedback-collapsed]')).not.toBeNull();
  });

  it("activeFeedback='dislike' → dislike is pressed and like collapses (symmetric)", () => {
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['like', 'dislike']} activeFeedback="dislike" onAction={() => {}} />
    ));
    const dislike = getByLabelText('Dislike');
    expect(dislike).toHaveAttribute('aria-pressed', 'true');
    expect(getByLabelText('Like').closest('[data-feedback-collapsed]')).not.toBeNull();
  });

  it('undefined activeFeedback → both vote buttons are shown and unpressed', () => {
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['like', 'dislike']} onAction={() => {}} />
    ));
    expect(getByLabelText('Like')).toHaveAttribute('aria-pressed', 'false');
    expect(getByLabelText('Dislike')).toHaveAttribute('aria-pressed', 'false');
  });

  it('collapses the other vote when a vote becomes active (slide-to-fill)', async () => {
    const [vote, setVote] = createSignal<FeedbackVote | undefined>(undefined);
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['like', 'dislike']} activeFeedback={vote()} onAction={() => {}} />
    ));
    // both shown initially → neither collapsed
    expect(getByLabelText('Dislike').closest('[data-feedback-collapsed]')).toBeNull();
    setVote('like');
    await tick();
    expect(getByLabelText('Like')).toHaveAttribute('aria-pressed', 'true');
    // dislike stays mounted but collapses (so the active thumb slides into its place)
    expect(getByLabelText('Dislike').closest('[data-feedback-collapsed]')).not.toBeNull();
  });

  it('still fires onAction with the entry id when a vote/copy button is clicked', () => {
    const onAction = vi.fn();
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['copy', 'like', 'dislike']} onAction={onAction} />
    ));
    fireEvent.click(getByLabelText('Copy'));
    expect(onAction).toHaveBeenCalledWith('copy');
    fireEvent.click(getByLabelText('Like'));
    expect(onAction).toHaveBeenCalledWith('like');
    fireEvent.click(getByLabelText('Dislike'));
    expect(onAction).toHaveBeenCalledWith('dislike');
  });
});

/**
 * The hover reveal is an accessibility contract rather than a fade, and the two
 * failure modes it guards against are both silent: a keyboard user tabbing onto
 * an invisible control, and a touch user whose bar never appears at all.
 *
 * These cases assert the CLASS CONSTRUCTION, and that is honest here only
 * because jsdom applies no stylesheet — a class-based `opacity-0` computes to
 * nothing, so a "is it visible" assertion would pass with the defect in place.
 * The first case is the discriminating one: it fails on the previous
 * construction (`opacity-0 transition-opacity group-hover:opacity-100`) for two
 * independent reasons, a bare hide and a missing focus reveal. The reveal itself
 * is a browser fact and needs a probe; nothing here claims to have measured it.
 */
describe('MessageActionBar hover reveal', () => {
  const bar = (container: HTMLElement) => container.querySelector('[part="actions"]') as HTMLElement;

  it('hides only where hover exists, and reveals on focus as well as hover', () => {
    const { container } = render(() => (
      <MessageActionBar actions={['copy']} onAction={vi.fn()} reveal="hover" />
    ));
    const cls = bar(container).className;

    // A BARE `opacity-0` is the defect: on a device with no hover it hides the
    // bar with nothing able to reveal it. The hidden state must carry the query.
    expect(cls).not.toMatch(/(^|\s)opacity-0(\s|$)/);
    expect(cls).toContain('@media(hover:hover)');

    // Focus has to reveal it too, or a keyboard user focuses something they
    // cannot see (WCAG 2.4.7, Focus Visible).
    expect(cls).toContain('group-focus-within:opacity-100');
    expect(cls).toContain('group-hover:opacity-100');
  });

  it('keeps the buttons in the tree, named and reachable, while the bar is hidden', () => {
    const { getByLabelText } = render(() => (
      <MessageActionBar actions={['copy']} onAction={vi.fn()} reveal="hover" />
    ));
    // The reveal is visual: the control must stay announced and focusable whatever
    // its opacity. `display: none` and `visibility: hidden` are the two ways to
    // hide it from assistive tech instead of from the eye.
    const copy = getByLabelText('Copy');
    expect(copy.tagName).toBe('BUTTON');
    expect(copy).toBeVisible();
    expect(copy).not.toHaveAttribute('hidden');
  });

  it('leaves the default reveal alone', () => {
    const { container } = render(() => (
      <MessageActionBar actions={['copy']} onAction={vi.fn()} />
    ));
    // `always` is the default and must stay unqualified: no opacity state of any
    // kind, since only the hover path was ever wrong.
    expect(bar(container).className).not.toContain('opacity-');
  });
});

describe('MessageAvatar', () => {
  it('renders an img when src is set', () => {
    const { container } = render(() => (
      <MessageAvatar src="https://example.com/a.png" alt="Demo User" fallback="DU" />
    ));
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
    expect(img).toHaveAttribute('alt', 'Demo User');
  });

  it('renders the fallback text when there is no src', () => {
    const { container, getByText } = render(() => (
      <MessageAvatar src="" alt="Demo User" fallback="DU" />
    ));
    expect(container.querySelector('img')).toBeFalsy();
    expect(getByText('DU')).toBeInTheDocument();
  });
});
