# Interaction-API rollout — implementation guide (for agents)

This is the working guide for adding the missing **events, methods, and props** to the
`kai-*` elements, per the audit spec (`docs/superpowers/specs/2026-06-26-interaction-api-audit.md`,
Parts 1 + 2). Read this fully before editing.

## Conventions (non-negotiable)

- **Events**: non-bubbling `kai-*` `CustomEvent`s via the facade's `dispatch('kai-x', detail)`.
  Declare them in the facade's `interface Events { 'kai-x': { ... } }` and pass `Events` as the 2nd
  type arg to `defineWebComponent<Props, Events>`. Consumers listen on the element.
- **Methods**: real instance methods via the facade's `ctx.expose({ name: fn })`. camelCase.
  Vocabulary: focus, blur, clear, reset, send, show, hide, toggle, open/close (NEVER if a prop owns
  the name — see collisions), scrollToBottom, select, expand, collapse, retry, copy, start, stop.
  Put a `/** one-line doc */` above each method — `gen-element-api` extracts it.
- **Props**: camelCase JS properties (scalars also reflect as kebab attributes), added to the `Props`
  interface AND the `defineWebComponent` defaults object (default `undefined` unless a real default).
- **★Collisions**: a method/prop name must never collide with an existing PROP name (the prop accessor
  wins and silently breaks the method). Check the element's props in `src/elements/element-meta.json`.
  Known: `submit` prop → method is `send`; `sidebarCollapsed` prop → `toggleSidebar`; `open` prop
  (kai-tool) → method is `expand`. Native `focus`/`blur` are getter-only on the chain — `expose` uses
  `defineProperty` so that's handled; just don't name a method the same as a prop.
- **Model**: the **Shoelace/WebAwesome lightweight model**, NOT React-controlled. `disabled` everywhere
  it's interactive. For form-value controls (switch/choice/tasks/form/selects), a controlled `value`
  is warranted; for overlays/collapsibles, the disclosure pattern below.

## Pattern A — Overlays / disclosures (open/close)

For any open/close element (hover-card ✅done, tooltip, popover, menu, model-switcher, scope-picker,
collapsibles tool/reasoning/chain-of-thought). The reference implementation is **`kai-hover-card`**
(`src/elements/hover-card.tsx` + `src/ui/hover-card.tsx`) — copy its shape.

1. **Primitive** (`src/ui/<x>.tsx`): expose an open controller + accept a seed + disabled. Add to the
   Root's props:
   ```ts
   defaultOpen?: boolean;
   disabled?: boolean;
   controllerRef?: (api: { open: Accessor<boolean>; setOpen: (v: boolean) => void }) => void;
   ```
   Seed the internal signal from `props.defaultOpen ?? false`; gate the open trigger on `props.disabled`;
   call `props.controllerRef?.({ open, setOpen })` once during setup. (For `Dropdown`, the open state is
   sealed — surface `setOpen`/`open` the same way.)
2. **Facade** (`src/elements/<x>.tsx`): add props `open`/`defaultOpen`/`disabled` (defaults `undefined`),
   declare `interface Events { 'kai-open-change': { open: boolean } }`, capture the controller, and call:
   ```ts
   import { wireDisclosure } from './disclosure';
   // inside the facade body, with `ctx` = the 2nd arg:
   let api: OpenController | undefined;
   wireDisclosure(ctx, () => api, () => props.open);
   // pass defaultOpen={ctx.flag('defaultOpen')} disabled={ctx.flag('disabled')} controllerRef={(a)=>(api=a)} to the Root
   ```
   `wireDisclosure` gives you the settable+reflecting `open` attr, `kai-open-change`, and
   `show()/hide()/toggle()` gated by `disabled` — do NOT re-implement that logic.
3. Extra per-element props the spec calls for (e.g. tooltip needs `placement` + `closeDelay`; the
   Dropdown family may want `kai-open-change`). Wire them through the primitive.

## Pattern B — Imperative methods on existing state

For elements whose underlying component already does the work internally (the "latent" methods in the
spec). Reference: **`kai-prompt-input`** (`src/elements/prompt-input.tsx`) — `focus/blur/clear/send`.

- If the capability is reachable from the facade (a signal setter, a handler, a DOM node in the
  shadow), call `ctx.expose({ ... })` directly with closures over it. `focus()` queries the editor in
  the shadow root: `element.shadowRoot?.querySelector('[contenteditable]:not([contenteditable="false"]), textarea, input:not([type="file"])')?.focus(options)`.
- If the state lives in a child Solid component, use **Pattern C**.

## Pattern C — controllerRef forwarding (state in a child component)

When the state lives in a wrapped Solid component (e.g. chat-thread, the card bodies). Reference:
**`kai-chat`** + **`ChatThread`** (`src/components/chat-thread.tsx` exposes `controllerRef`; the facade
forwards). Steps: add a `controllerRef?: (api) => void` prop to the Solid component that builds the
imperative handle from its internal state; the facade captures it (`let api; ...controllerRef={a=>api=a}`)
and `expose`s delegating methods. Add `controllerRef` to the facade's `Omit<...>` so it isn't a public prop.

## Per-element work
Each element's exact gaps (events/methods/props, gap-flagged, with rationale) are in the spec
(`docs/superpowers/specs/2026-06-26-interaction-api-audit.md` Parts 1 + 2). Implement the **gap** items
only; skip `exists`. Skip presentational elements entirely. Honor the tier: do all **standard** items;
**nice-to-have** only if quick + clearly right.

## Agent workflow (how to do the work + verify + report)

You work in an **isolated git worktree** off the current branch (it already has `defineWebComponent`'s
`expose`, the `wireDisclosure` helper, and the exemplars).

1. **Setup**: symlink deps so tooling works without a reinstall —
   `ln -sfn /Users/home/Projects/kitn-ai/kitn-chat/node_modules node_modules`
2. **Implement** your assigned element(s)' source only: the facade(s) in `src/elements/` and, if needed,
   the primitive in `src/ui/` or `src/components/`. Follow the patterns above.
3. **Do NOT**: run `npm run build:api`; edit `src/elements/element-meta.json`, `element-types.d.ts`,
   `slots.ts`, `define.tsx`, or any generated file; touch elements outside your assignment. (The
   orchestrator runs build:api + the browser IVP once, centrally.)
4. **Verify (your IVP)**: run `npx tsc --noEmit` and confirm **0 errors** — the typed Solid + facade
   surface catches most mistakes. Re-read each change against the patterns + the collision rule.
5. **Report back** (structured): the files you changed; per element — the events/methods/props you added;
   `tsc` result; and the **exact runtime assertions** the orchestrator should check in Storybook
   (e.g. "`el.show()` → `[open]` attr true + card visible + one `kai-open-change{open:true}`";
   "`el.disabled=true; el.show()` → stays closed"). Flag anything you were unsure about.

The orchestrator does the authoritative browser IVP (Storybook + Playwright — `kai-*` elements need a
real browser; they can't be unit-tested in jsdom), then build:api, then commits the wave.
