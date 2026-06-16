# Design Spec — Component Docs & Developer Experience (2026-06-15)

**Branch:** `feat/component-docs-dx`. **Owner:** autonomous (Rob granted full ownership).
**Goal:** the foundation of components is solid; the gap is **developer enablement** —
helping developers know *how* to use the components, *when* to use them, and *what the
patterns/recipes are* for building AI chats across frameworks. North star for
web-component DX: **Web Awesome / Shoelace** (Cory LaViska).

This spec captures decisions from a 3-stream research pass (Web Awesome docs deep-read;
design-system taxonomy across Polaris/Carbon/Atlassian/Spectrum/Fluent/Primer/Material/
SLDS + Storybook; our own IA + gap audit). Reports summarized inline below.

---

## 1. Taxonomy (decided)

Four tiers. The distinguishing test is **intent**, not size.

- **Foundations / Theming** — tokens, theming, typography, accessibility. (Have it.)
- **Components** — one reusable building block with one job and a documented prop/JSON
  API (`kc-message`, `kc-prompt-input`). *Answers "what is this control."*
- **Patterns** — a **prescriptive, framework-agnostic** solution to a recurring chat-UX
  problem, composing multiple components (Chat Panel Layout, Empty State, Message Actions,
  Streaming, Checkpoint & Restore). *Answers "how do I solve this recurring scenario."*
- **Recipes / Examples** — **concrete, copy-paste** assemblies:
  - **Examples / Templates** = full composed apps (Full Chat App, Composed Shell).
  - **Recipes** = small task/tech integration snippets (Streaming w/ OpenRouter, TTS, STT) —
    stay nested under Docs.

### The decision test (publish this)
> **A Pattern is prescriptive and design-led** — it answers "what should I build and why,"
> is framework-agnostic, and **stands alone if you delete every code block**.
> **A Recipe/Example is code-led** — it answers "paste this to make it work," is tied to
> specific components/frameworks/services, and is **worthless without its code.**

Discriminators: (1) *delete-the-code* — if removing code guts the page, it's a Recipe.
(2) *variations* — Patterns enumerate when to use each variation; Recipes show one path.
(3) *naming* — Patterns named after the problem ("Empty State"); Recipes after the task
("Streaming with OpenRouter").

### IA corrections (decided)
1. **"Examples" conflates 3 jobs.** Only Message Actions, Streaming, Checkpoint & Restore
   are true **Patterns**. Reasoning, Sources, Prompt Input Variants, Context Usage are
   **single-element extended docs** — their richness belongs on the Component page (or they
   become thin Pattern stubs that point at the component). Full Chat App / Composed Shell are
   **Examples/Templates**.
2. **Card split-brain.** Card `kc-*` elements live under `Generative UI/Cards`, invisible to a
   dev browsing `Components`. Cross-link both ways (and surface them in the Catalog/decision
   guide); do not silently hide a whole class of elements.
3. **`ChoosingComponents.mdx` is mislocated** (under Examples, absent from storySort). Promote
   it to **Docs/Getting Started → "Choosing Components"**, add to `storySort.order`, and expand
   it into the canonical taxonomy + decision guide (publish §1 there).

---

## 2. Documentation principles (Web Awesome-derived)

- **Per-component page skeleton** (consistent order): intro w/ one-line **"use this when…"**
  → live demo → **many tiny single-feature examples** (live preview first, code below) →
  **API tables** (Attributes & Properties · Slots / declarative children · Events · CSS parts
  · CSS custom properties · Dependencies) → **Anatomy** for compound elements → Related.
  Our generated API tab already covers the tables; the gaps are the *"use when"* prose,
  *Anatomy*, and *more small examples*.
- **"Use this when…" one-liner in every element intro** + a **Placement** note. ~20 leaf
  elements lack this today (sources, suggestions, context, tool, model-switcher, scope-picker,
  checkpoint, empty, feedback-bar, skills, …). This is the highest-leverage "when to use" fix.
- **Child-element doc pattern** (the select+option shape): a child descriptor element gets its
  **own thin API page** that states *"must be used as a child of `<kc-…>`"*, documents only its
  small API (attributes / slots / parts), and **redirects to the parent for usage examples**.
  Composition examples live on the **parent** page. Apply to `<kc-action>` first.
