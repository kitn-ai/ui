# Live Interaction Docs-Demos + Light/Dark Harness Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add genuinely interactive, curated live demos for the 5 chat-interaction components to the public docs, and fix the Storybook light/dark harness bugs behind the reported discrepancies.

**Architecture:** Build each demo on the docs-site's proven island pattern (`loadKit()` → `customElements.upgrade(host)` → set JS props → mirror the Starlight `data-theme` onto the element's `theme` attribute via a `MutationObserver`). Extract the theme-sync boilerplate into a shared `syncKaiTheme(el)` helper, plus a `syncToastRegionTheme()` for the body-mounted toast overlay. Demos use themed chrome tokens (`bg-surface`, `text-ink*`, `border-line`, `bg-brand`) so they never break in dark. Separately, fix the Storybook story scaffolding (hardcoded toast trigger buttons) and widen the `preview.ts` theme mirror to reach autodocs + body-mounted elements.

**Tech Stack:** Astro Starlight (`docs-site/`), SolidJS islands (`client:only="solid"`), the `@kitn.ai/ui` kit bundle served at `/kitn/kitn-chat.es.js`, Storybook (`storybook-solidjs-vite`), Playwright (already in repo) for visual verification.

## Global Constraints

- **`kai-` prefix only** for elements (`kai-toast-region`, `kai-compare`, `kai-message`, `kai-cards`). Never `kitn-`.
- **Array/object props are JS properties**, never HTML attributes (`el.data = …`, `el.cards = …`, `el.message = …`, `el.policy = …`). Only scalars work as attributes (`theme`, `layout`, `actionsReveal`).
- **Streaming needs a NEW array/object reference per chunk** — never mutate in place, or the element won't re-render.
- **Events are non-bubbling `kai-*` CustomEvents** — listen on the element itself (`kai-compare-select`, `kai-message-action`). Read `event.detail`.
- **Themed chrome only** — every demo button/caption/surface uses the docs tokens (`bg-surface`, `bg-surface-2`, `text-ink` / `text-ink-2` / `text-ink-3`, `border-line`, `bg-brand`). NO hardcoded hex/rgb colors anywhere in a demo or story (that is the bug being fixed).
- **Theme contract:** every `kai-*` element a demo mounts (including the lazily body-mounted `kai-toast-region`) must mirror `document.documentElement.dataset.theme`. Defaulting to `theme="auto"` is the bug.
- **Copy/voice:** sharp human engineer, web-components-first, no emoji (`docs-site/STYLE.md`).
- **Demos use already-shipped element APIs** — no kit source rebuild is required for the demos to run against the existing `/kitn/kitn-chat.es.js` bundle.
- **Verification is visual/integration**, not unit: docs-site has no unit runner. Each demo task is gated by `astro` typecheck/build + a Playwright capture in BOTH themes. The kit's `npm test` (1361) + `npm run typecheck` must stay green (story-file changes are typechecked).

---

## File Structure

- `docs-site/src/components/example/kit.ts` — **modify**: add `getKit()` (returns the kit module namespace, awaiting `whenDefined`), `syncKaiTheme(el)`, `syncToastRegionTheme()`; make `loadKit()` delegate to `getKit()`.
- `docs-site/src/components/ToastDemo.tsx` — **create**: themed trigger buttons driving the imperative `toast()` API; themes the body-mounted region.
- `docs-site/src/components/CompareDemo.tsx` — **create**: live `kai-compare` with pick caption, replay-streaming, and a layout toggle.
- `docs-site/src/components/FeedbackDemo.tsx` — **create**: a `kai-message` assistant row showing copy / thumbs slide-to-fill / tooltip-on-hover, with an event console.
- `docs-site/src/components/CardDismissDemo.tsx` — **create**: a `kai-cards` dismissible card with dismiss→stub→Undo-toast→reopen, event console.
- `docs-site/src/content/docs/components/toast.mdx` — **modify**: embed `ToastDemo`; fix stale `2000`/`4000`→`5000`/`7000` duration facts.
- `docs-site/src/content/docs/components/compare.mdx` — **modify**: embed `CompareDemo`; fix the layout table (`'stacked'`→`'tabs'`).
- `docs-site/src/content/docs/components/message.mdx` — **modify**: embed `FeedbackDemo` in the action-row section.
- `docs-site/src/content/docs/components/cards.mdx` — **modify**: embed `CardDismissDemo` in the dismiss/recovery section.
- `.storybook/preview.ts` — **modify**: widen `applyElementTheme()` to walk the whole document for `kai-*`.
- `src/elements/toast.stories.tsx` — **modify**: `.dark`-aware trigger buttons; refresh "~2s"→"5s" copy.
- `src/elements/compare.stories.tsx` — **modify**: themed caption (drop `#666`).

