# A — Composition Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the foundation every other sub-project uses: the `ChatApp` rename, the tag registry, the preset-parts guard, root theme inheritance, animated dock bands, and the pattern tier's plumbing.

**Architecture:** Pure data/logic in `src/primitives/` (Node-importable), Solid components in `src/components/`, facades in `src/web-components/`, guards in `packages/ui/scripts/` wired as required CI lints. Theme moves from a per-element JS `.dark` class to one inherited custom property plus `light-dark()` tokens.

**Tech Stack:** SolidJS, solid-element custom elements (`defineWebComponent`), Tailwind v4 CSS, vitest (jsdom `unit`, Playwright `storybook` projects), TypeScript compiler API for the lint.

**Spec:** `docs/superpowers/specs/2026-09-29-A-composition-contract-design.md` (umbrella: `2026-09-29-composition-round-design.md`).

## Global Constraints

- Work in your own worktree off `feat/composition` (`git worktree add .claude/worktrees/comp-<task> -b feat/comp-<task> feat/composition`); before any test: `pnpm install`, `pnpm --filter @kitn.ai/ui run build:css`, `pnpm exec nx build ui --skip-nx-cache`.
- Never touch `/Users/home/Projects/kitn-ai/kitn-chat`'s own working tree, the `kit-split` worktree, or ports 6006/6007.
- `kai-` prefix; arrays/objects are JS properties; events are non-bubbling `kai-*` CustomEvents.
- Model output is untrusted: text nodes only, no `innerHTML`; URLs through `isSafeUrl`.
- Decide loudly: every fallback or drop warns (once per cause) or shows a visible state.
- Regenerate derived artifacts with `npm run build:api` inside `packages/ui` and commit them; never run `gen-llms.mjs` standalone; trust `npm run typecheck` in `packages/ui`, not a cached `nx typecheck`.
- Search with a path, never from the repo root.
- Commits: conventional, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push; the supervisor merges.

## Shared files (serialized by the supervisor; a task may edit them only in its own branch and the supervisor merges one at a time)

`packages/ui/src/solid.ts`, `packages/ui/src/index.ts`, `packages/ui/package.json`, `.github/workflows/test.yml`, `pnpm-lock.yaml`, every generated artifact (`web-component-meta.json`, `web-component-types.d.ts`, `web-component-manifest.json`, `web-component-nonscalar.json`, `frameworks/react/index.tsx`, `docs/web-components.md`, `llms-full.txt`, `mcp/catalog/derived.json`), `theme.css`, `docs/coupling-map.md`.

## Task graph

```
A0 (alone, first) ─┬─ A1 registry ────────────┐
                   ├─ A2 preset lint ─────────┤ (A2 needs A1's export names only for its fixture; independent files)
                   ├─ A3 theme spike ── A4 theme sweep
                   ├─ A5 dock bands
                   └─ A6 pattern plumbing ── A7 composition guide
Parallel after A0: A1, A2, A3, A5, A6. A4 after A3. A7 after A1 + A6.
```

## Review Focus

1. A page that sets NOTHING (no `--kai-color-scheme`, no class): every element must still follow the OS preference exactly as `theme="auto"` did — pinned in A4 Step 2.
2. A registered renderer tag that is never defined (typo, lazy-loaded late): content must not vanish silently — pinned in A1 Step 1 (fallback + one warning).
3. An element with `theme="light"` inside a dark page must stay light, including its descendants in the same shadow root — pinned in A4 Step 2.
4. A consumer who overrides `--kai-color-background` (single value) keeps that value in both schemes, as today — pinned in A4 Step 2.
5. A dock band whose content grows while open (a question panel switching tabs) animates to the new height rather than clipping — pinned in A5 Step 1.

---

### Task A0: Rename `ChatThread` → `ChatApp`

**Files:**
- Rename: `packages/ui/src/components/chat/chat-thread.tsx` → `chat-app.tsx`; `chat-thread.test.tsx` → `chat-app.test.tsx`; `chat-thread-parts.test.tsx` → `chat-app-parts.test.tsx`; `chat-thread.stories.tsx` → `chat-app.stories.tsx`
- Modify: `packages/ui/src/solid.ts:146-161`, `packages/ui/src/index.ts:463`, every importer (find with `grep -rlE "ChatThread\b|chat-thread'" packages/ui/src packages/ui/mcp packages/ui/tests packages/ui/scripts packages/ui/frameworks packages/ui/apps packages/create-kai packages/cli packages/mcp apps/docs/src examples`)

