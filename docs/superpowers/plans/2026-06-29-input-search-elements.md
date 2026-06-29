# Input & Search Element Family — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `kai-input` + `kai-search` (Phase 1) and `kai-kbd` + `kai-editable-label` + a `kai-nav` per-item trailing-action (Phase 2), promoting the field rendering currently trapped in `kai-form` into a public token-themed primitive.

**Architecture:** Two-layer, Solid-first. In-house SolidJS primitives in `src/ui/` (token-themed, no third-party UI deps); thin `kai-*` web-component facades in `src/elements/` via `defineWebComponent`, following `src/elements/segmented.tsx` exactly. `kai-search` and `kai-editable-label` compose the `Input` primitive; no separate primitive for them. Shared glue (`register-impl.ts`, `slots.ts`, `build:api` generated artifacts, git) is serialized through the orchestrator, never parallel-edited.

**Tech Stack:** SolidJS, `defineWebComponent` (`src/elements/define.tsx`), `cn` (`src/utils/cn`), `renderIcon` (`src/ui/icon`), Vitest browser project, Storybook (`storybook-solidjs-vite`).

## Global Constraints

- Elements prefixed **`kai-`** (never `kitn-`/`kc-`). Non-bubbling `kai-*` CustomEvents; listen on the element itself.
- Array/object props set as **JS properties**; only scalars work as attributes.
- Reserved prop names (`title`/`id`/`slot`/`lang`) throw at registration — do not use.
- A UI-component prop named like a native handler (`onChange`/`onSelect`) collides with `HTMLAttributes` (TS2430) — name distinctly.
- New components get a SolidJS `Components/Primitives/*` story (canonical surface); `kai-*` facade stories STAY in `Labs/`.
- No em dashes in Storybook/docs copy (AI tell). Terse, developer-facing.
- After `npm run build:api`: `git checkout -- src/components/component-meta.json` (churns, not used at runtime).
- New element / new shadow CSS / new arbitrary Tailwind class needs a **Storybook restart** (build:css) before it lands in the shadow `compiled.css`.
- Gate per phase: `npm run build:api` · `npm run typecheck` (4 passes) · `npm test -- --project=unit` · `npm run build-storybook`.
- Two-layer facade pattern reference: `src/elements/segmented.tsx` (controlled `value` via `Object.defineProperty`, attr reflection + loop guard, `dispatch('kai-*')`, `<style>` host display, `ctx.expose` for methods).

---

# PHASE 1 — kai-input + kai-search

## File Structure (Phase 1)

- Create `src/ui/input.tsx` — `Input` primitive (the field shell). **Foundation; Tasks 2–4 depend on it.**
- Create `src/ui/input.test.tsx` — primitive unit tests.
- Create `src/ui/input.stories.tsx` — `Components/Primitives/Input` story.
- Create `src/elements/input.tsx` — `<kai-input>` facade.
- Create `tests/elements/input-element.test.tsx` — facade tests.
- Create `src/elements/input.stories.tsx` — `Labs/Elements/Input` story.
- Create `src/elements/search.tsx` — `<kai-search>` facade (composes `Input`).
- Create `tests/elements/search-element.test.tsx` — facade tests.
- Create `src/elements/search.stories.tsx` — `Labs/Elements/Search` story.
- Modify `src/components/form-widgets.tsx` — `TextWidget` renders `Input`; remove duplicated `inputBase`.
- **Orchestrator-only glue:** `src/elements/register-impl.ts` (+ `register.ts` if it mirrors the list), `src/elements/slots.ts` (INPUT/SEARCH part defs), `build:api` artifacts.

---

### Task 1: `Input` primitive (`src/ui/input.tsx`)

**Files:**
- Create: `src/ui/input.tsx`
- Test: `src/ui/input.test.tsx`
- Story: `src/ui/input.stories.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface InputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'onInput' | 'onChange' | 'size'> {
    label?: string;
    hint?: string;
    error?: string;
    size?: 'sm' | 'md';
    invalid?: boolean;
    leading?: JSX.Element;   // light-DOM consumers use the facade slot; primitive takes JSX
    trailing?: JSX.Element;
    onValueInput?: (value: string) => void;   // per keystroke
    onValueChange?: (value: string) => void;  // commit/blur
  }
  export function Input(props: InputProps): JSX.Element;
  ```
