# kc-chat — React example

This example shows how to use the `@kitn.ai/chat` web components inside a
**React + Vite + TypeScript** application.

## What it demonstrates

- **Registering custom elements** — a single side-effect import
  (`import '@kitn.ai/chat/elements'`) registers `<kc-chat>`,
  `<kc-conversations>`, and `<kc-prompt-input>` globally.

- **Setting properties via `ref` + `useEffect`** — React only sets *attributes*
  on custom elements. Objects like `messages` and `conversations` must be
  assigned as DOM *properties*. The pattern is:

  ```tsx
  const chatRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    (el as any).messages = messages;
    (el as any).loading = loading;
  }, [messages, loading]);

  // In JSX:
  <kc-chat ref={chatRef} />
  ```

- **Listening for custom events** — `submit`, `messageaction`, `select`,
  `newchat`, and `togglesidebar` are native `CustomEvent`s dispatched on the
  element. Wire them with `addEventListener` inside a `useEffect`, and clean up
  with the returned function:

  ```tsx
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const onSubmit = (e: Event) => { /* handle (e as CustomEvent).detail */ };
    el.addEventListener('submit', onSubmit);
    return () => el.removeEventListener('submit', onSubmit);
  }, [activeId, allMessages]);
  ```

- **JSX type declarations** — `src/global.d.ts` extends
  `React.JSX.IntrinsicElements` so TypeScript accepts the custom-element tags
  without errors.

- **Simulated streaming** — the `submit` handler streams a canned reply
  word-by-word to show how progressive content updates would feel in a real app.

- **Theme toggle** — a button cycles between `light` and `dark`, passed to both
  elements as the `theme` property.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

## Build

```bash
npm run build      # tsc + vite build
npm run typecheck  # tsc --noEmit (type-check only)
```
