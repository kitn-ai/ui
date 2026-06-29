'use client';

// ─────────────────────────────────────────────────────────────────────────────
// THE key file for Next.js App Router consumers.
//
// `'use client'` IS REQUIRED here, for two independent reasons:
//
//   1. Registration is a browser-only side effect. `import '@kitn.ai/ui/elements'`
//      registers the custom elements via `customElements.define(...)`. A Server
//      Component's module code never ships to the browser, so if this import
//      lived in a Server Component the elements would never upgrade — the
//      `<kai-*>` tags would render as inert markup with an empty shadow root.
//
//   2. Wiring is browser-only too: array/object props are assigned as live DOM
//      *properties* and `kai-*` events are non-bubbling CustomEvents you listen
//      for with `addEventListener`. Both need refs + effects, i.e. client hooks.
//
// Pattern: keep your pages/layouts as Server Components and isolate the kit in a
// small `'use client'` island like this one (rendered from app/page.tsx).
//
// NOTE: this example talks to the custom elements directly (intrinsic `<kai-*>`
// JSX) rather than the `@kitn.ai/ui/react` wrappers. See README.md → "Known
// issue: the React wrappers don't build under Next.js" for why.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

// Side-effect import: registers ALL kai-* elements (browser-only; SSR no-op).
import '@kitn.ai/ui/elements';
// Typed element interface (so `el.groups = ...` etc. is type-checked).
import type { KaiConversationsElement } from '@kitn.ai/ui/elements';

const GROUPS = [
  { id: 'g-today', name: 'Today', sortOrder: 0, createdAt: '2026-06-29T09:00:00Z' },
  { id: 'g-earlier', name: 'Earlier', sortOrder: 1, createdAt: '2026-06-28T09:00:00Z' },
];

const CONVERSATIONS = [
  {
    id: 'c-1',
    title: 'Wire up streaming responses',
    groupId: 'g-today',
    scope: { type: 'collection' as const },
    messageCount: 12,
    lastMessageAt: '2026-06-29T10:15:00Z',
    updatedAt: '2026-06-29T10:15:00Z',
  },
  {
    id: 'c-2',
    title: 'Design the tool-call panel',
    groupId: 'g-today',
    scope: { type: 'collection' as const },
    messageCount: 5,
    lastMessageAt: '2026-06-29T08:40:00Z',
    updatedAt: '2026-06-29T08:40:00Z',
  },
  {
    id: 'c-3',
    title: 'Markdown + code highlighting',
    groupId: 'g-earlier',
    scope: { type: 'collection' as const },
    messageCount: 23,
    lastMessageAt: '2026-06-28T16:05:00Z',
    updatedAt: '2026-06-28T16:05:00Z',
  },
];

export default function KaiDemo() {
  const convRef = useRef<KaiConversationsElement>(null);
  const [activeId, setActiveId] = useState('c-1');
  const [clicks, setClicks] = useState(0);

  // Array/object props (groups, conversations) must be set as DOM *properties*,
  // not HTML attributes. A NEW reference per update is what re-renders the element.
  //
  // Registration via the register-all bundle is ASYNC (it lazy-loads each
  // element's chunk), so on first mount the element may not be upgraded yet.
  // Setting a property on a not-yet-upgraded element is lost on upgrade — so we
  // wait for `customElements.whenDefined` before assigning. (The React wrappers
  // do this for you; here we're driving the element directly.)
  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      const el = convRef.current;
      if (cancelled || !el) return;
      el.groups = GROUPS;
      el.conversations = CONVERSATIONS;
      el.activeId = activeId;
    };
    if (customElements.get('kai-conversations')) apply();
    else customElements.whenDefined('kai-conversations').then(apply);
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // kai-* events are non-bubbling CustomEvents — listen on the element itself.
  useEffect(() => {
    const el = convRef.current;
    if (!el) return;
    const onSelect = (e: Event) => setActiveId((e as CustomEvent<{ id: string }>).detail.id);
    el.addEventListener('kai-conversation-select', onSelect);
    return () => el.removeEventListener('kai-conversation-select', onSelect);
  }, []);

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      {/* A simple, scalar-prop element. The native `click` is composed, so a
          React onClick on the host catches it. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <kai-button variant="default" onClick={() => setClicks((c) => c + 1)}>
          Click me
        </kai-button>
        <kai-button variant="outline" icon="plus">
          New
        </kai-button>
        <span data-testid="click-count">clicked {clicks}×</span>
      </div>

      {/* A data-driven element: array/object props (set via ref) + an event. */}
      <div
        style={{
          maxWidth: 320,
          height: 420,
          border: '1px solid var(--kai-border, #e5e5e5)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <kai-conversations ref={convRef} />
      </div>

      <p data-testid="active-id">active: {activeId}</p>
    </section>
  );
}
