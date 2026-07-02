# Proposal: composition-first architecture (presets over primitives)

Date: 2026-07-01
Status: Proposal / RFC. Not scheduled. Precedes a phase-1 brainstorm + spec.
Origin: discussion while refreshing the React starter example.

## TL;DR

`kai-chat` and `kai-workspace` are batteries-included orchestrators whose configuration
surface has grown large (`kai-chat`: ~28 props plus five escape-hatch slots) because all
customization funnels through one component's prop/slot API. But `kai-chat` is already a
thin facade over the internal `ChatThread` composition. The proposal: make composition the
substrate and the canonical customization path, expose the intermediate composition layer
as public `kai-*` elements (starting with `kai-thread`), and re-cast `kai-chat` /
`kai-workspace` as thin presets built from those elements. Keep a batteries-included entry
point for adoption. Remove the monolith shape, not the batteries. One architecture, a
graduation path with no ejection cliff.

## The problem

The configuration bloat was not an execution mistake. It is what configuration-based
customization does structurally:

- **Config scales as `parts × placements`. Composition scales as `parts`.** Every region
  (header, footer, sidebar, composer) times every knob becomes a prop or a slot. That is
  why `kai-chat` accreted ~28 props plus `headerStart` / `headerEnd` / `sidebar` /
  `composer` / `footer` slots.
- **Those slots are composition wearing a config costume.** Filling a `composer` slot with
  your own element is strictly worse ergonomically than placing a `<kai-prompt-input>`. The
  orchestrator is already leaking toward composition.
- **The ceiling.** The moment a consumer needs something the config does not expose, they
  hit a wall: fork, shadow-pierce (which the kit forbids), or wait on us. Composition has no
  such ceiling.
- **Maintenance.** Every feature must be threaded through the orchestrator's API,
  documented, and kept backward-compatible. That accretion is the source of the
  "too much you need to know" problem.
- **Two-path fragmentation.** Docs, examples, and support split between "configure the black
  box" and "compose it yourself."

## Key finding (this is what makes the proposal cheap)

The split is not two architectures. The kit is already layered:

```
primitives  ->  ui  ->  components (ChatThread, ChatContainer, ScrollButton, use-stick-to-bottom)
            ->  elements (kai-* facades)  ->  react wrappers + @kitn.ai/ui/state
```

`kai-chat` (`elements/chat.tsx`) imports `ChatThread` and wraps it. It is a preset already.
What is missing is that the intermediate composition layer is not exposed as public
elements: at the orchestrator level only `kai-chat` and `kai-conversations` exist. So a
consumer who wants the middle ground (a thread plus their own composer) has to hand-roll it.
Our React reference example did exactly this: it reinvented the scroll container and
stick-to-bottom that already live inside `ChatThread`.

## What we keep (why "just delete the black boxes" is wrong)

Do not remove the batteries-included entry point. Composition cannot cover these:

- The three-line `<kai-chat messages=…>` is the biggest adoption asset. "Assemble six
  elements and wire three hooks" loses the first-run moment and raises the barrier. Our own
  React example needed `useKaiChat` + `useConversations` + wiring + a hand-rolled thread to
  stand up a *basic* chat.
- The ~80% who never customize should not pay the customization tax.
- Assembly-correctness cost: scroll / stick-to-bottom, streaming refs, accessibility, focus.
  A preset encodes the correct assembly once so consumers cannot get it subtly wrong.
- Plain HTML and non-React frameworks: one tag beats orchestrating many elements plus a
  state layer that is React-shaped today.

## The proposal: a graduation model

Composition is the substrate and the canonical customization path. `kai-chat` /
`kai-workspace` become thin presets built from the same public elements. This is the shadcn
"blocks" model: a block that is composed primitives you can eject and edit, with no ceiling.

1. **Promote the composition layer to public elements.** Expose `kai-thread` (the message
   list plus stick-to-bottom, already inside `ChatThread`). Audit for other intermediate
   pieces worth exposing.
2. **Re-cast `kai-chat` as a preset over those elements** (it nearly is one). Trim its
   bespoke props to genuinely global concerns (theme, data in, streaming, loading). Anything
   that means "swap this part" becomes a child or slot pass-through, not a prop. The surface
   collapses because the parts carry their own config.
3. **No ejection cliff.** Docs lead with `<kai-chat>` for the five-minute win. "Need more?
   here are the exact elements it is made of" is the customization path. You never throw away
   what you started with.

