# Sonner-style collapsed toast stacking — design

**Date:** 2026-06-21 · **Branch:** `feat/chat-interactions` (PR #102) · **Status:** approved, pre-plan

## Problem / goal

Today `ToastRegion` renders an **expanded** vertical column (`flex flex-col gap-2`, capped at `max`, overflow queued). When several toasts land at once that column gets tall and busy. Add an **opt-in collapsed mode** (à la Sonner): the toasts pile as layered cards — only the front (newest) fully visible, the others peeking behind with a small offset + scale — and **expand to the full column on hover / focus-within**. It keeps the corner tidy while a burst settles, and reads as a polished, familiar pattern.

## Decisions (settled with Rob)

- **Opt-in.** A new `stack` prop, default `'expanded'` — **no behavior change** for existing consumers or the in-chat (target-scoped) toasts. Collapsed is enabled explicitly.
- **Imperative singleton config** via **`configureToasts({ stack?, position?, max? })`** — the `toast()` singleton has no element to set a prop on, so a module-level config (applied to the auto-mounted region) is the knob. Called once at app start.
- **Rendering technique:** fixed per-depth offsets + a single measured pill height — **not** Sonner's full per-pill height-measurement (our pills are single-line; see Non-goals).

## Architecture

A single new prop drives one render branch in `ToastRegion`. Everything else is untouched.

- `ToastRegionProps.stack?: 'expanded' | 'collapsed'` (default `'expanded'`).
- `ToastPosition`, `max`, the queue (`visible()` = newest-first, sliced to `max`), the `target`/`position` anchoring (`anchorStyle`/`ANCHOR_FLEX`), and the `Toast` pill (with its `createPresence` enter/exit) are **unchanged**.
- `stack='expanded'` → today's exact markup (`flex flex-col gap-2` + position classes/anchor style). The collapsed path is additive and isolated.

### Collapsed rendering

The `visible()` pills are laid out by **depth index** `i` (0 = newest = front, highest `z-index`). All pills share a common anchored origin and are positioned by transform so the two states animate via a single CSS transition on `transform`/`opacity`.

- **Resting (collapsed):** pill `i` → `translateY(peekDir · OFFSET · i) scale(1 − SCALE_STEP · i)`, with a slight opacity falloff for `i ≥ 1`. `transform-origin` and `peekDir` flip by position — **top-\*** pile downward from the top edge (`origin: top`, `+OFFSET`); **bottom-\*** pile upward from the bottom edge (`origin: bottom`, `−OFFSET`). Reuses the existing top/bottom split.
- **Expanded (`pointerenter` / `focus-within` on the region):** pill `i` → `translateY(dir · (rowHeight + GAP) · i) scale(1)`, full opacity — i.e. the normal column. `dir` is the **same per-position sign** as the collapsed `peekDir` (top-\* grow downward `+`, bottom-\* grow upward `−`), so the stack expands away from the anchored edge in both states.
- **`rowHeight`:** measured once from the front pill's `offsetHeight` (a `ref` + `ResizeObserver` on **one** pill), since all pills are single-line and uniform; falls back to a constant (`~48px`) before measurement. This avoids per-pill measurement while staying correct across themes/fonts.
- **Starting constants (tune during IVP):** `OFFSET ≈ 14px`, `SCALE_STEP ≈ 0.05`, `GAP = 8px` (matches today's `gap-2`), opacity `1 / 0.9 / 0.8…`.
- **`prefers-reduced-motion`:** skip the transforms + transition entirely — render the plain expanded column (exactly what ships today). The collapse is motion polish, never required to read a toast.

State for collapsed-vs-expanded is a local `expanded` signal toggled by `pointerenter`/`pointerleave` + `focusin`/`focusout` on the region wrapper.

### Imperative singleton config

```ts
// toast-store.ts
export interface ToastConfig { stack?: 'expanded' | 'collapsed'; position?: ToastPosition; max?: number }
export function configureToasts(config: ToastConfig): void; // merges into a module-level config
```

`ensureMounted()` applies the current config to the region it creates — sets `stack` / `position` as attributes and binds `max`. If `configureToasts` is called **after** the singleton mounts, it updates the live region too (so order-independence holds). Declarative users ignore this and just set `<kai-toast-region stack="collapsed">`.

### Element facade

`src/elements/toast.tsx` adds `stack?: 'expanded' | 'collapsed'` to the `kai-toast-region` `Props` (scalar attribute `stack`, default `'expanded'`), passed through to `ToastRegion`. This regenerates `element-meta.json`, the React wrapper, and the docs PropTable via `build:api` (commit those, per the stale-artifact lesson).

## Accessibility

- Region stays `role="region"` `aria-live="polite"` — announcements unchanged.
- All `max` pills remain in the DOM and focusable while collapsed; **`focus-within` expands the pile**, so keyboard / AT users get the full, readable, non-overlapping list. The collapse is purely presentational.
- Each pill keeps `role="status"` and its dismiss/action controls reachable in both states.

## Testing

Unit (`src/components/toast.test.tsx`, jsdom — assert classes/inline styles, not pixels):
- `stack='expanded'` (default) renders today's column markup (regression guard).
- `stack='collapsed'` applies depth transforms; front pill has the highest z-index / no offset.
- Top vs bottom position flips the peek direction / transform-origin.
- `pointerenter` (and `focusin`) sets the expanded state; `pointerleave`/`focusout` collapses.
- `prefers-reduced-motion` (mock `matchMedia`) → no collapse transforms.

Unit (`src/primitives/toast-store.test.ts`):
- `configureToasts({ stack, position, max })` → the auto-mounted singleton region gets the matching attributes; calling it after mount updates the live region.

## Verification (IVP before "done")

- Rebuild the kit (stale-dist footgun), restart docs. Playwright-IVP in **both themes**: collapsed pile resting → hover expands → leave collapses; works at a top and a bottom position; reduced-motion shows the plain column. Re-capture the docs `ToastDemo` (now with a stack toggle).
- `npm test` green, `npm run typecheck` (4 passes), docs build clean.

## Files touched

- `src/components/toast.tsx` — `stack` prop + collapsed render branch + `expanded` signal + single-pill height measure.
- `src/primitives/toast-store.ts` — `ToastConfig`, `configureToasts`, `ensureMounted` applies config.
- `src/elements/toast.tsx` — expose `stack` on the facade (+ regenerated `element-meta.json` / React wrapper / docs tables).
- `src/components/toast.test.tsx`, `src/primitives/toast-store.test.ts` — coverage above.
- `docs-site/src/components/ToastDemo.tsx` — a `Stack: expanded | collapsed` toggle alongside the Position pills.
- `src/elements/toast.stories.tsx` — a collapsed-stacking story.

## Non-goals (YAGNI)

- Per-pill height measurement for multi-line toasts (our pills are single-line `truncate`; revisit only if multi-line toasts land).
- Swipe-to-dismiss, a "+N more" overflow badge, or per-toast stack overrides.
- Changing the default mode, the queue semantics, or the position/anchor behavior.
