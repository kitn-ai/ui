# Live interaction docs-demos + light/dark harness fixes — design

**Date:** 2026-06-21 · **Branch:** `feat/chat-interactions` (PR #102) · **Status:** approved, pre-plan

## Problem

Two linked threads, surfaced from Storybook by Rob:

1. **Light/dark discrepancies** on the toast trigger buttons and on compare. Root-caused: these are **demo-harness / theme-coordination bugs, not component CSS bugs.** Forced-`theme` captures show both `kai-toast-region` and `kai-compare` render correctly in *both* modes.
   - **Image #10 (toast, dark) — blank trigger buttons:** `src/elements/toast.stories.tsx` hardcodes the trigger-button style (`background:#fafafa;border:1px solid #d4d4d8`, no text color) → invisible on a dark surface. Pure story scaffolding.
   - **Image #11 (compare, washed-out labels):** Storybook **autodocs** renders stories *outside* `#storybook-root`. The theme mirror in `.storybook/preview.ts` only walks `#storybook-root`, so autodocs-rendered `kai-*` elements never get `theme=` set → they fall back to `theme="auto"` (OS) and mismatch the light docs page.

2. **No live examples in the public docs.** The component reference pages mostly carry static copy-paste snippets. Rob wants genuinely good, *interactive* examples — "that's where I care about them the most." Scope (decided): **all 5 chat-interaction components, curated scenarios.**

## Key enabling finding

Theme coordination is **already a proven pattern** in `docs-site/`. Every existing demo (`ChatDemo`, `CardsDemo`, `Playground`, `HeroChat`) does the same three things:

```ts
const theme = () => document.documentElement.dataset.theme || 'light';   // Starlight sets data-theme on <html>
host.setAttribute('theme', theme());                                      // mirror onto the kai element
new MutationObserver(() => host?.setAttribute('theme', theme()))          // re-sync on toggle
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
```

`kai-*` elements consume `theme` via `src/elements/define.tsx` (`createDarkMode` → `.dark` on an inner wrapper). Themed chrome tokens exist as Tailwind utilities backed by per-theme `--kai-*` vars: `bg-surface` / `bg-bg`, `text-ink` / `text-ink-2` / `text-ink-3`, `border-line`, `bg-brand` (`docs-site/src/styles/tokens.css` + `app.css`). The shared kit loader is `loadKit()` in `docs-site/src/components/example/kit.ts` (dynamic import gated on `customElements.whenDefined('kai-chat')`).

**Implication:** live demos built on this pattern + themed chrome *cannot* reproduce the screenshot bugs. The risk is duplicating the boilerplate 5×, so we extract a small shared helper.

## Design

### A. Shared demo harness helper

Add to `docs-site/src/components/example/kit.ts` (next to `loadKit`):

```ts
// Resolve the site theme, mirror it onto a kai-* element, and keep it in sync.
// Returns a cleanup. Call inside onMount after the element is in the DOM.
export function syncKaiTheme(el: HTMLElement): () => void;
```

It reads `document.documentElement.dataset.theme || 'light'`, sets `el.setAttribute('theme', …)`, and observes `<html>` for `data-theme` changes. Each demo calls `await loadKit()` then `onCleanup(syncKaiTheme(el))`. This is the single place the theme contract lives.

### B. Five thin demo components

Solid components under `docs-site/src/components/` (co-locate small fixtures in each), embedded `client:only="solid"`. Each = live element + **themed** trigger chrome (`bg-surface text-ink border-line hover:bg-brand`, never hardcoded) + a caption that echoes the emitted events so the interaction is legible.

| Page (`docs-site/src/content/docs/components/…`) | Element | API used | Curated scenarios |
|---|---|---|---|
| `toast.mdx` | `kai-toast-region` (imperative `toast()` from `@kitn.ai/ui`) | `toast()`, `toast.success()`, `{ action }`, `{ duration:0 }` + `handle.update()` | neutral · success(check) · **Undo** action · sticky→update→success · stack three |
| `compare.mdx` | `kai-compare` | `el.data` (2 candidates), `kai-compare-select` `{chosenId,rejectedIds,at}`, `layout` | **pick** → collapse + caption · **replay streaming** (fresh `data` ref/chunk, `streaming:true`→false) · **tabs** layout toggle |
| `message.mdx` | `kai-message` (action row) | `el.message`, `actionsReveal`, `kai-message-action` `{messageId,action,state?}` | hover-reveal (**tooltip** shows here) · copy→check+toast · **thumbs slide-to-fill** · re-tap clears · caption echoes events |
| `cards.mdx` | `kai-cards` + `dismissRecovery()` policy | `el.cards` (`CardEnvelope[]`), `el.policy = { ...dismissRecovery({get,set,toast,staleAfterMs}) }` | dismiss→stub + **Undo toast** · undo restores · **reopen** from stub → live · expired (stale) path |
| Tooltip | `src/ui/tooltip.tsx` (internal primitive — **no `kai-*` element, no page**) | — | demoed **in-context** inside the `message.mdx` action-row demo (hover a button → label tooltip) |

**Scenario notes (accurate to source):**
- Toast: default duration is **5000ms**; with an `action` the floor is **7000ms** (`src/primitives/toast-store.ts`). The `toast()` handle is `{ id, dismiss, update }`.
- Cards: `dismissRecovery({ get, set, toast, staleAfterMs })` returns `{ onDismiss, onReopen }` to spread into `policy`. The injected `toast` adapter is the `RecoveryToast` shape `{ show({ message, action:{label,onClick}, durationMs }) }` — adapt the kit `toast()` to it (cards never import toast directly). Undo restores the prior resolution; reopen clears resolution unless terminal/stale (→ `expired`).
- Compare streaming: reassign a **new `data` reference per chunk** (never mutate in place) or it won't re-render.

### C. Embedding pattern

Each `.mdx` gets the live demo at the top of its Examples area; the existing copy-paste snippet stays **beneath** it (live demo + copyable code = the established docs pattern, matching `cards.mdx` / `message.mdx`). `compare.mdx` and `toast.mdx` currently have only static snippets and gain a live demo; `message.mdx` and `cards.mdx` already have a `Playground` — the curated demo is added alongside, not replacing it.

### D. Storybook harness fixes (the actual screenshots)

1. `src/elements/toast.stories.tsx` — replace the hardcoded `BTN` constant with **`.dark`-aware** styling so trigger buttons read in dark. The buttons are light-DOM, so the kit's shadow-scoped `--color-*` tokens may not resolve at document level — the plan must verify and pick a mechanism that works in the Storybook document (e.g. a CSS class keyed off the `.dark` that storybook-dark-mode puts on `<html>`, or the `light-dark()` CSS function with `color-scheme`). Also refresh the stale "~2s" copy → 5s.
2. `.storybook/preview.ts` — widen `applyElementTheme()` to walk the **whole document** for `kai-*` (not just `#storybook-root`), covering autodocs-rendered elements and the body-mounted `kai-toast-region`.
3. `src/elements/compare.stories.tsx` — replace the `#666` caption color with a token (same class of bug).

## Out of scope / non-goals

- No changes to the shipped component CSS (verified correct in both themes). If verification later shows a genuine component contrast issue, that's a separate fix.
- No new `kai-feedback-bar` work — the action-row feedback lives in `kai-message`.
- No standalone tooltip page/element — it's an internal primitive, demoed in context.
- No changes to `PropTable`/`EventTable` generation or `element-meta.json`.

## Verification (per standing practice — IVP before "done")

1. Build/run `docs-site`; Playwright-screenshot each of the 5 demos in **both** light + dark; confirm readable chrome, no theme mismatch, and each scenario visibly works (pick collapses, toast Undo restores, thumbs slide, card dismiss→stub→undo).
2. Re-capture the fixed Storybook stories (toast story canvas dark; compare autodocs) to confirm Images #10/#11 are resolved.
3. `npm test` stays green (1361). `docs-site` typecheck/build passes. Run `npm run typecheck` for the kit (story files are typechecked).

## Files touched (anticipated)

- `docs-site/src/components/example/kit.ts` (+`syncKaiTheme`)
- `docs-site/src/components/{ToastDemo,CompareDemo,FeedbackDemo,CardDismissDemo}.tsx` (new)
- `docs-site/src/content/docs/components/{toast,compare,message,cards}.mdx` (embed demos)
- `.storybook/preview.ts`, `src/elements/toast.stories.tsx`, `src/elements/compare.stories.tsx`
