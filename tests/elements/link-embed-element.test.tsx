// tests/elements/link-embed-element.test.tsx
import { afterEach, describe, expect, test } from 'vitest';
import '../../src/elements/link-card';
import '../../src/elements/embed';
import type { CardEvent } from '../../src/primitives/card-contract';
import { CARD_EVENT_NAME } from '../../src/primitives/card-routing';
import { configureEmbedAllowlist, __resetEmbedAllowlistForTests } from '../../src/primitives/embed-providers';

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.querySelectorAll('kc-link-card, kc-embed').forEach((e) => e.remove());
  __resetEmbedAllowlistForTests();
});

test('both kc-link-card and kc-embed register', () => {
  expect(customElements.get('kc-link-card')).toBeTruthy();
  expect(customElements.get('kc-embed')).toBeTruthy();
});

describe('kc-link-card element', () => {
  test('renders the preview from the data property', async () => {
    const el = document.createElement('kc-link-card') as HTMLElement & {
      cardId: string;
      data: unknown;
    };
    el.cardId = 'card-1';
    el.data = { url: 'https://example.com/x', title: 'Hello', siteName: 'Example' };
    document.body.appendChild(el);
    await flush();
    const root = el.shadowRoot!;
    expect(root.querySelector('a')).toBeTruthy();
    expect(root.textContent).toContain('Hello');
    expect(root.textContent).toContain('Example');
  });

  test('activating the card dispatches a bubbling, composed kc-card open event', async () => {
    const el = document.createElement('kc-link-card') as HTMLElement & {
      cardId: string;
      data: unknown;
    };
    el.cardId = 'card-1';
    el.data = { url: 'https://example.com/x', title: 'Hello' };
    document.body.appendChild(el);
    await flush();

    // Listen on a WRAPPER (proves bubbling + composed crossing the shadow boundary).
    let received: CardEvent | undefined;
    document.addEventListener(CARD_EVENT_NAME, (e) => {
      received = (e as CustomEvent<CardEvent>).detail;
    });
    el.shadowRoot!.querySelector('a')!.click();
    expect(received).toMatchObject({
      kind: 'open',
      url: 'https://example.com/x',
      target: 'tab',
      cardId: 'card-1',
    });
  });
});

describe('kc-embed element', () => {
  test('facade has NO iframe before play, exactly one after, open bubbles', async () => {
    const el = document.createElement('kc-embed') as HTMLElement & {
      cardId: string;
      data: unknown;
    };
    el.cardId = 'card-2';
    el.data = { provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'Intro' };
    document.body.appendChild(el);
    await flush();
    const root = el.shadowRoot!;
    expect(root.querySelector('iframe')).toBeNull();

    root.querySelector<HTMLButtonElement>('button[aria-label="Play Intro"]')!.click();
    await flush();
    expect(root.querySelectorAll('iframe')).toHaveLength(1);

    // The "Open on YouTube" affordance bubbles a composed kc-card open event.
    let received: CardEvent | undefined;
    document.addEventListener(CARD_EVENT_NAME, (e) => {
      received = (e as CustomEvent<CardEvent>).detail;
    });
    const openBtn = Array.from(root.querySelectorAll('button')).find((b) =>
      /Open on YouTube/.test(b.textContent ?? ''),
    )!;
    openBtn.click();
    expect(received).toMatchObject({ kind: 'open', target: 'tab', cardId: 'card-2' });
  });

  test('generic embed is blocked unless its origin is allowlisted', async () => {
    const el = document.createElement('kc-embed') as HTMLElement & {
      cardId: string;
      data: unknown;
    };
    el.cardId = 'card-3';
    el.data = { provider: 'generic', url: 'https://player.example.com/v', title: 'G' };
    document.body.appendChild(el);
    await flush();
    // Blocked: inline error, no play button.
    expect(el.shadowRoot!.textContent).toContain("Can't load this video");

    // Allowlist + re-render a fresh element → now playable.
    configureEmbedAllowlist(['https://player.example.com']);
    const el2 = document.createElement('kc-embed') as HTMLElement & {
      cardId: string;
      data: unknown;
    };
    el2.cardId = 'card-3b';
    el2.data = { provider: 'generic', url: 'https://player.example.com/v', title: 'G' };
    document.body.appendChild(el2);
    await flush();
    expect(el2.shadowRoot!.querySelector('button[aria-label="Play G"]')).toBeTruthy();
  });
});