---

## Task 1: Storybook harness fixes (the reported screenshots)

These are independent of the demos and address Images #10/#11 directly. Do first.

**Files:**
- Modify: `.storybook/preview.ts` (the `applyElementTheme` walk)
- Modify: `src/elements/toast.stories.tsx` (the `BTN` constant + intro copy)
- Modify: `src/elements/compare.stories.tsx` (the caption color)

**Interfaces:**
- Produces: nothing consumed by later tasks (pure harness fix).

- [ ] **Step 1: Widen the autodocs/body theme mirror in `.storybook/preview.ts`.**

The current `applyElementTheme()` only queries `#storybook-root`, so autodocs-rendered elements and the body-mounted `kai-toast-region` never get `theme=` set. Replace the root-scoped query with a document-wide one:

```ts
  const applyElementTheme = (): void => {
    const dark = document.documentElement.classList.contains('dark');
    // Walk the WHOLE document, not just #storybook-root: autodocs renders stories
    // under .sbdocs (outside #storybook-root), and the imperative toast() mounts a
    // <kai-toast-region> directly on document.body. Both must track the toggle, or
    // they fall back to theme="auto" (OS) and mismatch the page (the autodocs bug).
    document.querySelectorAll('*').forEach((el) => {
      if (el.tagName.toLowerCase().startsWith('kai-')) {
        el.setAttribute('theme', dark ? 'dark' : 'light');
      }
    });
  };
```

Then update the `start()` observer target to observe `document.body` subtree (so autodocs + late body mounts are caught), keeping the `document.documentElement` class observer:

```ts
  const start = (): void => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    schedule();
  };
```

- [ ] **Step 2: Theme the toast story's trigger buttons in `src/elements/toast.stories.tsx`.**

The hardcoded `BTN` (`background:#fafafa;border:1px solid #d4d4d8`) is invisible in dark (Image #10). The buttons are light-DOM, so kit shadow tokens may not resolve at document level — use the `light-dark()` CSS function driven by `color-scheme`, which needs no class wiring. Replace the `BTN` constant and add a `color-scheme` on the wrapper:

```tsx
const BTN =
  'padding:8px 14px;border-radius:8px;border:1px solid light-dark(#d4d4d8,#3a3a3a);' +
  'background:light-dark(#fafafa,#26262b);color:light-dark(#18181b,#fafafa);' +
  'cursor:pointer;margin:0 8px 10px 0;font:inherit;font-size:14px';
```

In `ToastDemo`, set `color-scheme` on the root `div` so `light-dark()` resolves to the Storybook theme (storybook-dark-mode toggles `.dark` on `<html>`; mirror it):

```tsx
  return (
    <div
      style={{ padding: '28px', 'font-family': 'system-ui, sans-serif', 'color-scheme': 'light dark' }}
    >
```

Also refresh the stale duration copy in the intro `<p>`: change "auto-dismisses (~2s; the Undo one stays longer)" to "auto-dismisses (~5s; the Undo one stays up to 7s)".

- [ ] **Step 3: Theme the compare story caption in `src/elements/compare.stories.tsx`.**

Replace the hardcoded `color: '#666'` on the status `<p>` (line ~49) with a theme-aware value:

```tsx
      <p style={{ 'margin-top': '14px', color: 'light-dark(#666, #a1a1aa)', 'font-size': '14px' }}>
```

And add `'color-scheme': 'light dark'` to the `CompareDemo` wrapper `div` style so `light-dark()` resolves.

- [ ] **Step 4: Verify in both Storybook themes with Playwright.**

Storybook must be running (`npm run dev`, port 6006). Capture the toast story canvas in dark and the compare autodocs in light/dark:

```bash
node - <<'EOF'  # run from repo root so playwright resolves
import { chromium } from 'playwright';
const b = await chromium.launch();
async function cap(id, mode, name, view='story') {
  const p = await b.newPage({ viewport:{width:900,height:560}, deviceScaleFactor:2 });
  await p.goto(`http://localhost:6006/iframe.html?id=${id}&viewMode=${view}`, { waitUntil:'networkidle' });
  await p.evaluate((m)=>document.documentElement.classList.toggle('dark', m==='dark'), mode);
  await p.waitForTimeout(400);
  if (id.includes('toast')) await p.evaluate(()=>[...document.querySelectorAll('button')].find(x=>/Success/.test(x.textContent))?.click());
  await p.waitForTimeout(300);
  await p.screenshot({ path:`/tmp/shots/fix-${name}.png` }); await p.close();
}
await cap('components-toast--default','dark','toast-dark');
await cap('components-compare--default','dark','compare-dark','docs');
await cap('components-compare--default','light','compare-light','docs');
await b.close();
EOF
```

Expected: toast trigger buttons readable (dark fill, light text) in dark; compare labels readable, no light-on-dark mismatch. **Read each PNG and confirm** before committing.

- [ ] **Step 5: Commit.**

```bash
git add .storybook/preview.ts src/elements/toast.stories.tsx src/elements/compare.stories.tsx
git commit -m "fix(storybook): theme-aware demo chrome + document-wide theme mirror

