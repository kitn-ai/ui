/**
 * F-45 tier 2 (owner-ruled 2026-08-25): STANDALONE-ONLY activation for
 * `<kai-conversation-item>`.
 *
 * Strategy (the toast.declarative.test.tsx pattern): `defineWebComponent`
 * registers a real Shadow-DOM custom element unsuitable for jsdom, so the two
 * halves are tested against the pieces the facade composes:
 *
 *   1. `isStandaloneConversationItem` — the facade's inside/outside decision,
 *      derived from the container's own `conversationRowsOf`
 *      membership rule.
 *   2. `SlottedConversationItem` with `onActivate` — the standalone activation
 *      contract on the row BODY (tabbable, role button, click + Enter/Space),
 *      and, with `onActivate` absent (what the facade passes inside a
 *      container), the row stays exactly as before: not tabbable, no
 *      component-level activation — so the container's `kai-conversation-select`
 *      path stays the ONLY one and nothing double-fires.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, fireEvent } from '@solidjs/testing-library';
import { SlottedConversationItem } from './conversation-item';
import { isStandaloneConversationItem, createConversationItemsController } from './conversation-list';

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────────────────
// isStandaloneConversationItem — the inside/outside decision
// ─────────────────────────────────────────────────────────────────────────────

describe('isStandaloneConversationItem', () => {
  it('is false for a direct child of <kai-conversations> (the container runs activation)', () => {
    const container = document.createElement('kai-conversations');
    const item = document.createElement('kai-conversation-item');
    container.appendChild(item);
    expect(isStandaloneConversationItem(item)).toBe(false);
  });

  it('is true outside any <kai-conversations>', () => {
    const rail = document.createElement('div');
    const item = document.createElement('kai-conversation-item');
    rail.appendChild(item);
    expect(isStandaloneConversationItem(item)).toBe(true);
  });

  it('is false for an item nested in a wrapper or folder inside <kai-conversations> (item mode takes every descendant row)', () => {
    const container = document.createElement('kai-conversations');
    const wrapper = document.createElement('details');
    const item = document.createElement('kai-conversation-item');
    wrapper.appendChild(item);
    container.appendChild(wrapper);
    expect(isStandaloneConversationItem(item)).toBe(false);
  });

  it('is true for an item inside another row\'s menu slot (a preview is not a row)', () => {
    const container = document.createElement('kai-conversations');
    const row = document.createElement('kai-conversation-item');
    const menu = document.createElement('div');
    menu.setAttribute('slot', 'menu');
    const preview = document.createElement('kai-conversation-item');
    menu.appendChild(preview);
    row.appendChild(menu);
    container.appendChild(row);
    expect(isStandaloneConversationItem(preview)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SlottedConversationItem — standalone activation on the row body
// ─────────────────────────────────────────────────────────────────────────────

function body(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-kai-item-body]') as HTMLElement;
}

describe('SlottedConversationItem — standalone activation (onActivate set)', () => {
  it('the row body is the activation control: role button, tabbable', () => {
    const { container } = render(() => (
      <SlottedConversationItem conversationId="c-1" onActivate={() => {}}>Q2 plan</SlottedConversationItem>
    ));
    const b = body(container);
    expect(b).toHaveAttribute('role', 'button');
    expect(b).toHaveAttribute('tabindex', '0');
  });

  it('click on the body activates once', () => {
    const onActivate = vi.fn();
    const { container } = render(() => (
      <SlottedConversationItem conversationId="c-1" onActivate={onActivate}>Q2 plan</SlottedConversationItem>
    ));
    fireEvent.click(body(container));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('Enter and Space on the body activate, with the default prevented (no page scroll on Space)', () => {
    const onActivate = vi.fn();
    const { container } = render(() => (
      <SlottedConversationItem conversationId="c-1" onActivate={onActivate}>Q2 plan</SlottedConversationItem>
    ));
    const b = body(container);
    const enter = fireEvent.keyDown(b, { key: 'Enter' });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(enter).toBe(false); // fireEvent returns false when defaultPrevented
    const space = fireEvent.keyDown(b, { key: ' ' });
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(space).toBe(false);
  });

  it('other keys do not activate', () => {
    const onActivate = vi.fn();
    const { container } = render(() => (
      <SlottedConversationItem conversationId="c-1" onActivate={onActivate}>Q2 plan</SlottedConversationItem>
    ));
    fireEvent.keyDown(body(container), { key: 'ArrowDown' });
    fireEvent.keyDown(body(container), { key: 'a' });
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('a click in the menu region never activates the row (the menu is the body\'s sibling)', () => {
    const onActivate = vi.fn();
    const { container } = render(() => (
      <SlottedConversationItem
        conversationId="c-1"
        onActivate={onActivate}
        menu={<button data-testid="row-menu">…</button>}
      >
        Q2 plan
      </SlottedConversationItem>
    ));
    fireEvent.click(container.querySelector('[data-testid="row-menu"]') as HTMLElement);
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('SlottedConversationItem — a control inside the row keeps its own keys and clicks', () => {
  /**
   * The standalone twin of the container case: the SAME shape — an inline editor
   * in the row's default slot, the documented place for the title — reached here
   * through the row body's OWN onClick/onKeyDown rather than a delegated
   * container handler. Before the guard, the body's Enter/Space branch matched
   * any key that bubbled up from inside it, so every SPACE in the editor was
   * `preventDefault()`ed and the input never saw the character.
   *
   * Every negative assertion is paired with the row body doing the same thing
   * below, so none of them can pass by the row simply going inert.
   */
  function renderWithEditor(onActivate: () => void) {
    const { container } = render(() => (
      <SlottedConversationItem conversationId="c-1" onActivate={onActivate}>
        <input aria-label="Rename" />
      </SlottedConversationItem>
    ));
    const input = container.querySelector('input') as HTMLInputElement;
    const title = container.querySelector('[part~="title"]') as HTMLElement;
    return { container, b: body(container), input, title };
  }

  it('a typed title keeps every SPACE and selects nothing', () => {
    const onActivate = vi.fn();
    const { input } = renderWithEditor(onActivate);
    input.focus();
    // jsdom implements no text insertion, so the platform default is applied
    // here and ONLY when the keydown was not default-prevented — a swallowed
    // space and a typed space would otherwise both leave the value empty.
    for (const ch of 'Renamed by keyboard') {
      if (fireEvent.keyDown(input, { key: ch }) !== false) input.value += ch;
    }
    expect(input.value).toBe('Renamed by keyboard');
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('Enter inside the editor neither activates the row nor is prevented', () => {
    const onActivate = vi.fn();
    const { input } = renderWithEditor(onActivate);
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
    expect(fireEvent.keyDown(input, { key: ' ' })).toBe(true);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('a click inside the editor does not activate the row', () => {
    const onActivate = vi.fn();
    const { input } = renderWithEditor(onActivate);
    fireEvent.click(input);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('the row body itself still activates: click, Enter and Space, with the editor present', () => {
    const onActivate = vi.fn();
    const { b, title } = renderWithEditor(onActivate);
    fireEvent.click(b);
    expect(onActivate).toHaveBeenCalledTimes(1);
    // A click on the row's own inert content (the title wrapper around the
    // editor) is still the row speaking.
    fireEvent.click(title);
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(fireEvent.keyDown(b, { key: 'Enter' })).toBe(false);
    expect(fireEvent.keyDown(b, { key: ' ' })).toBe(false);
    expect(onActivate).toHaveBeenCalledTimes(4);
  });
});

describe('SlottedConversationItem — inside a container (onActivate absent), nothing changes', () => {
  it('the body is not tabbable and carries no component-level activation', () => {
    const { container } = render(() => (
      <SlottedConversationItem conversationId="c-1">Q2 plan</SlottedConversationItem>
    ));
    const b = body(container);
    expect(b).not.toHaveAttribute('tabindex');
    // No listener throws / no observable activation channel — the container's
    // controller is the only path. (The click below simply bubbles.)
    fireEvent.click(b);
    fireEvent.keyDown(b, { key: 'Enter' });
  });

  it('the container\'s controller stays the SINGLE activation path — one select per click, no double-fire', () => {
    // The facade passes onActivate only when standalone, so inside a container
    // the component contributes no handler: the container's delegated click is
    // the one and only activation. Wire the ratified controller over the
    // rendered row exactly as `kai-conversations` does and count.
    const onSelect = vi.fn();
    const { container } = render(() => (
      <SlottedConversationItem conversationId="c-7">Q2 plan</SlottedConversationItem>
    ));
    // Stand-in for the element host the controller manages (jsdom cannot
    // upgrade the real facade): the render container carries the identity the
    // way the host attribute does.
    container.setAttribute('conversation-id', 'c-7');
    const controller = createConversationItemsController({
      getItems: () => [container as HTMLElement],
      getActiveId: () => undefined,
      onSelect,
    });
    container.addEventListener('click', (e) => controller.handleClick(e as MouseEvent));
    fireEvent.click(body(container));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('c-7');
  });
});