## Level distinction (which components are which)

- **Leaf widgets** (`Message`, `PromptInput`, `Conversations`, `Thread`): composables, the
  source of truth. `kai-conversations` is a legitimate leaf (a grouped, searchable,
  selectable list). Keep it as-is.
- **Page orchestrators** (`kai-chat`, `kai-workspace`): the black-box liability. Re-shape
  into presets. `kai-workspace` is the app-shell preset (layout + sidebar + collapse) over
  `kai-resizable` + sidebar + main.

## Architecture changes (sketch)

- **New public elements:** `kai-thread` (the keystone). Evaluate whether scroll affordances
  (`ScrollButton`, the stick-to-bottom container) collapse into `kai-thread` or warrant their
  own elements.
- **`kai-chat`:** keep the tag. Reimplement as `<kai-thread>` + `<kai-prompt-input>` plus
  optional header / footer / sidebar via slots. Global props only.
- **`kai-workspace`:** same treatment, drawn one level up (it composes `kai-resizable` +
  sidebar + a `kai-chat` or a composed main).
- **State layer:** the React hooks (`useKaiChat`, and the proposed `useVoiceInput`) remain
  the wiring for the composed path. They are what makes composition ergonomic in React. Keep
  and grow them.
- **`kai` MCP + docs:** `component_reference` and the scaffold archetypes shift to
  composition-first, with presets offered as quick-starts.

## Migration and back-compat

The package is published at 0.18.x (pre-1.0). Under release-please, breaking changes are
minor bumps, but real consumers exist and ui.kitn.ai leads with `kai-chat`. So phase it:

1. **Additive.** Ship `kai-thread` and the composables. `kai-chat`'s current API keeps
   working.
2. **Reimplement `kai-chat` as a preset, behavior-preserving** for the common path. Verify
   across frameworks with the `/consumer-regression` skill before merging.
3. **Deprecate, then remove.** Bespoke props that composition supersedes get deprecation
   warnings and doc redirects, and are removed only on a later minor. No hard break in a
   single step.

## Docs and story shift

- **Quick start:** the `<kai-chat>` preset.
- **Customization:** composition is the way. Recipes: chat with a custom composer, chat plus
  a conversations sidebar (the workspace), thread-only embed.
- Reframe the `kai-chat` / `kai-workspace` doc pages as presets/blocks, each with a
  "made of these elements" list that links to the composables.

## Roadmap impact

- `kai-thread` graduates from "gap #1, nice to have" to the keystone of the architecture.
  Build it first.
- The voice hook (gap #2) and `moon` / `sun` icons (gap #3) still stand and fit under
  "make composition easy to use."
- The examples refresh (React reference, then other frameworks) becomes the proving ground:
  every example is composition-first and also shows the preset variant.

## Risks and open questions

- **Prop-usage audit.** Which of `kai-chat`'s ~28 props are actually used in the wild versus
  vestigial? Thinning without that data risks breaking real consumers.
- **Where is the line for `kai-workspace`?** It orchestrates layout, sidebar, and collapse.
  More surface than `kai-chat`, so the preset/composition boundary is harder to draw.
- **React-centric state layer.** Composition-first leans on hooks in React. The elements and
  events already work framework-agnostically, but the wiring convenience is React-only today.
  The plain-HTML and other-framework composed story needs to be more than "here are hooks."
- **Naming and contract.** Is `kai-thread` the right name and scope? Does exposing it change
  `kai-chat`'s internal contract in a way that affects the streaming or actions API?

## Non-goals

- Removing `kai-chat` or `kai-conversations`.
- A ground-up rewrite. The composition layer already exists. This is promotion, reshaping,
  and docs, not new machinery.

## Success criteria

- A consumer can build a standard chat in about three lines (preset) OR compose the same UI
  from public elements with no capability they cannot reach.
- `kai-chat`'s bespoke prop surface materially shrinks. New features land as elements, not as
  orchestrator props.
- One canonical customization story. Docs, scaffolder, and examples are all composition-first
  with presets as quick-starts.
- No regression for existing `kai-chat` consumers through the deprecation window
  (`/consumer-regression` green).

## Recommended next step

This is strategy, not a scheduled task. The smallest slice that proves the model is a
phase-1 brainstorm and spec: expose `kai-thread`, and reimplement `kai-chat` as a
behavior-preserving preset over it. If that lands cleanly and consumer-regression stays
green, the rest of the model (workspace, docs, deprecations) follows the same pattern.