- **AI-consumable docs.** We already generate `llms.txt`/`llms-full.txt`. Web Awesome also ships
  an **Agent Skills** markdown directory loaded progressively by Claude Code. Consider adding a
  "Using with AI" doc + a skills-style export (low priority, high differentiation).

---

## 3. Declarative-composition doctrine (decided)

When should a behavior be a **child descriptor element** vs a **prop/JSON payload**?

- **Fluent rule:** a **slot/attribute** is for a *single replaceable part*; **child elements**
  are for a *collection of items / a hierarchy*.
- **React Aria rule:** **static markup children** are the default for *authored, known-ahead*
  sets (HTML-first DX, like `<select><option>`); a **JSON/array payload** is for *dynamic /
  model-streamed* data. **Document and support BOTH**, and state which is preferred per element.
- **Mechanism (the `<kc-action>` template, `src/elements/message.tsx`):** the child is a
  **light-DOM data-carrier** (not a registered element) — the parent reads it via
  `querySelectorAll(tag)` in `onMount` + a `MutationObserver` (`childList/attributes/subtree`),
  maps to descriptors, and **merges with the array prop**. Both APIs coexist; the array path is
  what `kc-chat` uses internally for streamed data.

### Rollout roadmap (priority)
1. **`kc-suggestions` + `<kc-suggestion value>Label</kc-suggestion>`** — HIGH; most
   select+option-shaped; pairs with the "grouped suggestions" capability gap.
2. **`kc-sources` + `<kc-source>`** — HIGH; `kc-source` already exists standalone; pairs with the
   `numbered` citation gap.
3. **`kc-conversations` + `<kc-conversation>` / `<kc-conversation-group>`** — MED; list+item.
4. **`kc-choice` + `<kc-option>`, `kc-tasks` + `<kc-task>`, `kc-model-switcher` + `<kc-model>`** —
   MED/LOW; card payloads route through the dispatcher, but children help HTML-first authors.

Each rollout = element reads children + merges; a parent story showing the declarative form; a
thin child API page; the `displayName`/meta regen; tests.

---

## 4. Composite UX-gap closures (from the capability audit)

Source: `docs/superpowers/specs/2026-06-15-element-capability-gaps.md` (38 gaps). Prioritized:

- **DONE this effort:** `FeedbackBar` ask→optional-detail→thanks (self-contained, no consumer
  hide); `kc-message` + `<kc-action>` declarative children + tooltips.
- **HIGH:** `kc-sources` **`numbered`** citations ([1][2][3]); `kc-prompt-input`
  **`stoppable`/`stop`** (cancel a stream) + custom toolbar `actions`; `kc-suggestions` grouping.
- **MED:** `kc-context` payload **thresholds** (`warnThreshold`/`dangerThreshold` +
  `thresholdchange`); custom-icon descriptors on `kc-checkpoint`/`kc-empty`/`kc-chain-of-thought`.
- **Structural:** **`kc-scroll-button` element does not exist** (only a Solid primitive) — add it.

---

## 5. Non-goals / guardrails

- Behavior is **prop/JSON/markup-driven**, never CSS-manipulation or shadow-piercing
  (`components-prop-driven-not-css`). A CSS-only behavior is a gap.
- Pre-1.0: **no back-compat required**; breaking changes bump the minor via release-please.
- Do not over-decompose: a cohesive interaction (feedback flow) is **one** component that owns
  its state machine — not parts the consumer wires.
- Keep the **web-component (HTML) API as the canonical contract**; framework wrappers are thin
  tabs over it.

---

## 6. Success criteria (what "done" looks like for this effort)

1. Taxonomy published + IA corrected (Examples reclassified, cards cross-linked, Choosing
   Components promoted).
2. Every element has a **"use this when…" + Placement** line.
3. The **declarative-children pattern** rolled to suggestions + sources (exemplars), each with a
   parent demo story + a thin child API page.
4. The **top composite gaps** closed (sources numbered, prompt-input stoppable, context
   thresholds) or explicitly deferred with a note.
5. Gate green (tsc + unit + storybook + build); metas regenerated; nothing committed to `main`
   without review.