**Interfaces:**
- Produces: `ChatApp`, `ChatAppProps`, `ChatAppController`, `ChatAppContextUsage` from `@kitn.ai/ui/solid` (`ChatAppContextUsage` also from `@kitn.ai/ui`). No aliases for the old names.

- [ ] **Step 1: Write the failing test** — `packages/ui/tests/exports/chat-app-rename.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import * as solid from '../../src/solid';

describe('ChatApp rename', () => {
  it('exports ChatApp and not ChatThread', () => {
    expect(typeof (solid as Record<string, unknown>).ChatApp).toBe('function');
    expect((solid as Record<string, unknown>).ChatThread).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** — `pnpm --filter @kitn.ai/ui exec vitest run --project=unit tests/exports/chat-app-rename.test.ts` → FAIL (`ChatApp` undefined).
- [ ] **Step 3: Rename** with `git mv` for the four files, then replace identifiers `ChatThread`→`ChatApp`, `ChatThreadProps`→`ChatAppProps`, `ChatThreadController`→`ChatAppController`, `ChatThreadContextUsage`→`ChatAppContextUsage` and import paths `chat-thread`→`chat-app` across the grep list. Leave `thread-density.ts` and `Thread` (the message list) untouched. Update prose that says "ChatThread" in `solid.ts`'s comment block to "ChatApp (the whole widget behind `<kai-chat>`)".
- [ ] **Step 4: Run the test, expect PASS**, then `npm run typecheck` (in `packages/ui`), unit, emitted, `verify:solid-coverage`, `verify:scaffold`, `npm run build:api` (commit regenerated artifacts). Re-run the grep: only intentional history lines under `docs/` remain.
- [ ] **Step 5: Commit** — `refactor(ui)!: rename ChatThread to ChatApp, the widget behind kai-chat`.

**Verification type:** unit + typecheck + consumer gates (`verify:scaffold`, `verify:consumer`).

---

### Task A1: The tag registry

**Files:**
- Create: `packages/ui/src/primitives/renderer-registry.ts`, `packages/ui/src/primitives/renderer-registry.test.ts`, `packages/ui/src/components/renderer/tag-renderer.tsx`, `packages/ui/src/components/renderer/tag-renderer.test.tsx`
- Modify: `packages/ui/src/web-components/message/message.tsx:29-60` (`CardTagSlot` on top of `TagRenderer`), `packages/ui/src/index.ts` (export `RendererMap`, `resolveRenderer`), `packages/ui/src/schemas/index.ts` (same, server-safe), `packages/ui/src/solid.ts` (export `TagRenderer`)

**Interfaces:**
- Produces:
  ```ts
  export type RendererMap = Record<string, string>;
  export function resolveRenderer(map: RendererMap | undefined, keys: readonly string[]): string | undefined;
  export function isValidCustomElementName(tag: string): boolean;
  // Solid
  export interface TagRendererProps<T> { tag: string; data: T; prop: string; fallback: JSX.Element; }
  export function TagRenderer<T>(props: TagRendererProps<T>): JSX.Element;
  ```

- [ ] **Step 1: Write failing tests**

```ts
// renderer-registry.test.ts
import { describe, it, expect } from 'vitest';
import { resolveRenderer, isValidCustomElementName } from './renderer-registry';

describe('resolveRenderer', () => {
  it('returns the most specific key present', () => {
    const map = { tool: 'my-tool', 'tool:web_search': 'my-search' };
    expect(resolveRenderer(map, ['tool:web_search', 'tool'])).toBe('my-search');
    expect(resolveRenderer(map, ['tool:other', 'tool'])).toBe('my-tool');
  });
  it('returns undefined for no map or no match', () => {
    expect(resolveRenderer(undefined, ['tool'])).toBeUndefined();
    expect(resolveRenderer({}, ['tool'])).toBeUndefined();
  });
});
describe('isValidCustomElementName', () => {
  it('accepts hyphenated lowercase names and rejects others', () => {
    expect(isValidCustomElementName('my-step')).toBe(true);
    expect(isValidCustomElementName('mystep')).toBe(false);
    expect(isValidCustomElementName('My-Step')).toBe(false);
    expect(isValidCustomElementName('<img>')).toBe(false);
  });
});
```

```tsx
// tag-renderer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { TagRenderer } from './tag-renderer';

