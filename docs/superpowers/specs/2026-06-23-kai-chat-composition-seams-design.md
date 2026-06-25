# Design: composition seams + exposed primitives for `kai-*`

**Date:** 2026-06-23
**Status:** Spiked — `<kai-chat>` slotted shell proven on branch `spike/kai-chat-seams` (see "Prototype status"). The prompt-input seams + the two primitives below are designed here, not yet built.
**Scope of this spec:** the composition *model + the line* (what we build vs. what the consumer adds), the seam convention proven on `<kai-chat>`, the **prompt-input** seams, and the two reusable **primitives** the real-world toolbar/menu cases require (`kai-menu`, `kai-command`). The element-by-element audit and the shadcn-style template/registry distribution are **separate, later specs** (noted, out of scope).

## Summary

Move `kai-*` elements from **configuration** (the author pre-images every layout via an ever-growing prop surface) to **composition** (the author exposes a bounded set of *seams* + reusable *primitives*; the consumer fills them with their own markup and data). The decisive argument: configuration forces the library to author the Cartesian product of `layouts × use-cases × app-chrome` — an unbounded space that isn't ours to know. Seams invert the burden: we author a finite set of holes, the consumer authors the arrangement. The author's ongoing job shrinks to **render each part well, and add/expose parts as new AI-UX patterns emerge** — not to enumerate arrangements.

**The line:** we own the **frame** (where things go) and the **primitives** (reusable, accessible building blocks); the consumer owns the **content** (what's in the menu/list) and the **wiring** (what each item does). Three tiers:

1. **Configured defaults** — the universal ~80% every AI chat needs (text + submit, attach, suggestions, mic/voice, model/effort switcher). Props toggle them; the `kai` MCP scaffolder emits them. Drop-in.
2. **Seams** — regions where the consumer injects/replaces with their own markup (sidebar, header, empty, composer, footer, **toolbar**, **notice**). The library provides the space + layout; the consumer provides the markup. (Decision confirmed: *Defaults + seams*, not assemble-everything, not prop-per-control.)
3. **Primitives** — accessible building blocks so consumer-added controls match the kit and don't reinvent a11y (`kai-menu`, `kai-command`, `kai-popover`, `kai-switch`, …). The deepest rung of the white-box gradient for UI.

The load-bearing boundary: **slots can't see the component's reactive data.** Chrome → slots; per-item data rendering (messages/cards) → the existing `card-registry`. `messages` stays a **prop**, never a slot. Templates/defaults stay first-class so the AI-harness consumer never hand-wires composition.

### Goals

- A consistent, documented **seam convention** (naming, inject-vs-replace, flag-gating, `::part()`) across `kai-*`, with a typed **seam registry** as the single source of truth (drives facade detection + docs + types, so names never drift).
- Proven seam shells on **`<kai-chat>`** (done) and **`<kai-prompt-input>`** (toolbar + notice).
- Two reusable **primitives** exposed as `kai-*` elements: an action **menu** (with submenus) and a grouped **command list** — covering the `+`-menu and `@`-picker cases that real composers need.
- Keep the **drop-in** path intact: with nothing projected, elements render exactly as today.

### Non-goals (YAGNI — explicit)

- **Not** rewriting all ~50 elements here. This formalizes the model, proves it on the two flagship elements, and exposes the two required primitives. The audit grades the rest.
- **Not** the template/registry `npx @kitn.ai/ui add <template>` CLI. Separate spec.
- **Not** baking **consumer content** — the `+` menu's items ("Add from GitHub", "Connectors"), the result data, the notice copy. That's the consumer's product; baking it is the Cartesian-product trap.
- **Not** making `messages` (or any per-item data render) a slot. Stays on `card-registry`.
- **Not** unifying the menu and the command-list into one component. They are **different a11y roles** (`role="menu"` vs `role="listbox"`) with different semantics — see below.
- **Not** a resizable/collapsible sidebar inside `<kai-chat>`; the `sidebar` seam is a fixed column for the 80%, with resizable steered to `compose-your-own` + `kai-resizable`.

## The model — three mechanisms, one decision rule

```
                         does the seam need THIS component's reactive data?
                                          │
                        ┌─────────────────┴─────────────────┐
                       no                                   yes
                        │                                    │
              is it additive or a stand-in?            REGISTRY / renderer
              ┌─────────┴─────────┐                    (card-registry; NOT a slot)
           additive            stand-in
              │                   │
        INJECT slot          REPLACE slot
   (sidebar, footer,     (header, empty, composer)
    toolbar, notice)     consumer owns the region's
                         data + events (the contract)
```

- **INJECT** — additive; the built-in region still renders, the consumer's markup is added in. No contract beyond "your markup, your CSS."
- **REPLACE** — substitutive; the consumer's markup stands in. The component still owns **when** (e.g. `empty` shows only while `messages.length === 0`); the consumer owns **what** and its **behavior** (a slotted node can't read signals, so it wires its own events; to drive the thread it sets `messages`).
- **REGISTRY** — per-item, data-driven; unchanged, on `card-registry`.