Trigger buttons in the toast story hardcoded a light fill (invisible in
dark); switch them to light-dark(). Widen the preview.ts theme mirror to
walk the whole document so autodocs-rendered elements and the body-mounted
kai-toast-region track the light/dark toggle instead of falling back to
theme=auto."
```

---

## Task 2: Shared theme-sync helpers in `kit.ts`

**Files:**
- Modify: `docs-site/src/components/example/kit.ts`

**Interfaces:**
- Produces (consumed by Tasks 3–6):
  - `getKit(): Promise<Record<string, any>>` — resolves to the kit bundle module namespace (which includes `toast`) AFTER `customElements.whenDefined('kai-chat')`.
  - `loadKit(): Promise<unknown>` — unchanged contract (await before touching elements); now delegates to `getKit()`.
  - `syncKaiTheme(el: HTMLElement): () => void` — sets `el`'s `theme` from `data-theme`, observes `<html>`, returns cleanup.
  - `syncToastRegionTheme(): () => void` — theme-syncs any current/future `kai-toast-region` on `document.body`, returns cleanup.

- [ ] **Step 1: Rewrite `kit.ts` to add the helpers.**

```ts
// Load the kit bundle once (idempotent) — shared by every island that mounts a
// kai-* element or the kai-code-block highlighter.
let kitPromise: Promise<Record<string, unknown>> | undefined;

/** Import the kit bundle once and resolve to its MODULE namespace (exports include
 *  `toast`, `configureCodeHighlighting`, …) AFTER the kai-* elements are registered.
 *  The bundle registers elements asynchronously (it dynamic-imports its impl chunk
 *  for SSR-safety), so the import resolving does NOT mean elements are defined —
 *  wait for kai-chat (the coarse bundle registers them all together). */
export function getKit(): Promise<Record<string, unknown>> {
  // BASE_URL is '/' (root); strip any trailing slash so the URL is always '/kitn/…'
  // (a missing slash silently 404s the bundle on the deployed site).
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!kitPromise) {
    kitPromise = import(/* @vite-ignore */ `${base}/kitn/kitn-chat.es.js`).then(
      async (mod: Record<string, unknown>) => {
        await customElements.whenDefined('kai-chat');
        return mod;
      },
    );
  }
  return kitPromise;
}

/** Await before setting properties on a kai-* element (callers ignore the value). */
export function loadKit(): Promise<unknown> {
  return getKit();
}

/** Mirror the Starlight site theme (`data-theme` on <html>) onto a kai-* element's
 *  `theme` attribute and keep it in sync as the user toggles. Call inside onMount
 *  once the element is connected; pass the return value to onCleanup. Without this,
 *  the element defaults to theme="auto" (OS) and can mismatch the page. */
export function syncKaiTheme(el: HTMLElement): () => void {
  const theme = (): string => document.documentElement.dataset.theme ?? 'light';
  el.setAttribute('theme', theme());
  const obs = new MutationObserver(() => el.setAttribute('theme', theme()));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}

/** The imperative `toast()` lazily mounts a <kai-toast-region> on document.body.
 *  Theme-sync it (and any future one) to the site theme. Returns a cleanup. */
export function syncToastRegionTheme(): () => void {
  const cleanups: Array<() => void> = [];
  const apply = (): void => {
    document.querySelectorAll('kai-toast-region').forEach((r) => {
      const el = r as HTMLElement;
      if (!el.dataset.kaiThemed) {
        el.dataset.kaiThemed = '1';
        cleanups.push(syncKaiTheme(el));
      }
    });
  };
  apply();
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true });
  return () => {
    obs.disconnect();
    cleanups.forEach((c) => c());
  };
}
```

- [ ] **Step 2: Typecheck the docs site.**

Run (from `docs-site/`): `npm run typecheck` (or `astro check`). Expected: no new errors from `kit.ts`. If the project lacks a typecheck script, run `npx astro check` in `docs-site/`.

- [ ] **Step 3: Commit.**

```bash
git add docs-site/src/components/example/kit.ts
git commit -m "feat(docs): shared kai theme-sync helpers (getKit, syncKaiTheme, syncToastRegionTheme)"
```

---

## Task 3: ToastDemo + embed in `toast.mdx`

**Files:**
- Create: `docs-site/src/components/ToastDemo.tsx`
- Modify: `docs-site/src/content/docs/components/toast.mdx`

**Interfaces:**
- Consumes: `getKit`, `syncToastRegionTheme` (Task 2).
- Produces: default-exported `ToastDemo` Solid component.

- [ ] **Step 1: Create `docs-site/src/components/ToastDemo.tsx`.**

```tsx
/** Live demo for the imperative toast() API — themed trigger buttons that raise each
 *  toast variant. The region auto-mounts on document.body on the first call (the real
 *  behavior), so we theme-sync it to the site light/dark. */