class ProbeEl extends HTMLElement { part2?: unknown }
customElements.define('probe-el', ProbeEl);

describe('TagRenderer', () => {
  it('creates the tag once and assigns data as a PROPERTY, re-assigning on change', async () => {
    const [data, setData] = createSignal({ n: 1 });
    const { container } = render(() => <TagRenderer tag="probe-el" data={data()} prop="part" fallback={<span>fb</span>} />);
    const el = container.querySelector('probe-el') as HTMLElement & { part: unknown };
    expect(el.part).toEqual({ n: 1 });
    expect(el.hasAttribute('part')).toBe(false);
    setData({ n: 2 });
    expect(container.querySelector('probe-el')).toBe(el);
    expect(el.part).toEqual({ n: 2 });
  });
  it('renders the fallback and warns ONCE for an invalid tag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(() => (<>
      <TagRenderer tag="notvalid" data={1} prop="part" fallback={<span>fb</span>} />
      <TagRenderer tag="notvalid" data={2} prop="part" fallback={<span>fb</span>} />
    </>));
    expect(container.textContent).toBe('fbfb');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
  it('renders the fallback and warns once when a valid tag is never defined within 2s', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(() => <TagRenderer tag="never-defined-el" data={1} prop="part" fallback={<span>fb</span>} />);
    await vi.advanceTimersByTimeAsync(2100);
    expect(container.textContent).toContain('fb');
    expect(warn).toHaveBeenCalledTimes(1);
    vi.useRealTimers(); warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (modules missing): `pnpm --filter @kitn.ai/ui exec vitest run --project=unit src/primitives/renderer-registry.test.ts src/components/renderer/tag-renderer.test.tsx`
- [ ] **Step 3: Implement**

```ts
// renderer-registry.ts — no Solid, no DOM.
export type RendererMap = Record<string, string>;
const CE_NAME = /^[a-z][a-z0-9._]*-[a-z0-9._-]*$/;
export function isValidCustomElementName(tag: string): boolean { return CE_NAME.test(tag); }
export function resolveRenderer(map: RendererMap | undefined, keys: readonly string[]): string | undefined {
  if (!map) return undefined;
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(map, k)) return map[k];
  return undefined;
}
```

`tag-renderer.tsx`: keep a module-level `Set<string>` of warned tags; if `!isValidCustomElementName(tag)` warn once (`[kai] renderer tag "<tag>" is not a valid custom-element name; rendering the built-in view instead.`) and return `fallback`. Otherwise create the element with `document.createElement(tag)` inside a `createMemo` keyed on `tag` only; a `createEffect` assigns `(el as any)[props.prop] = props.data`. If `!customElements.get(tag)`, race `customElements.whenDefined(tag)` against a 2000ms timer: on timeout warn once (`… is not defined after 2s …`) and switch to `fallback`; on definition keep the element.
Re-implement `CardTagSlot` in `web-components/message/message.tsx` as `TagRenderer` with `prop` assignments for `data`/`cardId`/`envelope` preserved (keep the existing property names it sets today; read them in the current code before editing and keep `thread-cards.declarative.test.tsx` green unchanged).
- [ ] **Step 4: Run tests, expect PASS**; run `web-components/thread/thread-cards.declarative.test.tsx` and `web-components/message/*.test.tsx` unchanged-green; typecheck.
- [ ] **Step 5: Commit** — `feat(ui): the tag registry, one mechanism for rendering data through a consumer's element`.

**Verification type:** unit + typecheck.

---

### Task A2: `lint:preset-parts` and the parity helper

**Files:**
- Create: `packages/ui/scripts/lint-preset-parts.mjs`, `packages/ui/scripts/preset-facades.json`, `packages/ui/scripts/fixtures/preset-parts/{private-import,clean}/facade.tsx`, `packages/ui/tests/scripts/preset-parts-guard-wiring.test.ts`, `packages/ui/tests/helpers/preset-parity.ts`
- Modify: `packages/ui/package.json` (script `"lint:preset-parts": "node scripts/lint-preset-parts.mjs --self-test && node scripts/lint-preset-parts.mjs"`), `.github/workflows/test.yml` (a step beside `lint:silent-drops` at line 166), `docs/coupling-map.md` §4 (register `preset-facades.json` as a copy)

**Interfaces:**
- Produces: `preset-facades.json` = `[{ "tag": "kai-thread", "facade": "src/web-components/thread/thread.tsx" }, { "tag": "kai-message", "facade": "src/web-components/message/message.tsx" }, { "tag": "kai-conversations", "facade": "src/web-components/conversation/conversation-list.tsx" }, { "tag": "kai-chat", "facade": "src/web-components/chat/chat.tsx" }]` (B and C append their new presets).
- Produces: `expectPresetParity(preset: () => HTMLElement, composed: () => HTMLElement): Promise<void>` in `tests/helpers/preset-parity.ts`.

- [ ] **Step 1: Write the fixtures and the wiring test**

`fixtures/preset-parts/private-import/facade.tsx`:
```tsx
import { NotExported } from '../../../../src/components/button/button-internals';
export const x = NotExported;
```
(`button-internals` does not need to exist for the lint: it reports the unresolved/non-exported name.) `clean/facade.tsx` imports `Button` from `../../../../src/components/button/button`.

`tests/scripts/preset-parts-guard-wiring.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const ui = resolve(__dirname, '../..');
describe('lint:preset-parts wiring', () => {
  it('self-test passes (fires on the private import, passes the clean one)', () => {
    execFileSync('node', ['scripts/lint-preset-parts.mjs', '--self-test'], { cwd: ui });
  });
  it('every listed facade exists and its tag is registered', () => {
    const list = JSON.parse(readFileSync(resolve(ui, 'scripts/preset-facades.json'), 'utf8')) as { tag: string; facade: string }[];
    const manifest = readFileSync(resolve(ui, 'src/web-components/web-component-manifest.json'), 'utf8');
    for (const { tag, facade } of list) {
      expect(existsSync(resolve(ui, facade)), facade).toBe(true);
      expect(manifest.includes(`"${tag}"`), tag).toBe(true);
    }
  });
  it('is invoked by CI', () => {
    const ci = readFileSync(resolve(ui, '../../.github/workflows/test.yml'), 'utf8');
    expect(ci).toMatch(/lint:preset-parts/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (script missing).
- [ ] **Step 3: Implement the lint** with the TypeScript compiler API: build a `ts.Program` over `src/solid.ts`, `src/index.ts` and the facades (use `packages/ui/tsconfig.json` options); `exportsOf(file) = checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).map(s => s.name)`; for each facade walk `ImportDeclaration`s whose resolved path is under `src/components/` (check against `solid.ts` exports) or `src/primitives/` (check against `index.ts` exports); for each named import not in the list, record `facade: symbol from <specifier> is not public; re-export it from src/solid.ts|src/index.ts`. Exit 1 with the list; exit 0 printing the count of facades and imports checked. `--self-test` runs the same analysis over the two fixtures and asserts `private-import` yields ≥1 finding and `clean` yields 0. Type-only imports (`import type`) are allowed. Run it on the real tree: if it finds real violations, re-export the named symbols from `solid.ts`/`index.ts` in this task (that IS the rule) and list them in the commit body.
- [ ] **Step 4: The parity helper**

```ts
// tests/helpers/preset-parity.ts
export async function expectPresetParity(preset: () => HTMLElement, composed: () => HTMLElement): Promise<void> {
  const a = preset(); const b = composed();
  document.body.append(a, b);
  await new Promise((r) => setTimeout(r, 0));
  const norm = (root: ShadowRoot | null) => {
    const clone = root!.cloneNode(true) as DocumentFragment;
    clone.querySelectorAll('*').forEach((n) => {
      for (const attr of [...n.attributes]) if (/^(id|aria-controls|aria-labelledby|aria-describedby|data-solid.*)$/.test(attr.name)) n.removeAttribute(attr.name);
    });
    const div = document.createElement('div'); div.append(clone); return div.innerHTML.replace(/\s+/g, ' ');
  };
  const { expect } = await import('vitest');
  expect(norm(b.shadowRoot)).toBe(norm(a.shadowRoot));
  a.remove(); b.remove();
}
```
- [ ] **Step 5: Run** `npm run lint:preset-parts`, the wiring test, `lint:gate-parity` (it may require the new lint to be listed; follow its error message), typecheck. **Commit** — `feat(ui): lint:preset-parts, a preset may render only public parts`.

**Verification type:** lint self-test watched red then green + unit.

---

### Task A3: Theme spike — prove `light-dark()` + `--kai-color-scheme` on three elements

**Files:**
- Modify (spike branch only, kept if it passes): `packages/ui/theme.css` (token block + `.dark` block at line 321), `packages/ui/src/web-components/define/define.tsx:29-43,458` and the wrapper that receives the `.dark` class
- Create: `packages/ui/tests/theme/token-values.fixture.json` (captured BEFORE any change), `packages/ui/tests/theme/token-parity.browser.test.ts`, `packages/ui/tests/theme/inherit.browser.test.ts`

**Interfaces:**
- Produces: the CSS contract `--kai-color-scheme: light | dark` (inherited), wrapper `color-scheme: var(--kai-color-scheme, light dark)`.

- [ ] **Step 1: Capture the fixture first.** A Playwright script (run under the storybook/browser vitest project) mounts `kai-button` with `theme="light"` and with `theme="dark"`, reads `getComputedStyle(wrapper).getPropertyValue('--color-<name>')` for every `--color-*` token declared in `theme.css`, and writes `token-values.fixture.json` `{ light: {...}, dark: {...} }`. Commit the fixture alone: `test(ui): capture every colour token's light and dark value before the theme migration`.
- [ ] **Step 2: Write the failing browser tests**

```ts
// inherit.browser.test.ts (runs in the storybook/browser vitest project)
import { describe, it, expect } from 'vitest';
import '../../src/web-components/register';
const bg = (el: Element) => getComputedStyle(el.shadowRoot!.firstElementChild as Element).backgroundColor;
describe('root theme inheritance', () => {
  it('a --kai-color-scheme on :root themes elements with no theme attribute', async () => {
    document.documentElement.style.setProperty('--kai-color-scheme', 'dark');
    const b = document.createElement('kai-button'); b.textContent = 'x'; document.body.append(b);
    await customElements.whenDefined('kai-button'); await new Promise((r) => setTimeout(r, 50));
    const dark = bg(b);
    document.documentElement.style.setProperty('--kai-color-scheme', 'light');
    await new Promise((r) => setTimeout(r, 50));
    expect(bg(b)).not.toBe(dark);
    document.documentElement.style.removeProperty('--kai-color-scheme'); b.remove();
  });
  it('theme="light" inside a dark root stays light', async () => {
    document.documentElement.style.setProperty('--kai-color-scheme', 'dark');
    const a = document.createElement('kai-button'); a.textContent = 'a';
    const b = document.createElement('kai-button'); b.textContent = 'b'; b.setAttribute('theme', 'light');
    document.body.append(a, b); await new Promise((r) => setTimeout(r, 50));
    expect(bg(a)).not.toBe(bg(b));
    document.documentElement.style.removeProperty('--kai-color-scheme'); a.remove(); b.remove();
  });
  it('with nothing set, follows the OS preference', async () => {
    // run under Playwright colorScheme emulation 'dark' via the project config for this file
    const b = document.createElement('kai-button'); b.textContent = 'x'; document.body.append(b);
    await new Promise((r) => setTimeout(r, 50));
    expect(matchMedia('(prefers-color-scheme: dark)').matches).toBe(true);
    // compare against the fixture's dark value for the button's background token
    b.remove();
  });
  it('a consumer --kai-color-background override applies in both schemes', async () => {
    document.documentElement.style.setProperty('--kai-color-background', 'rgb(1, 2, 3)');
    for (const scheme of ['light', 'dark']) {
      document.documentElement.style.setProperty('--kai-color-scheme', scheme);
      const t = document.createElement('kai-thread'); document.body.append(t); await new Promise((r) => setTimeout(r, 50));
      expect(getComputedStyle(t.shadowRoot!.firstElementChild as Element).getPropertyValue('--color-background').trim()).toBe('rgb(1, 2, 3)');
      t.remove();
    }
    document.documentElement.style.removeProperty('--kai-color-background');
    document.documentElement.style.removeProperty('--kai-color-scheme');
  });
});
```
`token-parity.browser.test.ts` re-reads every token under `theme="light"` and `theme="dark"` and asserts equality with the fixture.
- [ ] **Step 3: Run, expect FAIL** (inheritance tests).
- [ ] **Step 4: Implement on the token block:** rewrite each light token `--color-X: var(--kai-color-X, <light>)` and its `.dark` counterpart `<dark>` into `--color-X: var(--kai-color-X, light-dark(<light>, <dark>))`; tokens with no `.dark` override stay single-valued; delete the `.dark` block; add `color-scheme: var(--kai-color-scheme, light dark)` on the element wrapper (the node that receives `.dark` today); in `define.tsx`, replace the `.dark` class with an inline `style="--kai-color-scheme: dark|light"` when `theme` is `dark`/`light` and nothing when `auto`; add `.dark { --kai-color-scheme: dark } .light { --kai-color-scheme: light }` to `theme.css`. Rebuild CSS.
- [ ] **Step 5: Run** both browser tests (PASS) and the axe contrast stories for `kai-button`, `kai-thread`, `kai-prompt-input` (`vitest run --project=storybook src/components/button src/components/thread src/components/prompt`). **If any fails for a reason `light-dark()` cannot fix, stop and report**; the supervisor raises it to the owner. Otherwise **commit** — `feat(ui)!: colour tokens resolve through light-dark() and an inherited --kai-color-scheme`.

**Verification type:** in-browser (storybook project) + axe; red before green.

---

### Task A4: Theme sweep

**Files:**
- Modify: the 6 non-story, non-test files under `packages/ui/src` using `dark:` utilities (find: `grep -rlE "dark:[a-z]" packages/ui/src | grep -vE 'stories|test'`), `packages/ui/src/web-components/define/define.tsx` (delete `createDarkMode`), every caller of it or of the element's dark boolean (find: `grep -rn "isDark\|createDarkMode" packages/ui/src`), code-block Shiki theme selection, the remote-card `CardContext.theme` producer (`grep -rn "theme: { mode" packages/ui/src`)
- Create: `packages/ui/src/primitives/color-scheme.ts`, `packages/ui/src/primitives/color-scheme.test.ts`
- Docs: `apps/docs/src/content/docs/guides/theming.mdx` (or the theming page; find with `ls apps/docs/src/content/docs/guides | grep -i them`)

**Interfaces:**
- Consumes: A3's CSS contract.
- Produces: `createResolvedColorScheme(el: HTMLElement): Accessor<'light' | 'dark'>` exported from `@kitn.ai/ui` and `@kitn.ai/ui/solid`.

- [ ] **Step 1: Failing unit test** (`color-scheme.test.ts`, jsdom): stub `getComputedStyle` to return `--kai-color-scheme: dark` → `'dark'`; empty + `matchMedia` dark → `'dark'`; empty + light → `'light'`; changing `document.documentElement.className` then flushing the MutationObserver re-reads.
- [ ] **Step 2: Run, FAIL. Step 3: Implement** `createResolvedColorScheme` (read the custom property on `el`, trim; `light`/`dark` wins; else `matchMedia('(prefers-color-scheme: dark)')`; subscribe to `matchMedia` change and a `MutationObserver` on `document.documentElement` and `document.body` `attributes: true, attributeFilter: ['class','style','data-theme']`; clean up with `onCleanup`). Replace every JS consumer of the old dark boolean. Replace each kit `dark:` utility with a token (add a token with `light-dark()` where none fits). Update the `theme` prop doc in `define.tsx`'s defaults object ("`auto` inherits the page's `--kai-color-scheme`, else the OS; `light`/`dark` override for this element and its contents").
- [ ] **Step 4: Run** unit, typecheck, the full storybook project (all shards via `npm run test:storybook:ci`), `verify:generated` after `npm run build:api`, `verify:consumer`. Theming docs: a "Set the scheme once" section showing `:root { --kai-color-scheme: dark }` and `<html class="dark">` with `theme.css`; state the Baseline-2024 browser floor.
- [ ] **Step 5: Commit** — `feat(ui)!: one colour scheme for the page; the theme prop becomes a local override`.

**Verification type:** unit + full storybook/axe + consumer gates.

---

### Task A5: Dock bands animate presence

**Files:**
- Modify: `packages/ui/src/components/prompt/prompt-dock.tsx`, `packages/ui/src/web-components/prompt/prompt-dock.tsx`
- Test: `packages/ui/src/components/prompt/prompt-dock.test.tsx` (extend or create), story `prompt-dock.stories.tsx` gains `Band Enters And Leaves`

- [ ] **Step 1: Failing tests** (jsdom + a stubbed `ResizeObserver`): with an empty `top`, the band wrapper has `data-state="closed"` and height `0px`; after slotting content it becomes `data-state="open"` with height equal to the measured content height; when the content's height changes while open, the wrapper's height follows; under `matchMedia('(prefers-reduced-motion: reduce)')` the wrapper has `transition-duration: 0s` (assert the inline style/var the component sets).
- [ ] **Step 2: FAIL. Step 3: Implement**: wrap each band in a clipping div; a `ResizeObserver` on the band's inner content sets `--kai-band-h`; CSS `height: var(--kai-band-h); transition: height 180ms ease-out, opacity 180ms ease-out;` and `@media (prefers-reduced-motion: reduce) { transition-duration: 0s }`; presence from the slot's assigned nodes (the facade already reads slots; reuse `readSlots`).
- [ ] **Step 4: Run** tests + the storybook project for `components/prompt` + axe. **Step 5: Commit** — `feat(ui): prompt-dock bands slide in and out with their content`.

**Verification type:** unit + in-browser story (IVP screenshot of open/closed, reduced motion).

---

### Task A6: Pattern tier plumbing

**Files:**
- Modify: `packages/blocks/src/registry.ts` (accept `"kind": "pattern"` items under `packages/blocks/patterns/<id>/`), `packages/blocks/src/forms/index.ts` (a pattern renders its files verbatim; CDN form rewrites only the kit import), `packages/create-kai/src/blocks.ts` + `add.ts` (install a pattern), `apps/docs` `/blocks` section → `/patterns` (pages, `topics.mjs` nav, redirects in the Astro config)
- Create: `packages/blocks/patterns/README.md`, `packages/blocks/patterns/hello-pattern/` (a 20-line fixture pattern used by tests: one `kai-button` + one script), `packages/blocks/tests/pattern-kind.test.ts`, `packages/create-kai/test/add-pattern.test.ts`

**Interfaces:**
- Produces: registry item `{ "name": string, "kind": "pattern", "title": string, "description": string, "files": [{ "path": string, "type": "html" | "ts" | "css" }] }`; `create-kai add <pattern>` writes the files into `src/patterns/<id>/`.

- [ ] **Step 1: Failing tests**: `pattern-kind.test.ts` asserts the directory scan finds `hello-pattern` with `kind: 'pattern'`, rejects a pattern with more than one `.ts` file or a `.tsx`/template-DSL binding (`/\s[.:@#*][a-z]+=/` in the html) with a named error; `add-pattern.test.ts` runs `add hello-pattern` into a temp dir and asserts the files land byte-identical except the kit import line.
- [ ] **Step 2: FAIL. Step 3: Implement** in the registry and renderer; keep the three existing blocks working (their tests stay green). Docs rename with redirects; the patterns index page lists items of `kind: 'pattern'` from the derived registry index, not a hand-typed list. `README.md` states the authoring rules from spec A §7 (50–200 lines, comments explain the code not project history, public parts only, a `Patterns/<Name>` story).
- [ ] **Step 4: Run** `pnpm --filter @kitn.ai/blocks test`, `pnpm --filter create-kai run build && pnpm --filter create-kai test`, `apps/docs` build (`pnpm --filter docs build` or the docs package's build script), `verify:blocks`. **Step 5: Commit** — `feat(blocks)!: patterns, plain web-component compositions installed with kai add; /blocks becomes /patterns`.

**Verification type:** unit + docs build + `kai add` into a scratch dir.

---

### Task A7: The composition guide and the MCP hint

**Files:**
- Create: `apps/docs/src/content/docs/guides/composition.mdx`
- Modify: `packages/ui/mcp/mcp/tools/reference.ts` (one "compose it:" line per element, derived from meta), `packages/ui/mcp/mcp/reference.test.ts`

- [ ] **Step 1: Failing test** in `reference.test.ts`: `component_reference` for `kai-thread` contains `compose it:` and names its slots; for an element with no slots and no children support it contains no such line.
- [ ] **Step 2: FAIL. Step 3: Implement** from `web-component-meta.json` slots (no hand list). Write the guide: the three mechanisms, one plain-HTML example each (slots: `kai-prompt-dock` `top`; children: `kai-conversations` + `kai-conversation-item`; registry: `renderers` on `kai-thread` with a `tool:web_search` step element), and the preset rule in one paragraph. Link it from the existing composition pages (find: `grep -rl "composition" apps/docs/src/content/docs | head`).
- [ ] **Step 4: Run** MCP tests, docs build, `verify:docs`. **Step 5: Commit** — `docs: the three ways to compose, and a compose-it hint in component_reference`.

**Verification type:** unit + docs build.
