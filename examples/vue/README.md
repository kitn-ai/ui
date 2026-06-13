# kitn-chat — Vue 3 example

A minimal, runnable **Vue 3 + Vite** app that uses the kit's web components directly (no wrappers).

## What this demonstrates

- A **static** `import '@kitnai/chat/elements'` in `src/main.ts` **before** `createApp(App).mount(...)` — the elements must be registered/upgraded before Vue stamps the tags.
- The **`.prop` modifier** (`:groups.prop`, `:conversations.prop`, `:messages.prop`, etc.) so Vue sets DOM *properties* rather than stringified attributes — required when passing arrays/objects to Shadow-DOM custom elements.
- `@event` listeners that read `(e as CustomEvent).detail` for `@conversationselect`, `@submit`, `@modelchange`, `@sidebartoggle`, `@newchat`, and `@messageaction`.
- `vite.config.ts` with `isCustomElement: (tag) => tag.startsWith('kitn-')` so Vue treats `kitn-*` tags as native custom elements, not Vue components.
- The flagship `<kitn-chat-workspace>` (sidebar + chat + resize shell) plus a standalone `<kitn-prompt-input>`.

## Prerequisites

Build the kit bundle first (the example uses the local build via a Vite alias):

```bash
# From the repo root
npm run build
```

## Run

```bash
cd examples/vue
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Key patterns

### Import ordering (CRITICAL)

```ts
// src/main.ts
import '@kitnai/chat/elements'; // MUST come before createApp
import '@kitnai/chat/theme.css';
import { createApp } from 'vue';
import App from './App.vue';
createApp(App).mount('#app');
```

If the elements import is late (e.g. inside a component's `onMounted`), Vue sets `[messages]`/`[conversations]` on a not-yet-upgraded element. The element's empty defaults then clobber the data on upgrade → the sidebar/chat render **blank**.

### Property bindings (`.prop` modifier)

```vue
<kitn-chat-workspace
  :conversations.prop="conversations"
  :messages.prop="messages"
  :groups.prop="groups"
  :models.prop="models"
  :activeId.prop="activeId"
  :currentModel.prop="currentModel"
  :loading.prop="loading"
  :theme.prop="theme"
  @submit="onSubmit"
  @conversationselect="onConversationSelect"
></kitn-chat-workspace>
```

### Event handling

```ts
function onSubmit(event: Event): void {
  const { value } = (event as CustomEvent).detail as { value: string };
  // ...
}
```
