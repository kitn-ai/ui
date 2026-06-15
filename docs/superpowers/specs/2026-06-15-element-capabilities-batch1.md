# Spec — element capabilities batch 1: reveal + avatar + custom actions

Closes the three highest-value recurring gaps from
`2026-06-15-element-capability-gaps.md` on `kc-message` (and `kc-chat` per
message). Pre-1.0: backward compatibility is **not** required; prefer the clean
shape. Default behavior stays "actions always visible" (sensible default, not for
back-compat).

## 1. Types — `src/elements/chat-types.ts`

```ts
export type ChatMessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit'; // built-ins
export interface CustomAction { id: string; label: string; icon?: string }          // icon = curated name
export interface MessageAvatar { src?: string; fallback?: string; alt?: string }

export interface ChatMessage {
  // …existing…
  actions?: (ChatMessageAction | CustomAction)[];   // was ChatMessageAction[]
  avatar?: MessageAvatar;                            // NEW
}
```

The `messageaction` event detail `action` widens to **`string`** (built-in name OR custom id).

## 2. Curated icon registry — new `src/ui/action-icons.ts`

A fixed `name → lucide-solid Component` map (NO arbitrary SVG/URL). Cover the
built-in action icons + common custom ones:
`copy, like(ThumbsUp), dislike(ThumbsDown), regenerate(RefreshCw), edit(Pencil),
share, bookmark, download, link, trash(Trash2), check, x, star, flag, reply, more(MoreHorizontal)`.
Export `actionIcon(name?: string): Component<{class?:string}> | undefined` (undefined → render label-only)
and `BUILTIN_ACTION_LABEL: Record<ChatMessageAction,string>`. Reuse for kc-checkpoint/kc-empty later.

## 3. Shared action bar — `src/components/message.tsx`

Add `MessageActionBar` rendering the buttons from `(ChatMessageAction|CustomAction)[]`:
- string entry → built-in label+icon (from registry); object entry → custom label + `actionIcon(icon)` (label-only if unknown/absent).
- prop `reveal?: 'always' | 'hover'` (default `always`); `hover` → bar gets `opacity-0 group-hover:opacity-100 transition-opacity` (parent row must carry `group`).
- `onAction(id: string)` callback; emits the built-in name or custom id.
Replaces the duplicated `<For each={actions}>…Button…` blocks in BOTH render paths.

## 4. Avatar rendering

In **both** `src/elements/message.tsx` (kc-message) and `src/components/chat-thread.tsx`:
render `<MessageAvatar src alt fallback />` from `message.avatar` when present.
Layout: when an avatar exists, the row is `[avatar | content-column]` (use the default
`Message` flex-row with a `flex-1` column inside); when absent, keep today's column layout.

## 5. Element props / wiring

- `kc-message` (`src/elements/message.tsx`): new prop `actionsReveal: 'always' | 'hover'` (attr `actions-reveal`, default `'always'`), passed to `MessageActionBar reveal`. Add `group` to the row when reveal=hover. Render avatar from `message.avatar` (or new scalar conveniences `avatarSrc`/`avatarFallback` mirroring `content`/`role`). Emit `messageaction` `{ messageId, action: string }`.
- `kc-chat` (`src/elements/chat.tsx` → `chat-thread.tsx`): new prop `actionsReveal` forwarded so every message row honors it; per-message `avatar` + custom `actions` already flow through the `messages` payload.

## 6. Tests (TDD — write first)

Unit (Storybook/vitest, near existing message tests):
- built-in actions still render + emit their name.
- a custom action `{id:'share',label:'Share',icon:'share'}` renders a button with the share icon and emits `'share'`.
- `actionsReveal="hover"` adds the opacity/group-hover classes; `"always"` does not.
- `message.avatar` renders the avatar (img when `src`, fallback text otherwise); absent → no avatar.
- unknown custom `icon` → label-only button (no crash).

## 7. Finish

- Regenerate metas from the MAIN checkout: `npm run build` (postbuild runs `build:api` → updates `element-meta.json`, `component-meta.json`, `framework-usage.json`, and the generated React wrappers). Commit the regenerated metas.
- Gate: `tsc --noEmit`, `npm test`, `npm run test:react`, `npm run test:storybook`, build.
- Playwright IVP: a story exercising avatar + a custom action + hover-reveal.
- This is a `feat!` (pre-1.0 → minor) when merged.