- Structure rendered: `<div part=field>[label?] <div field-row>[leading] <input part=input> [trailing]</div> [hint?/error?]</div>`. The shared field styling (moved from `form-widgets.tsx` `inputBase`) lives here: `rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none`; `size='sm'` tightens padding/height; `invalid` → `border-destructive`. Parts: `field`, `input`, `label`, `hint`. a11y: generated id links `<label for>` + `aria-describedby` (hint/error) + `aria-invalid`.

- [ ] **Step 1: Write failing tests** in `src/ui/input.test.tsx` (render in light DOM via the kit's existing primitive-test harness, mirror `src/ui/status.test.tsx`):
  - renders an `<input>` with the given `placeholder` and `value`.
  - typing fires `onValueInput` with the new value; blur fires `onValueChange`.
  - `label` renders a `<label>` whose `for` matches the input `id`.
  - `error` sets `aria-invalid="true"` on the input and renders the error text linked via `aria-describedby`.
  - `disabled` propagates to the input.
  - `leading`/`trailing` JSX render inside the field row when provided.
- [ ] **Step 2: Run, verify fail.** `npm test -- --project=unit src/ui/input.test.tsx` → FAIL (no `Input`).
- [ ] **Step 3: Implement `Input`** per the Interfaces block (DRY: lift `inputBase` verbatim from `form-widgets.tsx`). Use `splitProps`; spread remaining native attrs onto `<input>`. Generate id with a local counter or `crypto.randomUUID()` fallback used elsewhere.
- [ ] **Step 4: Run, verify pass.** Same command → PASS.
- [ ] **Step 5: Story** `src/ui/input.stories.tsx` title `Components/Primitives/Input`: default, with-label-hint, error, sizes, with leading icon + trailing button. Hand-written `parameters.docs.source.code` (tsx) per the kit convention.
- [ ] **Step 6: Commit** `feat(ui): Input primitive (field shell, leading/trailing, label/hint/error)`.

---

### Task 2: `<kai-input>` facade (`src/elements/input.tsx`)

**Files:**
- Create: `src/elements/input.tsx`
- Test: `tests/elements/input-element.test.tsx`
- Story: `src/elements/input.stories.tsx`
- **Glue (orchestrator after this task):** register in `register-impl.ts`; add INPUT part defs to `slots.ts`.

**Interfaces:**
- Consumes: `Input` from Task 1.
- Produces `<kai-input>`:
  - Props (scalars/attrs): `type` (`text`·`email`·`url`·`search`·`tel`·`password`·`number`, default `text`), `value` (controlled, reflected), `placeholder`, `label`, `hint`, `error`, `size` (`sm`·`md`), `disabled`, `readonly`, `required`, `invalid`, `name`.
  - Slots: `leading`, `trailing` (facade occupancy read, per card pattern — render the `<slot>` only when filled).
  - Events: `kai-input` `{value}`, `kai-change` `{value}`.
  - Methods via `ctx.expose`: `focus()`, `select()`, `clear()`; `value` get/set.
  - Parts: `field`, `input`, `label`, `hint`.

- [ ] **Step 1: Write failing tests** in `tests/elements/input-element.test.tsx` (mirror `tests/elements/voice-input-element.test.tsx`; register the element, mount, drive via DOM):
  - `el.value = 'hi'` reflects to the `value` attribute and the inner input shows `hi`; reading `el.value` returns live state.
  - typing in the inner input fires a `kai-input` CustomEvent with `detail.value`.
  - blur fires `kai-change` with `detail.value`.
  - `el.clear()` empties the value and fires `kai-change` with `''`.
  - `el.focus()` focuses the inner input.
  - setting `error` attribute sets `aria-invalid` on the inner input.
- [ ] **Step 2: Run, verify fail.** `npm test -- --project=unit tests/elements/input-element.test.tsx` → FAIL.
- [ ] **Step 3: Implement** following `segmented.tsx`: `defineWebComponent<Props, Events>('kai-input', defaults, (props, ctx) => …)`. Controlled `value` via `Object.defineProperty` + reflect effect + coerce/guard (copy the loop-guard shape from `segmented.tsx`). Render `Input` with `value`, `onValueInput`→`dispatch('kai-input')` + internal set, `onValueChange`→`dispatch('kai-change')`. `leading`/`trailing` via shadow `<slot name="leading">`/`<slot name="trailing">` passed as the primitive's `leading`/`trailing` JSX. `ctx.expose({ focus, select, clear })`. `<style>:host{display:block}</style>`.
- [ ] **Step 4: Run, verify pass.** Same command → PASS.
- [ ] **Step 5: Story** `src/elements/input.stories.tsx` title `Labs/Elements/Input` with the per-file `declare module 'solid-js'` JSX intrinsic for `kai-input` and hand-written HTML `source.code`.
- [ ] **Step 6: Commit** `feat(elements): kai-input facade`.

---

### Task 3: `<kai-search>` facade (`src/elements/search.tsx`)

**Files:**
- Create: `src/elements/search.tsx`
- Test: `tests/elements/search-element.test.tsx`
- Story: `src/elements/search.stories.tsx`
- **Glue (orchestrator):** register in `register-impl.ts`; SEARCH part defs in `slots.ts`.

**Interfaces:**
- Consumes: `Input` (Task 1). Optionally `kai-kbd` once Phase 2 lands; until then `shortcut` renders a plain styled hint span.
- Produces `<kai-search>`:
  - Props: `value` (controlled/reflected), `placeholder` (default `"Search…"`), `icon` (icon-name string, default a search glyph; resolved via `renderIcon`), `debounce` (ms, default `200`), `loading` (bool; swaps leading icon for a `kai-loader` spinner), `shortcut` (string, optional).
  - Events: `kai-search` `{value}` (debounced live), `kai-submit` `{value}` (Enter), `kai-change` `{value}`.
  - Methods: `focus()`, `clear()`. Parts: inherits Input parts + `clear`.

- [ ] **Step 1: Write failing tests** in `tests/elements/search-element.test.tsx`:
  - renders a leading search icon and the default placeholder `Search…`.
  - typing fires a debounced `kai-search` with `detail.value` (advance fake timers past `debounce`; assert one event after the burst).
  - a clear (×) button appears once the value is non-empty; clicking it empties the value and fires `kai-search` with `''`.
  - pressing Enter fires `kai-submit` with `detail.value`.
  - `el.clear()` empties + focuses.
- [ ] **Step 2: Run, verify fail.** `npm test -- --project=unit tests/elements/search-element.test.tsx` → FAIL.
- [ ] **Step 3: Implement** as a facade composing `Input` with `type="search"`. Debounce `kai-search` with a cleared timeout per keystroke. Clear button = trailing slot content (internal, part `clear`), shown via `Show when={value()}`. Leading = `renderIcon(props.icon ?? 'search', …)` or a `kai-loader` when `loading`. Enter handler on the inner input → `dispatch('kai-submit', { value })`. Controlled `value` via the `segmented.tsx` pattern. `ctx.expose({ focus, clear })`.
- [ ] **Step 4: Run, verify pass.** Same command → PASS.
- [ ] **Step 5: Story** `src/elements/search.stories.tsx` title `Labs/Elements/Search`: default, with-shortcut, loading, controlled. JSX intrinsic decl + HTML `source.code`.
- [ ] **Step 6: Commit** `feat(elements): kai-search (debounced filter field on kai-input)`.

---

### Task 4: `kai-form` refactor onto `Input` (`src/components/form-widgets.tsx`)

**Files:**
- Modify: `src/components/form-widgets.tsx` (`TextWidget`, remove `inputBase`)

**Interfaces:**
- Consumes: `Input` (Task 1).
- Produces: no API change. `kai-form` external behavior identical.

- [ ] **Step 1: Run the existing form suite first (RED baseline must be GREEN now):** `npm test -- --project=unit tests/elements/form-element.test.tsx src/components` (note the current pass count).
- [ ] **Step 2: Refactor** `TextWidget` to render `Input` (pass `variant`→`type`, `value`, `placeholder`, `invalid`, `required`, `disabled`, aria props, `onValueInput`→`props.onInput`, `onValueChange`→`props.onBlur`). Delete the local `inputBase` const (now owned by `Input`). Keep `data-control` and the other widgets (TextareaWidget etc.) untouched.
- [ ] **Step 3: Run the form suite, verify still GREEN** (same pass count, no regressions). Same command.
- [ ] **Step 4: Commit** `refactor(form): render TextWidget on the Input primitive (single field source)`.

---

### Task 5 (orchestrator): glue + build:api + Phase-1 gate

**Files (serialized, orchestrator only):** `src/elements/register-impl.ts`, `src/elements/register.ts` (if it mirrors the import list), `src/elements/slots.ts`, generated `build:api` artifacts.

- [ ] Register `./input` and `./search` in `register-impl.ts` (and `register.ts` if applicable).
- [ ] Add INPUT/SEARCH part defs to `slots.ts` (parts: input→`field`/`input`/`label`/`hint`; search→ + `clear`); satisfy the slots/parts drift test.
- [ ] `npm run build:api` → then `git checkout -- src/components/component-meta.json`. Verify element count **74 → 76**.
- [ ] Gate: `npm run typecheck` (4/4) · `npm test -- --project=unit` · `npm run build-storybook`. All green.
- [ ] Commit `chore(api): register kai-input + kai-search; regen element meta/wrappers`.

---

### Task 6 (dogfood + IVP): replace raw inputs

**Files (disjoint, parallelizable):** `src/elements/perplexity-pro.stories.tsx`, `src/elements/proof-data-table.stories.tsx`.

- [ ] Replace the 2× `<input type="search">` in `perplexity-pro.stories.tsx` (search sessions, search tasks) with `<kai-search>`, wiring `kai-search` to the existing filter logic. Remove the now-stale "bare search field is plain consumer markup" comment.
- [ ] Replace the filter `<input>` in `proof-data-table.stories.tsx` with `<kai-search>`.
- [ ] **Restart Storybook** (new element + shadow CSS).
- [ ] **IVP (ivp-verifier):** Playwright screenshots of both stories light + dark; confirm the search fields render with the leading icon + clear button, typing filters, and the raw-input count in those files is 0. Read screenshots back; computed-style probe the field border uses the kit token. PASS/FAIL with evidence.
- [ ] On PASS, commit `refactor(labs): dogfood kai-search into perplexity-pro + proof-data-table`.

---

# PHASE 2 — kai-kbd + kai-editable-label + kai-nav trailing-action

## File Structure (Phase 2)

- Create `src/ui/kbd.tsx` (+ `.test.tsx`, `.stories.tsx`), `src/elements/kbd.tsx`, `tests/elements/kbd-element.test.tsx`, `src/elements/kbd.stories.tsx`.
- Create `src/ui/editable-label.tsx` (+ `.test.tsx`, `.stories.tsx`), `src/elements/editable-label.tsx`, `tests/elements/editable-label-element.test.tsx`, `src/elements/editable-label.stories.tsx`.
- Modify `src/components/nav.tsx` + `src/elements/nav.tsx` (+ extend `tests/elements/` nav coverage / a new `nav-trailing.test.tsx`).
- **Orchestrator glue:** `register-impl.ts`, `slots.ts`, `build:api`.

---

### Task 7: `kai-kbd`

**Files:** Create `src/ui/kbd.tsx`, `src/ui/kbd.test.tsx`, `src/ui/kbd.stories.tsx`, `src/elements/kbd.tsx`, `tests/elements/kbd-element.test.tsx`, `src/elements/kbd.stories.tsx`.

**Interfaces:**
- Produces `Kbd` primitive `{ keys?: string; platform?: 'auto'|'mac'|'other'; size?: 'sm'|'md' }` and `<kai-kbd>` with the same scalar props; default-slot content used when `keys` omitted. Normalization: `Mod`→`⌘` (mac) / `Ctrl` (other), `Shift`→`⇧`, `Alt`/`Opt`→`⌥`, `ArrowUp/Down/Left/Right`→`↑↓←→`, `Enter`→`⏎`, split on `+`. Parts: `key`, `separator`.

- [ ] **Step 1: Failing primitive tests** (`src/ui/kbd.test.tsx`): `keys="Mod+K"` with `platform="mac"` renders `⌘` then `K` as separate `part=key` spans; `platform="other"` renders `Ctrl`; default-slot content renders verbatim when `keys` omitted.
- [ ] **Step 2: Run, fail.** `npm test -- --project=unit src/ui/kbd.test.tsx`.
- [ ] **Step 3: Implement** `Kbd` (pure render of normalized tokens) + `<kai-kbd>` facade (scalars only, no controlled value; `platform='auto'` reads a `navigator.platform`/`userAgentData` mac check guarded for SSR).
- [ ] **Step 4: Run, pass.**
- [ ] **Step 5:** facade test (`tests/elements/kbd-element.test.tsx`): `<kai-kbd keys="Mod+Shift+ArrowUp" platform="mac">` renders `⌘⇧↑`. Stories: `Components/Primitives/Kbd` + `Labs/Elements/Kbd`.
- [ ] **Step 6: Commit** `feat: kai-kbd (keyboard shortcut display)`.

---

### Task 8: `kai-editable-label`

**Files:** Create `src/ui/editable-label.tsx`, `src/ui/editable-label.test.tsx`, `src/ui/editable-label.stories.tsx`, `src/elements/editable-label.tsx`, `tests/elements/editable-label-element.test.tsx`, `src/elements/editable-label.stories.tsx`.

**Interfaces:**
- Consumes: `Input` (Task 1).
- Produces `EditableLabel` primitive + `<kai-editable-label>`:
  - Props: `value`, `editing` (controlled bool), `placeholder`, `disabled`.
  - Events: `kai-rename` `{value}` (commit), `kai-cancel` `{}`.
  - Methods: `edit()`, `commit()`, `cancel()`. Parts: `text`, `input`.
  - Behavior: text view → editing on dblclick or `editing=true` or `edit()`; renders `Input` (autofocus + select); Enter or blur commits → `kai-rename` (only if changed); Esc cancels → `kai-cancel`; both exit editing.

- [ ] **Step 1: Failing primitive tests** (`src/ui/editable-label.test.tsx`): shows `value` text; dblclick enters edit with the value selected; Enter with a new value fires `onRename` with it and returns to text view showing the new value; Esc fires `onCancel` and restores the old value.
- [ ] **Step 2: Run, fail.**
- [ ] **Step 3: Implement** `EditableLabel` (state: `editing` signal seeded from controlled prop; commit/cancel handlers; guard `suppressBlur` so Enter+blur don't double-fire — mirror the AMUX inline-rename logic at `split-workspace.stories.tsx:1165`). Facade wires `ctx.expose({ edit, commit, cancel })` + `dispatch('kai-rename'|'kai-cancel')`.
- [ ] **Step 4: Run, pass.**
- [ ] **Step 5:** facade test (commit fires `kai-rename` CustomEvent with `detail.value`; Esc fires `kai-cancel`). Stories: `Components/Primitives/EditableLabel` + `Labs/Elements/EditableLabel`.
- [ ] **Step 6: Commit** `feat: kai-editable-label (inline rename on kai-input)`.

---

### Task 9: `kai-nav` trailing-action (extend existing)

**Files:** Modify `src/components/nav.tsx`, `src/elements/nav.tsx`; Test `tests/elements/nav-trailing.test.tsx` (new).

**Interfaces:**
- `NavItem` gains optional `action?: { icon: string; label: string }` and `closable?: boolean`.
- New events: `kai-nav-item-action` `{value, action?}`; `kai-nav-item-close` `{value}` (when `closable`). Existing `kai-nav-select` unchanged. Part: `item-action`.

- [ ] **Step 1: Write the regression test FIRST (the critical one)** in `tests/elements/nav-trailing.test.tsx`: render `<kai-nav>` with an item that has `closable: true`; click the trailing button; assert a `kai-nav-item-close` fired with the item value **AND** assert **no** `kai-nav-select` fired. Also: an item with `action` clicked fires `kai-nav-item-action`; clicking the item body still fires `kai-nav-select`.
- [ ] **Step 2: Run, verify fail.** `npm test -- --project=unit tests/elements/nav-trailing.test.tsx`.
- [ ] **Step 3: Implement** the trailing button in `nav.tsx`. ★Discriminate **inside nav's own click handler** via an event-target check (`closest('[data-nav-action]')`), NOT a separate doc listener / `stopPropagation` — the Solid document-click-delegation gotcha means `stopPropagation` on the trailing button will not stop a separate document listener. Route action/close vs select off the single handler. Add `action`/`closable` to the facade item type + JSX decls.
- [ ] **Step 4: Run, verify pass** (the new test + the existing nav tests). `npm test -- --project=unit tests/elements/ src/ui/nav.test.tsx`.
- [ ] **Step 5: Commit** `feat(nav): per-item trailing action + closable (kai-nav-item-action/close)`.

---

### Task 10 (orchestrator): glue + build:api + Phase-2 gate

- [ ] Register `./kbd`, `./editable-label` in `register-impl.ts`.
- [ ] Add KBD / EDITABLE-LABEL / NAV (item-action) part defs to `slots.ts`.
- [ ] `npm run build:api` → `git checkout -- src/components/component-meta.json`. Element count **76 → 78**.
- [ ] Gate: typecheck 4/4 · unit · build-storybook. Green.
- [ ] Commit `chore(api): register kai-kbd + kai-editable-label; nav item-action meta`.

---

### Task 11 (dogfood + IVP): AMUX

**Files:** `src/elements/split-workspace.stories.tsx` (AMUX).

- [ ] Shortcuts dialog rows → `label + kai-kbd`.
- [ ] Agent inline-rename `<input>` (`:1165`) → `<kai-editable-label>` wired to `commitRename`.
- [ ] An AMUX rail / nav list with per-item close → `kai-nav` `closable`/`action` (erase the hand-rolled rail where it fits cleanly).
- [ ] **Restart Storybook.**
- [ ] **IVP (ivp-verifier):** screenshots of the shortcuts dialog, an inline rename in progress, and the rail with trailing actions, light + dark; confirm rename commits, kbd glyphs render, trailing action fires without selecting. Evidence-backed PASS/FAIL.
- [ ] On PASS, commit `refactor(labs): dogfood kai-kbd + kai-editable-label + nav trailing-action into AMUX`.

---

## Self-Review

**Spec coverage:** kai-input (T1–2) · kai-search (T3) · form refactor (T4) · register/meta (T5,10) · P1 dogfood (T6) · kai-kbd (T7) · kai-editable-label (T8) · kai-nav trailing-action (T9) · P2 dogfood (T11) · success criteria (dogfood T6/T11 erase raw inputs; single field source T4; +4 elements T5/T10; gate each phase). All spec sections map to a task.

**Placeholder scan:** no TBD/TODO; each task has files, interfaces, concrete test assertions, and exact commands. Facade boilerplate is delegated to the `segmented.tsx` reference rather than re-transcribed (intentional DRY, not a placeholder — the interface block pins every prop/event/method/part).

**Type consistency:** `Input` props (`onValueInput`/`onValueChange`, `leading`/`trailing`, `size`/`invalid`/`label`/`hint`/`error`) are used identically in T2/T3/T4/T8. Event names consistent: `kai-input`/`kai-change` (input), `kai-search`/`kai-submit` (search), `kai-rename`/`kai-cancel` (editable-label), `kai-nav-item-action`/`kai-nav-item-close` (nav). Element counts 74→76→78 consistent across T5/T10 and the spec.

## Execution mapping (orchestrate-and-verify)

- **Wave 1:** Task 1 (Input primitive) — one worker; foundation, blocks the rest.
- **Wave 2 (parallel, disjoint):** Task 2 (kai-input facade) · Task 3 (kai-search facade) · Task 4 (form refactor). Orchestrator then runs Task 5 (glue + build:api + gate).
- **Wave 3:** Task 6 dogfood (perplexity-pro · proof-data-table parallel) → IVP. **Phase 1 done + shown to Rob before Phase 2.**
- **Wave 4 (parallel, disjoint):** Task 7 (kbd) · Task 8 (editable-label) · Task 9 (nav). Orchestrator runs Task 10.
- **Wave 5:** Task 11 dogfood AMUX → IVP.
- Orchestrator serializes `register-impl.ts` / `slots.ts` / `build:api` / git; each worker's "done" is verified before being reported as done.