import { onMount, onCleanup } from 'solid-js';
import { getKit, syncToastRegionTheme } from './example/kit';

type ToastHandle = { update: (p: Record<string, unknown>) => void; dismiss: () => void };
type ToastFn = ((m: string, o?: Record<string, unknown>) => ToastHandle) & {
  success: (m: string, o?: Record<string, unknown>) => ToastHandle;
};

const BTN =
  'cursor-pointer rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-sm font-medium ' +
  'text-ink transition-colors hover:border-ink-3 disabled:opacity-40';

export default function ToastDemo() {
  let toast: ToastFn | undefined;
  onMount(async () => {
    const mod = (await getKit()) as { toast: ToastFn };
    toast = mod.toast;
    onCleanup(syncToastRegionTheme());
  });

  return (
    <div class="not-content my-5 rounded-xl border border-line bg-surface p-5">
      <p class="mb-4 text-sm text-ink-3">
        Click to raise a toast — it slides in top-center and auto-dismisses (5s; the Undo one stays
        up to 7s). The region mounts itself on the first call.
      </p>
      <div class="flex flex-wrap gap-2">
        <button type="button" class={BTN} onClick={() => toast?.('Saved your changes')}>Neutral</button>
        <button type="button" class={BTN} onClick={() => toast?.success('Copied to clipboard')}>Success</button>
        <button
          type="button"
          class={BTN}
          onClick={() =>
            toast?.('Conversation dismissed', {
              action: { label: 'Undo', onAction: () => toast?.success('Restored') },
            })
          }
        >Undo action</button>
        <button
          type="button"
          class={BTN}
          onClick={() => {
            const t = toast?.('Generating report…', { duration: 0 });
            setTimeout(() => t?.update({ message: 'Report ready', variant: 'success', duration: 2000 }), 1600);
          }}
        >Sticky → update</button>
        <button
          type="button"
          class={BTN}
          onClick={() => {
            toast?.('Connecting…');
            toast?.('Syncing files');
            toast?.success('All set');
          }}
        >Stack three</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Embed it in `toast.mdx`.**

Add the import after the existing component imports (after line 11):

```mdx
import ToastDemo from '../../../components/ToastDemo.tsx';
```

Insert the live demo at the top of the `## Examples` section (right after the `## Examples` heading, before `### Success`):

```mdx
## Examples

<ToastDemo client:only="solid" />

### Success
```

- [ ] **Step 3: Fix the stale duration facts in `toast.mdx`.**

The shipped defaults are now **5000ms** / **7000ms** floor (`src/primitives/toast-store.ts`). Update every stale occurrence:
- Line ~63 options table: `` `2000` `` → `` `5000` ``; "the floor is `4000`" → "the floor is `7000`".
- Line ~80: "Auto-dismisses after 2 seconds." → "Auto-dismisses after 5 seconds."
- Line ~90: "stays up at least 4 seconds" → "stays up at least 7 seconds".
- Line ~168 element table: "defaults to `2000` (floor `4000` with an action)" → "defaults to `5000` (floor `7000` with an action)".
- Line ~173 behavior: "(2s default)" → "(5s default)".

- [ ] **Step 4: Verify in both themes with Playwright (see Task 7 harness).** Run the docs dev server, screenshot the toast page light + dark, click a button, confirm the toast AND the trigger buttons are readable in both. Read the PNGs.

- [ ] **Step 5: Commit.**

```bash
git add docs-site/src/components/ToastDemo.tsx docs-site/src/content/docs/components/toast.mdx
git commit -m "feat(docs): live toast demo + correct duration facts (5s/7s)"
```

---

## Task 4: CompareDemo + embed in `compare.mdx`

**Files:**
- Create: `docs-site/src/components/CompareDemo.tsx`
- Modify: `docs-site/src/content/docs/components/compare.mdx`

**Interfaces:**
- Consumes: `loadKit`, `syncKaiTheme` (Task 2).
- Produces: default-exported `CompareDemo`.

- [ ] **Step 1: Create `docs-site/src/components/CompareDemo.tsx`.**

```tsx
/** Live demo for <kai-compare> — pick a response (collapses + reports the pair),
 *  replay both candidates streaming, and toggle the layout. */
import { createSignal, onMount, onCleanup, For } from 'solid-js';
import { loadKit, syncKaiTheme } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;
type Layout = 'auto' | 'columns' | 'tabs';

const PROMPT = 'Fix the N+1 query when loading a cart.';
const A =
  'Batch the per-item lookups into **one query** (`WHERE id IN (…)`) and hydrate the cart from the result — one round-trip instead of N.';
const B =
  'Add a cache in front of the per-item lookup so repeat hits are fast, and let the slow path warm it.';

const baseData = () => ({
  prompt: PROMPT,
  candidates: [
    { id: 'a', label: 'Response A', content: A },
    { id: 'b', label: 'Response B', content: B },
  ],
});

export default function CompareDemo() {
  let host: AnyEl | undefined;
  const [status, setStatus] = createSignal('Pick a response…');
  const [layout, setLayout] = createSignal<Layout>('auto');

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);
    host.data = baseData();
    host.addEventListener('kai-compare-select', (e: Event) => {
      const d = (e as CustomEvent).detail;
      setStatus(`Preferred ${d.chosenId} · rejected ${d.rejectedIds.join(', ')} → send this pair to your model.`);
    });
    onCleanup(syncKaiTheme(host));
  });

  const applyLayout = (l: Layout) => {
    setLayout(l);
    host?.setAttribute('layout', l);
  };

  const reset = () => {
    if (!host) return;
    host.selection = undefined;
    host.data = baseData();
    setStatus('Pick a response…');
  };

  const replay = () => {
    if (!host) return;
    setStatus('Streaming both candidates…');
    const chunks: Record<string, string[]> = { a: A.match(/\S+\s*/g) ?? [A], b: B.match(/\S+\s*/g) ?? [B] };
    let ia = 0;
    let ib = 0;
    host.data = {
      prompt: PROMPT,
      candidates: [
        { id: 'a', label: 'Response A', content: '', streaming: true },
        { id: 'b', label: 'Response B', content: '', streaming: true },
      ],
    };
    const tick = () => {
      if (!host) return;
      if (ia >= chunks.a.length && ib >= chunks.b.length) {
        setStatus('Pick a response…');
        return;
      }
      if (ia < chunks.a.length) ia += 1;
      if (ib < chunks.b.length) ib += 1;
      const cur = host.data as ReturnType<typeof baseData>;
      host.data = {
        ...cur,
        candidates: cur.candidates.map((c) =>
          c.id === 'a'
            ? { ...c, content: chunks.a.slice(0, ia).join(''), streaming: ia < chunks.a.length }
            : { ...c, content: chunks.b.slice(0, ib).join(''), streaming: ib < chunks.b.length },
        ),
      };
      setTimeout(tick, 90);
    };
    tick();
  };

  const CTL = 'cursor-pointer rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-ink';
  const CTL_ON = 'cursor-pointer rounded-md border border-brand bg-brand/10 px-2.5 py-1 text-xs font-medium text-ink transition-colors';

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      <div class="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-xs">
        <span class="font-semibold uppercase tracking-wider text-ink-3">Layout</span>
        <For each={['auto', 'columns', 'tabs'] as Layout[]}>
          {(l) => (
            <button type="button" class={layout() === l ? CTL_ON : CTL} onClick={() => applyLayout(l)}>{l}</button>
          )}
        </For>
        <span class="mx-1 h-3 w-px bg-line" />
        <button type="button" class={CTL} onClick={replay}>Replay streaming</button>
        <button type="button" class={CTL} onClick={reset}>Reset</button>
      </div>
      <div class="p-5">
        {/* @ts-expect-error custom element */}
        <kai-compare ref={(el: HTMLElement) => (host = el as AnyEl)} style={{ display: 'block' }} />
        <p class="mt-3.5 text-sm text-ink-3">{status()}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Embed it in `compare.mdx`.** Add the import after line 11:

```mdx
import CompareDemo from '../../../components/CompareDemo.tsx';
```

Insert a live preview right after the `## Usage` heading intro (after the closing `</script>` code block at line ~51, before the `- **`data`**` bullet list) — or cleaner, add a short `## Try it` section just before `## Usage`:

```mdx
## Try it

<CompareDemo client:only="solid" />

## Usage
```

- [ ] **Step 3: Fix the layout table in `compare.mdx` (lines ~136-140).** The shipped values are `auto | columns | tabs` (verify against `src/components/response-compare.tsx`), not `stacked`:

```mdx
| Value | Behavior |
|---|---|
| `'auto'` (default) | Container query — tabs (pills) on narrow, side-by-side columns when wide. |
| `'columns'` | Always two columns. |
| `'tabs'` | Always tabbed — one candidate at a time with pills to switch. |
```

Also update line ~138's prose if it says "stacked below ~640px" → "tabs below ~640px". **Verify the exact valid `layout` values against the component source before writing** (`grep -n "layout" src/components/response-compare.tsx`).

- [ ] **Step 4: Verify both themes + the pick/stream/tabs interactions with Playwright (Task 7 harness).** Confirm: pick collapses + caption updates; replay shows shimmer→settle; `tabs` shows pills; readable in dark. Read the PNGs.

- [ ] **Step 5: Commit.**

```bash
git add docs-site/src/components/CompareDemo.tsx docs-site/src/content/docs/components/compare.mdx
git commit -m "feat(docs): live compare demo (pick/stream/layout) + correct layout values"
```

---

## Task 5: FeedbackDemo + embed in `message.mdx`

**Files:**
- Create: `docs-site/src/components/FeedbackDemo.tsx`
- Modify: `docs-site/src/content/docs/components/message.mdx`

**Interfaces:**
- Consumes: `loadKit`, `syncKaiTheme` (Task 2).
- Produces: default-exported `FeedbackDemo`.

**Before writing:** read `docs-site/src/data/samples/kai-message.ts` and `src/elements/message.tsx` to confirm the exact `ChatMessage` shape (`id`, `role`, content/`parts` field), the `actions` / `actionsReveal` prop names, and the `kai-message-action` detail (`{ messageId, action, state? }`). Mirror the sample's shape — do not invent fields.

- [ ] **Step 1: Create `docs-site/src/components/FeedbackDemo.tsx`.**

Structure mirrors `CardsDemo.tsx` (preview + Console). Set `el.message` (assistant message, from the verified shape), `el.actionsReveal = 'always'` so the action row is discoverable, and listen for `kai-message-action`, logging each `{ action, state }` to the Console. The tooltip is demonstrated by hovering any action button (it's the internal `Tooltip` the action row already uses — no extra wiring). Caption above the console: "Hover a button for its label tooltip · copy swaps to a check · thumbs slide-to-fill, re-tap to clear."

```tsx
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { loadKit, syncKaiTheme } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;

// NOTE: confirm this shape against docs-site/src/data/samples/kai-message.ts before finalizing.
const MESSAGE = {
  id: 'm1',
  role: 'assistant',
  content:
    'A closure is a function bundled with the variables in scope where it was defined — so it keeps reading and writing those variables even after that outer function has returned.',
};

export default function FeedbackDemo() {
  let host: AnyEl | undefined;
  const [log, setLog] = createSignal<string[]>([]);
  const push = (m: string) => setLog((p) => [...p.slice(-5), m]);

  onMount(async () => {
    await loadKit();
    if (!host) return;
    customElements.upgrade(host);
    host.message = MESSAGE;
    host.actionsReveal = 'always';
    host.addEventListener('kai-message-action', (e: Event) => {
      const d = (e as CustomEvent).detail;
      push(`kai-message-action • ${d.action}${d.state ? `  (${d.state})` : ''}`);
    });
    onCleanup(syncKaiTheme(host));
  });

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      <div class="p-5">
        {/* @ts-expect-error custom element */}
        <kai-message ref={(el: HTMLElement) => (host = el as AnyEl)} style={{ display: 'block' }} />
        <p class="mt-3 text-xs text-ink-3">
          Hover a button for its label tooltip · copy swaps to a check · thumbs slide-to-fill, re-tap to clear.
        </p>
      </div>
      <div class="border-t border-line bg-surface-2 px-4 py-3">
        <div class="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
          <span class="size-1.5 rounded-full bg-brand" /> Console
        </div>
        <div class="min-h-[1.75rem] font-mono text-sm leading-relaxed text-ink-2">
          <Show when={log().length} fallback={<span class="font-sans text-ink-3">Copy or vote — events appear here.</span>}>
            <For each={log()}>{(line) => <div class="whitespace-pre-wrap break-words">{line}</div>}</For>
          </Show>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Embed it in `message.mdx`** in the action-row section (around lines 62-90, where copy + like/dislike are described). Add the import near the top and place `<FeedbackDemo client:only="solid" />` directly under the action-row heading. Read the file first to find the exact heading and insertion point.

- [ ] **Step 3: Verify both themes + interactions (Task 7 harness).** Confirm the action row shows; hovering a button shows a tooltip; copy → check + toast; thumbs slide-to-fill and re-tap clears; console logs `kai-message-action` with `state`. Read the PNGs. **If the action row or tooltip does not appear, debug the `message`/`actionsReveal` shape against source before proceeding** (do not commit a non-working demo).

- [ ] **Step 4: Commit.**

```bash
git add docs-site/src/components/FeedbackDemo.tsx docs-site/src/content/docs/components/message.mdx
git commit -m "feat(docs): live message action-row + tooltip demo (copy, thumbs slide-to-fill)"
```

---

## Task 6: CardDismissDemo + embed in `cards.mdx`

**Files:**
- Create: `docs-site/src/components/CardDismissDemo.tsx`
- Modify: `docs-site/src/content/docs/components/cards.mdx`

**Interfaces:**
- Consumes: `getKit`, `syncKaiTheme`, `syncToastRegionTheme` (Task 2).
- Produces: default-exported `CardDismissDemo`.

**Before writing:** confirm against source: (a) how a card is made dismissible — check `src/primitives/card-contract.ts` / a card component for the `dismissible` flag location (`data.dismissible` vs envelope-level); (b) that a `dismissed` resolution renders the compact stub with a "Reopen" affordance that calls `policy.onReopen`; (c) the `CardResolution` shape (`{ kind: 'dismissed' | 'expired' | …, at? }`). The demo implements the dismiss/recovery semantics inline (the kit's `dismissRecovery()` helper is NOT in the docs bundle), mirroring `src/primitives/card-recovery.ts`.

- [ ] **Step 1: Create `docs-site/src/components/CardDismissDemo.tsx`.**

```tsx
/** Live demo for card dismiss/recovery — a dismissible confirm card. Dismiss → it
 *  collapses to a stub + an Undo toast; Undo or the stub's Reopen brings it back live.
 *  Mirrors src/primitives/card-recovery.ts semantics inline (dismissRecovery() is a
 *  kit primitive, not exported from the docs bundle). */
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { getKit, syncKaiTheme, syncToastRegionTheme } from './example/kit';

type AnyEl = HTMLElement & Record<string, unknown>;
type Resolution = { kind: string; at?: string } | undefined;
interface Envelope { type: string; id: string; title?: string; data: Record<string, unknown>; resolution?: Resolution }
type ToastFn = (m: string, o?: Record<string, unknown>) => unknown;

const liveCard = (): Envelope => ({
  type: 'confirm',
  id: 'deploy',
  title: 'Deploy to production?',
  data: {
    body: 'Applies 2 migrations and restarts 3 services. ~30s downtime.',
    tone: 'warning',
    dismissible: true, // CONFIRM the flag location against source before finalizing
    actions: [
      { id: 'deploy', label: 'Deploy now', style: 'primary' },
      { id: 'cancel', label: 'Cancel' },
    ],
  },
});

export default function CardDismissDemo() {
  let host: AnyEl | undefined;
  let toast: ToastFn | undefined;
  let cards: Envelope[] = [liveCard()];
  const [log, setLog] = createSignal<string[]>([]);
  const push = (m: string) => setLog((p) => [...p.slice(-5), m]);
  const set = (next: Envelope[]) => {
    cards = next;
    if (host) host.cards = next;
  };
  const clearResolution = (c: Envelope): Envelope => {
    const { resolution, ...rest } = c;
    return rest;
  };

  onMount(async () => {
    const mod = (await getKit()) as { toast: ToastFn };
    toast = mod.toast;
    if (!host) return;
    customElements.upgrade(host);
    set(cards);
    host.policy = {
      onDismiss: (id: string) => {
        const prior = cards.find((c) => c.id === id)?.resolution;
        set(cards.map((c) => (c.id === id ? { ...c, resolution: { kind: 'dismissed', at: new Date().toISOString() } } : c)));
        push(`onDismiss • ${id}`);
        toast?.('Dismissed', {
          action: {
            label: 'Undo',
            onAction: () => {
              set(cards.map((c) => (c.id === id ? (prior ? { ...c, resolution: prior } : clearResolution(c)) : c)));
              push(`undo • ${id} restored`);
            },
          },
        });
      },
      onReopen: (id: string) => {
        set(cards.map((c) => (c.id === id ? clearResolution(c) : c)));
        push(`onReopen • ${id} → live`);
      },
      onAction: (id: string, action: string) => push(`onAction • ${id} → ${action}`),
    };
    onCleanup(syncKaiTheme(host));
    onCleanup(syncToastRegionTheme());
  });

  const reset = () => {
    set([liveCard()]);
    setLog([]);
  };

  return (
    <div class="not-content my-5 overflow-hidden rounded-xl border border-line bg-surface">
      <div class="flex items-center justify-end border-b border-line bg-surface-2 px-4 py-2">
        <button type="button" onClick={reset} class="cursor-pointer rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-ink">Reset card</button>
      </div>
      <div class="p-5">
        {/* @ts-expect-error custom element */}
        <kai-cards ref={(el: HTMLElement) => (host = el as AnyEl)} style={{ display: 'block' }} />
      </div>
      <div class="border-t border-line bg-surface-2 px-4 py-3">
        <div class="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
          <span class="size-1.5 rounded-full bg-brand" /> Console
        </div>
        <div class="min-h-[1.75rem] font-mono text-sm leading-relaxed text-ink-2">
          <Show when={log().length} fallback={<span class="font-sans text-ink-3">Dismiss the card (×), then Undo or Reopen — events appear here.</span>}>
            <For each={log()}>{(line) => <div class="whitespace-pre-wrap break-words">{line}</div>}</For>
          </Show>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Embed it in `cards.mdx`** in the dismiss/recovery section (lines ~63-107). Add the import near the top and place `<CardDismissDemo client:only="solid" />` under the dismiss/recovery heading. Read the file first for the exact heading.

- [ ] **Step 3: Verify both themes + the flow (Task 7 harness).** Confirm: the × dismisses → card becomes a stub + Undo toast appears (themed); Undo restores; the stub's Reopen restores; console logs the policy events; readable in dark. Read the PNGs. **If the card has no × / does not collapse to a stub, fix the `dismissible` flag location against source before committing.**

- [ ] **Step 4: Commit.**

```bash
git add docs-site/src/components/CardDismissDemo.tsx docs-site/src/content/docs/components/cards.mdx
git commit -m "feat(docs): live card dismiss/recovery demo (dismiss → stub → undo/reopen)"
```

---

## Task 7: Full verification sweep

**Files:** none (verification + any fixups surfaced).

This is the IVP gate. A shared Playwright harness drives the docs dev server.

- [ ] **Step 1: Start the docs dev server.** From `docs-site/`: `npm run dev` (note the port it prints — Astro defaults to 4321). Wait until reachable.

- [ ] **Step 2: Capture every demo page in BOTH themes.** Starlight toggles theme via `data-theme` on `<html>` and persists `starlight-theme` in localStorage. Script (run from repo root so `playwright` resolves; set `DOCS=http://localhost:4321`):

```js
import { chromium } from 'playwright';
const DOCS = process.env.DOCS ?? 'http://localhost:4321';
const pages = ['toast','compare','message','cards'];
const b = await chromium.launch();
for (const slug of pages) for (const mode of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1100,height:900}, deviceScaleFactor:2 });
  await p.addInitScript((m)=>localStorage.setItem('starlight-theme', m), mode);
  await p.goto(`${DOCS}/components/${slug}/`, { waitUntil:'networkidle' });
  await p.evaluate((m)=>{document.documentElement.dataset.theme=m;}, mode);
  await p.waitForTimeout(800);
  await p.screenshot({ path:`/tmp/shots/docs-${slug}-${mode}.png`, fullPage:true });
  await p.close();
}
await b.close();
```

Then **read all 8 PNGs**. Confirm for each: the live demo renders, chrome is readable, NO light-on-light / dark-on-dark mismatch, and the kai element's theme matches the page. Drive at least one interaction per page in a second pass (click pick on compare, a thumb on message, the × on cards, a toast button) and re-capture to confirm behavior.

- [ ] **Step 3: Run the kit suites.** From repo root:

```bash
npm test          # expect ~1361 passing, 0 failing
npm run typecheck  # 4 tsc passes — story-file changes must typecheck clean
```

If `component-meta.json` churned from any build, run `git checkout -- src/components/component-meta.json` (per CLAUDE.md).

- [ ] **Step 4: Build the docs site.** From `docs-site/`: `npm run build` (or `astro build`). Expect a clean build (the islands are `client:only`, so SSR won't choke on `customElements`).

- [ ] **Step 5: Fix anything the captures or builds surfaced**, re-capture, then stop for review. Do NOT push to PR #102 — hand the captures + summary back for sign-off.

---

## Self-Review

**Spec coverage:** shared harness (Task 2) ✓ · 5 components curated demos — toast (T3), compare (T4), message action-row + tooltip-in-context (T5), card dismiss/recovery (T6) ✓ · embed pattern live+snippet (T3-6 embed alongside existing prose/snippets) ✓ · Storybook 3 fixes (T1) ✓ · themed chrome constraint (Global) ✓ · doc-accuracy fixes (T3 durations, T4 layout values) ✓ · Playwright IVP both themes + tests green (T7) ✓. Tooltip = in-context in T5 per spec (no standalone page) ✓.

**Placeholder scan:** All code blocks are complete. The two "confirm against source" notes (T5 message shape, T6 dismissible flag) are deliberate verification steps with a concrete file to check + a fallback action, not placeholders — they exist because inventing those shapes risks a non-working demo.

**Type consistency:** `getKit`/`loadKit`/`syncKaiTheme`/`syncToastRegionTheme` names match between Task 2 (produces) and Tasks 3-6 (consumes). `kai-compare` uses `data`/`selection`/`layout` + `kai-compare-select` consistently with `compare.mdx`. Toast handle `{ update, dismiss }` matches `toast-store.ts`.
