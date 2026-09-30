/**
 * WHEN a message's action bar appears — the reveal rule, driven through the real
 * components.
 *
 * The default is keyed to the TURN, not to the thread. A user message is read back, so
 * its actions wait for the reader to point at it or focus into it; an assistant message's
 * actions are the ones a reader reaches for while reading forward, so they stay put. An
 * explicit `actionsReveal` wins for every row, in both directions.
 *
 * WHY THE ROW'S `group` CLASS IS ASSERTED HERE TOO, and not just the bar's classes: the
 * bar fades with `group-hover:opacity-100`, so the reveal is a property of the ROW and the
 * bar together. A bar that carries the fade without a `group` ancestor is invisible on
 * hover and looks, in a DOM snapshot, exactly like the working one.
 *
 * KEYBOARD. The hidden state is `opacity`, never `display`/`visibility`, so a hidden
 * action stays a TAB STOP and stays in the accessibility tree; `group-focus-within` is
 * what makes it visible the moment it is focused (WCAG 2.4.7). So the assertions here are:
 * the bar keeps its buttons focusable, and the focus-reveal class is present — the two
 * halves that make a hover-revealed control usable without a pointer.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { MessageBody, resolveActionsReveal } from '../../src/components/message/message';
import { ChatApp } from '../../src/components/chat/chat-app';
import type { ChatMessage } from '../../src/web-components/chat/chat-types';

beforeAll(() => {
  // `ChatApp`'s stick-to-bottom scroller calls `scrollTo` from a rAF, and jsdom has no
  // scrolling at all; an unhandled throw inside the rAF callback fails the whole run.
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

afterEach(cleanup);

/** The classes `MessageActionBar` adds for its hover reveal. */
const HOVER_FADE = 'group-hover:opacity-100';
const FOCUS_FADE = 'group-focus-within:opacity-100';
/** The hidden state, INSIDE the hover-capable media query: a bare `opacity-0` would leave
 *  the bar permanently invisible on a touch device, where no hover ever arrives. */
const HIDDEN = '[@media(hover:hover)]:opacity-0';

function bar(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[part="actions"]');
  if (!el) throw new Error('no action bar rendered');
  return el;
}

function actionButton(container: HTMLElement): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>('[part="actions"] button');
  if (!el) throw new Error('no action button rendered');
  return el;
}

function message(id: string, role: 'user' | 'assistant', text: string): ChatMessage {
  return { id, role, parts: [{ type: 'text', text }] };
}

describe('resolveActionsReveal', () => {
  it('keys an omitted value to the turn', () => {
    expect(resolveActionsReveal(undefined, true)).toBe('hover');
    expect(resolveActionsReveal(undefined, false)).toBe('always');
  });

  it('lets an explicit value win over the turn, in both directions', () => {
    expect(resolveActionsReveal('always', true)).toBe('always');
    expect(resolveActionsReveal('hover', false)).toBe('hover');
  });
});

describe('MessageBody — the reveal default follows the message role', () => {
  it('fades a user turn\'s actions in on hover or focus', () => {
    const { container } = render(() => (
      <MessageBody parts={[{ type: 'text', text: 'hi' }]} isUser markdown={false} actions={['copy']} />
    ));
    const classes = bar(container).className;
    expect(classes).toContain(HOVER_FADE);
    expect(classes).toContain(FOCUS_FADE);
    expect(classes).toContain(HIDDEN);
  });

  it('leaves an assistant turn\'s actions visible at rest', () => {
    const { container } = render(() => (
      <MessageBody parts={[{ type: 'text', text: 'hello' }]} isUser={false} markdown actions={['copy']} />
    ));
    const classes = bar(container).className;
    expect(classes).not.toContain(HOVER_FADE);
    expect(classes).not.toContain(HIDDEN);
  });

  it('takes an explicit reveal over the role default, both ways', () => {
    const always = render(() => (
      <MessageBody parts={[{ type: 'text', text: 'hi' }]} isUser markdown={false} actions={['copy']} actionsReveal="always" />
    ));
    expect(bar(always.container).className).not.toContain(HIDDEN);
    always.unmount();

    const hover = render(() => (
      <MessageBody parts={[{ type: 'text', text: 'hello' }]} isUser={false} markdown actions={['copy']} actionsReveal="hover" />
    ));
    expect(bar(hover.container).className).toContain(HIDDEN);
  });

  // The keyboard half. `opacity` keeps the control in the tab order on purpose (a
  // `display`/`visibility` hide would take it out of the accessibility tree), so a
  // hover-revealed bar must BOTH stay focusable and carry the focus-reveal.
  it('keeps a hover-revealed action focusable, and reveals it on focus', () => {
    const { container } = render(() => (
      <MessageBody parts={[{ type: 'text', text: 'hi' }]} isUser markdown={false} actions={['copy']} />
    ));
    const button = actionButton(container);
    expect(button.tabIndex, 'a hover-revealed action must stay a tab stop').toBe(0);
    expect(button.hasAttribute('hidden'), 'opacity is the only thing hiding it').toBe(false);
    expect(bar(container).className).toContain(FOCUS_FADE);

    button.focus();
    expect(document.activeElement, 'focus must land on the revealed action').toBe(button);
  });
});

describe('ChatApp — one thread, two reveal modes', () => {
  const messages = [message('u1', 'user', 'What is SolidJS?'), message('a1', 'assistant', 'A reactive UI library.')];
  const rowFor = (container: HTMLElement, role: 'user' | 'assistant') =>
    container.querySelector<HTMLElement>(`[data-role="${role}"]`)!;

  it('reveals the user row and pins the assistant row when the prop is omitted', () => {
    const { container } = render(() => (
      <ChatApp messages={messages} userActions={['copy']} assistantActions={['copy']} />
    ));

    expect(rowFor(container, 'user').className, 'the user ROW carries the group the bar fades on').toContain('group');
    expect(rowFor(container, 'assistant').className).not.toContain('group');

    const bars = container.querySelectorAll<HTMLElement>('[part="actions"]');
    expect(bars.length).toBe(2);
    expect(bars[0].className, 'the user bar fades').toContain(HIDDEN);
    expect(bars[1].className, 'the assistant bar does not').not.toContain(HIDDEN);
  });

  it('applies an explicit reveal to every row, whichever way it points', () => {
    const always = render(() => (
      <ChatApp messages={messages} userActions={['copy']} assistantActions={['copy']} actionsReveal="always" />
    ));
    expect(rowFor(always.container, 'user').className).not.toContain('group');
    always.unmount();

    const hover = render(() => (
      <ChatApp messages={messages} userActions={['copy']} assistantActions={['copy']} actionsReveal="hover" />
    ));
    expect(rowFor(hover.container, 'assistant').className, 'the assistant row now fades too').toContain('group');
    expect(bar(hover.container).className).toContain(HIDDEN);
  });

  it('still fires an action from a row whose bar is revealed on hover', () => {
    const { container } = render(() => (
      <ChatApp messages={messages} userActions={['copy']} assistantActions={['copy']} />
    ));
    fireEvent.click(actionButton(container));
    // The bar's own click path must survive being opacity-hidden: the copy button swaps to
    // its success state, which is observable without reading the clipboard.
    expect(container.querySelector('[part="actions"] button')?.getAttribute('aria-label')).toBe('Copied');
  });
});