### Two primitive patterns — do not conflate (menu vs. list)

The real toolbar (per Claude's composer) needs **two distinct primitives** that look alike but are semantically opposite:

| | **Action menu** (`kai-menu`) | **Command list** (`kai-command`) |
|---|---|---|
| Role | `role="menu"` / `menuitem` | `role="listbox"` / `option` |
| Job | click an item → it *does* something | type to filter → pick one → it *inserts*/selects |
| Shape | items, **submenus**, separators, checkboxes, shortcuts | **grouped** filtered results: icon + label + meta |
| Example | the `+` dropdown (Skills → skill-creator…) | the `@`-picker (Mac apps / Chats / Files) |
| Today | `src/ui/dropdown.tsx` — exists, **flat** | `src/components/composer.tsx` — exists, **baked in** |

## The seam contract

1. **Naming.** Kebab slot name. Replace seams own the region noun (`header`, `composer`, `empty`); inject seams describe position (`header-start`, `toolbar-start`, `composer-actions`, `footer`, `notice`, `sidebar`).
2. **Flag-gating.** The facade detects projected light-DOM per seam (`MutationObserver` + `:scope > [slot="name"]`) and passes a boolean to the view, so an empty seam collapses (no stray border/padding). Generalizes the shipped `header-start`/`header-end` detection.
3. **`::part()` hooks** on region wrappers that benefit from consumer styling (`sidebar`, `header`, `footer`, `notice`).
4. **Replace-seam ownership** is documented per seam (for `composer`: "you own submit + loading + attachments; drive the thread via `messages`").
5. **Host-state reflection** — reflect a small documented set of states to host attributes so slotted CSS can react without reading internals; start with `loading` (`:host([loading]) ::slotted([slot=composer])`).

## Architecture — where it lives

```
src/elements/seams.ts            (NEW) typed seam registry — single source of truth
src/elements/chat.tsx            facade: derive SEAMS + detection from registry; pass flags     [done in spike]
src/components/chat-thread.tsx   view: <slot> placement + flag-gated regions + parts             [done in spike]
src/components/prompt-input.tsx  view: toolbar-start/-end + notice seams                          (W2)
src/elements/prompt-input.tsx    facade: seam detection                                           (W2)
src/ui/dropdown.tsx              EXTEND → submenu/separator/checkbox/label/item-layout            (W3)
src/elements/menu.tsx            (NEW) kai-menu facade                                            (W3)
src/ui/command.tsx               (NEW) EXTRACT composer's grouped listbox + row view             (W4)
src/components/composer.tsx      consume CommandList (no behavior change)                          (W4)
src/elements/command.tsx         (NEW) kai-command facade                                         (W4)
scripts/gen-element-api.mjs      emit the seam table from the registry (no drift)
```

The seam registry (sketch — `CHAT_SEAMS` shown; `PROMPT_INPUT_SEAMS` analogous):

```ts
// src/elements/seams.ts
export type SeamMode = 'inject' | 'replace';
export interface SeamDef { name: string; mode: SeamMode; part?: boolean; doc: string; }

export const CHAT_SEAMS: SeamDef[] = [
  { name: 'header-start',     mode: 'inject',  doc: 'Leading header controls, left of the title.' },
  { name: 'header-end',       mode: 'inject',  doc: 'Trailing header controls.' },
  { name: 'header',           mode: 'replace', part: true, doc: 'Full custom header; replaces the built-in bar.' },
  { name: 'sidebar',          mode: 'inject',  part: true, doc: 'Left column (your nav / conversation list). Fixed width; use compose-your-own for resizable.' },
  { name: 'empty',            mode: 'replace', doc: 'Zero-state, shown while messages is empty.' },
  { name: 'composer',         mode: 'replace', doc: 'Full custom composer; you own submit + loading, drive the thread via messages.' },
  { name: 'composer-actions', mode: 'inject',  doc: 'Accessory row above the composer.' },
  { name: 'footer',           mode: 'inject',  part: true, doc: 'Row below the composer (disclaimers, meter).' },
];

export const PROMPT_INPUT_SEAMS: SeamDef[] = [
  { name: 'notice',        mode: 'inject', part: true, doc: 'Banner above the input (e.g. "model unavailable"). You own copy + dismiss.' },
  { name: 'toolbar-start', mode: 'inject', doc: 'Leading toolbar controls in the real input toolbar (e.g. a + menu).' },
  { name: 'toolbar-end',   mode: 'inject', doc: 'Trailing toolbar controls (e.g. a custom selector).' },
];
```

## Seam sets

### `<kai-chat>` (proven)

| Seam | Mode | `::part` | Notes |
|---|---|---|---|
| `header-start` / `header-end` | inject | — | shipped; unchanged |
| `header` | replace | ✓ | full custom bar |
| `sidebar` | inject | ✓ | fixed-width; root becomes a row |
| `empty` | replace | — | gated on `messages.length === 0` |
| `composer` | replace | — | the data-flow-wall seam |
| `composer-actions` | inject | — | accessory row above the input |
| `footer` | inject | ✓ | below the composer |
| *messages / cards* | **registry** | — | **not a slot** |

### `<kai-prompt-input>` (W2)

| Seam | Mode | `::part` | Notes |
|---|---|---|---|
| `notice` | inject | ✓ | banner above the input (the "Fable 5 unavailable" case) |
| `toolbar-start` | inject | — | leading controls *inside the real toolbar* (the `+` menu) |
| `toolbar-end` | inject | — | trailing controls (a custom selector) |

This resolves spike **gap #2**: `composer-actions` on `<kai-chat>` is a row *above* the input; true *in-toolbar* injection happens here, on `<kai-prompt-input>` itself, where the toolbar lives. `<kai-chat>` keeps `composer-actions` for the simple case and forwards to the input's toolbar seams for the rich case.

## Primitives — expose / extend / extract

### `kai-menu` — **extend** `src/ui/dropdown.tsx`, then expose

`Dropdown` already does the hard 80%: portal, positioning, `useDismiss`, roving focus, typeahead, and the shadow-DOM `getRootNode().activeElement` fix. It is **flat** — only `Dropdown`/`Trigger`/`Content`/`Item` (`role="menu"`/`menuitem`). To match the `+`-menu screenshot, add:

- `DropdownSub` / `DropdownSubTrigger` / `DropdownSubContent` — cascading submenus (`Skills →`).
- `DropdownSeparator`, `DropdownCheckboxItem` (the `✓`), `DropdownLabel` (section header).
- A standard item layout: leading icon + label + trailing shortcut/chevron.

Then a thin `kai-menu` facade (`defineWebComponent`). Items + actions remain **consumer content**. Bounded build on a done foundation.

### `kai-command` — **extract** the composer's grouped listbox, then expose

Image #3 already exists, welded into `src/components/composer.tsx` (941 lines):

- `TriggerItem` (`composer.tsx:37`) carries the row shape: `label` + `icon` + `description` (muted meta) + `kind` + `group` (section header).
- `groupedItems()` (`composer.tsx:291`) groups by `group`, first-appearance order.
- Renders `role="listbox"` (`:864`) with section headers (`:882`) and `role="option"` rows of icon + label + description (`:913`).

Lift the grouped-listbox + row view into a reusable `CommandList` primitive (`src/ui/command.tsx`); have the composer **consume** it (zero behavior change — guarded by the existing composer IVP); expose a `kai-command` facade for standalone use (an `@`-picker or palette outside the composer). Low-risk refactor, not a build. Result data stays **consumer content**.

## Gaps from the spike, closed

1. **Data-flow wall needs a written contract** → per-seam `doc` + `loading` host-attribute reflection. (Confirms why `messages` is a prop.)
2. **In-toolbar injection** → promoted to in-scope as the `<kai-prompt-input>` `toolbar-start/-end` seams (W2).
3. **Ad-hoc seam names** → the typed `seams.ts` registry.
4. **Fixed-width sidebar** → by design; resizable steered to `compose-your-own`.
5. **SSR / no-shadow** → slots inert without a shadow root (existing); audit adds an SSR check per element.

## Rollout — independently plannable workstreams

Each workstream is its own implementation plan off this spec.

- **W1 — Formalize `<kai-chat>` seams.** Extract `seams.ts`; wire the facade + docs generator from it; add replace-seam contracts + `loading` reflection; promote the spike's stories/IVP into the committed suite; assert the drop-in (no-seam) snapshot is unchanged. *(First plan; builds on the spike.)*
- **W2 — `<kai-prompt-input>` seams.** `notice` + `toolbar-start/-end`; `<kai-chat>` forwards `composer-actions` into the input toolbar. *(Depends on W1's seam registry.)*
- **W3 — `kai-menu`.** Extend `Dropdown` (submenu/separator/checkbox/label/item-layout) + expose. *(Independent of W1/W2.)*
- **W4 — `kai-command`.** Extract `CommandList` from the composer + expose. *(Independent; guarded by the composer IVP.)*
- **W5 — Audit.** Grade the other ~49 elements against the W1 rubric → prioritized seam backlog. *(After W1.)*
- **(later, separate spec)** Template/registry distribution — the shadcn-style owned-template layer the seams + primitives unlock.

Dependency order: **W1 → W2**, **W1 → W5**; **W3** and **W4** parallel anytime.

## Testing strategy

- **Seam IVP (real browser, real shadow DOM):** per seam, assert `slot.assignedElements().length > 0` from the host `shadowRoot`, plus a screenshot. Replace seams assert the stand-in drives behavior. Mirrors the `kai-composer` IVP; config `playwright.seams.config.ts`.
- **Drop-in regression:** with no seams projected, snapshots unchanged.
- **`kai-menu` a11y:** roles (`menu`/`menuitem`/`menuitemcheckbox`), submenu open/close + focus, keyboard nav, dismiss — browser tests.
- **`kai-command` extraction:** the composer's existing IVP (`/` and `@` flows) must stay green after the swap — that *is* the regression guard.
- **No jsdom unit tests for projection/menus** — shadow + portal behavior is browser-only by nature.

## Prototype status

Built on branch `spike/kai-chat-seams` (worktree `kitn-chat-spike-kai-chat-seams`), uncommitted — **W1 scope only**:

- `src/components/chat-thread.tsx` — root restructured to a row; all eight `<kai-chat>` seams placed; inject/replace gating; `part` hooks.
- `src/elements/chat.tsx` — generalized seam detection (one `SEAMS` array + flag map) replacing the two header-only signals.
- `src/elements/chat-seams.stories.tsx` — three stories (Inject / EmptyState / ReplaceComposer), every seam filled with plain DOM.
- `tests/e2e/chat-seams-ivp.spec.ts` + `playwright.seams.config.ts` — IVP: **3 passed**, screenshots in `spike-screens/`.

`npx tsc --noEmit` clean. Run: `npm run storybook` → **Spikes → Chat Seams**, or `npx playwright test --config playwright.seams.config.ts`.

Not yet built (designed only): `seams.ts` registry, `loading` reflection, the prompt-input seams (W2), `kai-menu` (W3), `kai-command` (W4).
