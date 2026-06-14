# Handoff — kc-* rename, resizable, artifact, + AG-UI/A2UI direction (2026-06-13)

Resume doc for `@kitnai/chat`. Big session. Read this, then the specs under
`docs/superpowers/specs/2026-06-13-*`. Prior context: `[[kitn-chat-state]]` memory.

## ⚠️ Branch state (NOTHING merged to main; all unpushed, stacked)

```
main (8e4b4c6, = 0.7.0 + phase-2 specs PR #34)   ← clean, untouched
  └─ feat/kc-element-prefix   (the kc-* rename; commit ~5a4ec19)        feat!
       └─ feat/kc-resizable   (656adeb resizable + 80f5263 spec)        feat
            └─ feat/kc-artifact (9cd255a spec; +1 artifact commit)      feat
```

These are **stacked** (each branched off the previous, since each needs the
`kc-` tags that aren't on main yet). **Decision needed:** merge order + whether
to squash the stack. Recommended: merge `feat/kc-element-prefix` → main first
(it's the breaking rename), then rebase/merge resizable, then artifact. All are
breaking-ish/feat → would cut a minor pre-1.0 when merged. Merge via REST
(`gh api --method PUT repos/kitn-ai/chat/pulls/N/merge -f merge_method=merge`).
Review-before-commit/merge per `[[review-before-commit]]`.

## What shipped this session

1. **`kc-*` element prefix (feat!).** Renamed ALL custom-element tags to a single
   short Shoelace/Web-Awesome-style prefix `kc-` (kc = Kitn Chat). Flagship
   `<kc-chat>`; features `kc-message`, `kc-tool`, `kc-conversations`, …;
   primitives `kc-loader`, `kc-code-block`, … — single tier. **Kept brand-level
   (unchanged):** `@kitnai/chat` pkg, `dist/kitn-chat.es.js` bundle + `KitnChat`
   UMD global, `--kc-*` design tokens, `defineKitnElement` factory. React
   wrappers follow (`KcChat`, `KcTool`). Element story files use **bare names**
   beside facades (`tool.stories.tsx`). Decision rationale + the long
   brand-vs-product → kc- journey is in `[[kitn-chat-state]]`. Done via scripted
   boundary-aware rename; **gotcha:** `.css`/`.js` files + uppercase `KITN-`
   tagName checks aren't covered by tag scripts — sweep broadly.
2. **`<kc-resizable>` + `<kc-resizable-item>`** (`feat/kc-resizable`, 656adeb).
   Composable resizable layout (≤3 panels), auto dividers, per-item `size`(px/%),
   `locked`, `min`/`max`, `hidden`; `orientation`; `change` event; MutationObserver
   re-layout. Plus Solid `Resizable` convenience; the raw `ResizablePanelGroup/
   Panel/Handle` primitives were **leveled up** (wired dead min/max, px-or-%,
   `locked`, keyboard resize + aria, N-panel settle, exact clamp). Spec:
   `docs/superpowers/specs/2026-06-13-kc-resizable-design.md`. **Fully verified**
   (drag/keyboard/fill/orientation/nested + gate).
3. **`<kc-artifact>` + `<kc-file-tree>`** (`feat/kc-artifact`). Artifact viewer:
   functional toolbar (back/fwd/reload/home + editable path + Preview|Code tabs),
   **sandboxed iframe** framing a **consumer-served `src`** (the ChatGPT/Claude/
   V0 model — provider serves, component frames), Code pane = `FileTree` +
   `<kc-code-block>`. New public `FileTree`/`<kc-file-tree>` (nested folders from
   `/` paths, ARIA tree, keyboard nav). Static fixtures in
   `examples/artifact-fixtures/` served via Storybook `staticDirs`. Spec:
   `docs/superpowers/specs/2026-06-13-kc-artifact-design.md`. Verified: fill,
   nav, Code-tab highlighting, image, a11y, gate green (32 elements, 414 tests).

### Key technical patterns learned (reuse these)
- **Slotted-content-fills-panel (HARD-WON):** `:host{display:block;height:100%}`
  + a **definite `minmax(0,1fr)` grid cell scoped to a wrapper around the
  `<slot>`** — NOT on `:host`, because `defineKitnElement` renders a sibling
  portal-mount `<div>` that would steal a grid track. A flex item only stretches
  the cross axis; grid stretches both. Precedent: Shoelace/Web-Awesome split-panel
  (grid) + react-resizable-panels (inner flex-grow wrapper for scroll).
- **Sandbox-honest iframe history:** a cross-origin sandboxed iframe's
  `history`/`location` are opaque, so `<kc-artifact>` keeps its OWN nav stack for
  component-initiated nav; that's correct, not a workaround.

### ⛔ Artifact's ONE remaining item — PDF preview
A **sandboxed** iframe **cannot** render a PDF via the browser's native viewer
(plugin-class context blocked by `sandbox`). Current PDF story shows blank.
**Fix next session:** type-aware preview — for `type:'pdf'` either embed **pdf.js**
inside the frame, or show an "Open in new tab ↗ / download" fallback. (HTML/image
preview, code, nav all work — PDF is the only gap.)

## 🌟 BIG discussion to preserve — AG-UI / A2UI / iframe-delivered UI (NOT started)

Rob wants the chat window to support **server-delivered, provider-owned UI**
(forms/cards/templates the *server* renders, the client doesn't pre-bundle).
Researched + discussed; **decision + plan below.** This is the next big feature
to brainstorm→spec→build after the current branches land.

**The protocols (both OPEN/free — CopilotKit is a *paid product* on top, not the
protocol):**
- **AG-UI** (`ag-ui-protocol/ag-ui`) — open event protocol (SSE, ~17 typed events:
  text chunks, `TOOL_CALL_*`, `STATE_SNAPSHOT/DELTA`, lifecycle). *How* the agent
  talks to the frontend.
- **A2UI** (Google, `a2ui.org` v0.9) — open, JSONL **declarative UI** protocol:
  agent emits JSON describing widgets, client renders with **native** components.
  *What* UI to render. Rides over AG-UI. (Flutter GenUI uses it.)

**Two delivery philosophies (both valid, different goals):**
- *Client-owned (A2UI default):* agent sends declarative JSON, **client renders
  with its component catalog** (= kitn-chat's `<kc-*>`). Safe, native a11y/theming,
  no iframe. Needs the client to have the catalog (CDN `<script>` gives zero
  *build* install).
- *Provider-owned (Rob's choice):* **server renders UI → sandboxed cross-origin
  iframe → client embeds.** Provider fully controls + updates UI, client knows
  nothing, security via sandbox + SOP. This is the **Stripe Elements / Intercom**
  pattern — proven and correct *for this goal* (NOT outdated; that critique was
  about client-owned rendering).

**Agreed direction:** Rob wants **provider-owned (iframe)**, because templates
should come from the server, not be the client's responsibility. So:
- **iframe = delivery + sandbox**; **AG-UI's event schema = the wire format** across
  the boundary (host↔iframe via `postMessage`; provider→iframe via SSE). Don't
  reinvent the message protocol; stay interoperable. Reuse `<kc-*>` components as
  the provider-side render catalog.
- **Cross-origin** provider iframe is the secure default (SOP isolates the host;
  `allow-same-origin` then refers to the *provider's* origin, which the UI needs).
- **CSP:** host allows `frame-src https://provider`; provider hardens the iframe
  doc's own CSP; `sandbox="allow-scripts allow-forms allow-same-origin allow-popups"`.
- **Comm:** `postMessage` with **strict origin validation both ways**; typed
  channel — down: theme/locale/context/short-lived auth token; up: user events,
  **auto-height** (ResizeObserver→postMessage), lifecycle. Model payloads on AG-UI.
- **SDK = two thin pieces** (neither a new component kit): (1) **host embed SDK** —
  the *only* client install; drops the iframe, does the handshake/origin-checks/
  theme-inject/auto-resize, surfaces events; (2) **provider iframe runtime** —
  renders `<kc-*>` + the bridge. = a free, open answer to paid CopilotKit:
  *"kitn-chat as the open, framework-agnostic AG-UI front end + embeddable widget."*
- **Honest caveats:** a11y/focus continuity across the boundary is the real tax
  (ARIA + focus coordination over postMessage); latency/perf (lazy-load, reuse one
  iframe); theming must be pushed in.
- **Rob has more thoughts; deferred to a fresh session** (more context). Next:
  brainstorm→spec the embed SDK + iframe runtime + postMessage/AG-UI contract.

Sources: github.com/ag-ui-protocol/ag-ui · a2ui.org/specification/v0.9-a2ui ·
developers.googleblog.com/a2ui-v0-9-generative-ui · blogs.oracle.com (A2UI-over-AG-UI).

### Full detail — the conversation, end to end, + additional thoughts

**Rob's original framing (verbatim intent):** Inside the chat window, support
A2UI / AG-UI. His idea: it's **not the client's responsibility to already have the
templates** — they should come **from the server**. So deliver the UI components
via an **iframe** (which sandboxes the result and keeps it secure, controlled by
the *provider* sending the data). If you're connected to OpenRouter or an AI
gateway (Vercel, OpenAI/ChatGPT, etc.), the **server renders the UI elements +
their templates** and they're displayed in the iframe. He wants this **non-paid**
(CopilotKit exists but is a paid service) but done **correctly**.

**What I researched (verified, June 2026):**
- **AG-UI** = *Agent–User Interaction* protocol (`ag-ui-protocol/ag-ui`). Open,
  event-based, SSE/transport-agnostic, ~17 typed events (`TEXT_MESSAGE_CONTENT`,
  `TOOL_CALL_START/ARGS/END`, `STATE_SNAPSHOT`, `STATE_DELTA` (JSON-patch), run
  lifecycle). It's **how** an agent streams its activity/state to a frontend,
  bi-directional. **The protocol is open-source/free.** CopilotKit is a **paid
  product built on top of AG-UI** — not the protocol itself. (Microsoft Agent
  Framework, AG2, etc. integrate AG-UI.)
- **A2UI** = *Agent-to-UI* (Google, `a2ui.org`, v0.9 stable). Open, **JSONL
  streaming declarative-UI** protocol: the agent emits JSON describing widgets
  (clean separation of UI structure vs application data), and the **client renders
  them with NATIVE widgets**, progressively. "LLM-friendly" declarative format. It
  **rides over AG-UI** (Oracle + CopilotKit shipped Agent-Spec A2UI-over-AG-UI).
  Flutter's GenUI SDK uses A2UI. It was explicitly designed to **replace the older,
  riskier "agent returns raw HTML you inject"** approach.

**The crux — two delivery philosophies, both valid for DIFFERENT goals:**
- **Client-owned (A2UI's default):** agent sends declarative JSON → the **client**
  renders with its own component catalog (which, for us, IS `<kc-*>`). Pros: native
  perf, accessibility, theming integration, no iframe. Con: the client must *have*
  the catalog (a CDN `<script>` gives zero *build-time* install, but the client
  still loads + runs the components).
- **Provider-owned (Rob's choice):** the **server renders** the UI → a **sandboxed
  cross-origin iframe** → the client embeds it. Pros: the provider fully **controls
  + versions + updates** the UI server-side with no client redeploy; the client
  knows nothing and can't tamper; security via sandbox + same-origin policy. This
  is the **Stripe Elements / Intercom / embedded-checkout** pattern.

**My initial pushback, and the correction (important nuance):** I first argued the
field "moved away from iframes." That critique is real but applies to **client-
owned** rendering (A2UI replaced inject-raw-HTML with declarative). For Rob's goal —
**provider-owned, client-agnostic UI** — the sandboxed **cross-origin iframe is the
correct, proven model**, NOT the outdated thing. He's right. A cross-origin
provider iframe is isolated from the host by SOP automatically (you're not
injecting HTML into the host origin), and `allow-same-origin` there refers to the
*provider's* origin (which the UI needs for its own storage), with the host still
protected. That's a *better* security posture than srcdoc-injected HTML.

**Agreed architecture (the plan):**
- **iframe = delivery + sandbox; AG-UI's event schema = the wire format across the
  boundary** (host↔iframe via `postMessage`; provider-server→iframe via SSE). Don't
  reinvent the message protocol — stay interoperable with the AG-UI/A2UI ecosystem.
  Reuse `<kc-*>` components as the provider-side render catalog.
- **Cross-origin** provider iframe is the secure default.
- **CSP:** host page allows `frame-src https://provider…` (its only obligation);
  the provider serves the iframe doc with its *own* hardened CSP; iframe
  `sandbox="allow-scripts allow-forms allow-same-origin allow-popups"` as needed.
- **Communication:** `postMessage` with **strict `targetOrigin` + `event.origin`
  validation on BOTH ends**. Typed channel — **down:** theme/tokens, locale, user
  context, a **short-lived signed auth token**; **up:** user events, **auto-height**
  (ResizeObserver in the iframe → postMessage → host sizes the iframe), lifecycle/
  ready/nav. Model payloads on AG-UI events. **Version the protocol** (host SDK ↔
  iframe runtime negotiate a version).
- **SDK = two thin pieces (NEITHER a new component kit):** (1) **host embed SDK** —
  the *only* thing the client installs; drops the iframe, does the handshake
  (origin checks, theme/context/token injection, auto-resize), surfaces events to
  the host app; (2) **provider iframe runtime** — renders `<kc-*>` into the iframe
  doc + the bridge (receives context, emits events, reports height). This pair =
  the **free, open answer to paid CopilotKit**.
- **Honest caveats:** accessibility/focus continuity across the boundary is the real
  tax (ARIA + focus coordination over postMessage; the iframe's own content must be
  accessible — this is what iframe widgets most often get wrong); latency (iframe
  load) + perf (prefer ONE reused iframe, lazy-load); theming must be pushed in;
  the provider must still sanitize its *own* rendered output (the sandbox protects
  the host, not the provider from itself).

**Additional thoughts (mine, for the next session):**
1. **Two delivery modes can coexist** — kitn-chat could support BOTH "import the
   components" (client-owned, A2UI-declarative) AND "embed the iframe" (provider-
   owned). Same `<kc-*>` components, two channels. Don't make it either/or in the
   architecture.
2. **`<kc-artifact>` is already the iframe+postMessage backbone in miniature** — it
   frames a provider-served URL in a sandboxed iframe and keeps its own nav. The
   embed runtime can **generalize/reuse** that plumbing. kc-artifact was an
   unplanned stepping stone toward the embed feature.
3. **Positioning:** "kitn-chat = the open, framework-agnostic **AG-UI/A2UI front
   end** + an **embeddable provider widget**." That's the free CopilotKit
   alternative, and it's differentiated by component *quality* + web-component
   (CDN/any-framework) delivery, not by a new protocol.
4. **Don't invent a proprietary protocol** — adopt the open AG-UI/A2UI on the wire;
   inventing your own loses interop for zero gain. The value-add is the renderer +
   the embed bridge, not the protocol.
5. **The trifecta:** MCP (tools) + A2A (agent-to-agent, Google) + AG-UI (agent-to-
   user). kitn-chat is the **UI layer** of that stack — worth saying in marketing.
6. **Auth:** short-lived signed token from host → iframe (postMessage or a signed
   iframe URL), validated server-side by the provider; never pass long-lived
   secrets through postMessage.
7. **Zero-install is achievable BOTH ways** (CDN+declarative OR iframe); Rob chose
   iframe for *provider control*, not just zero-install — keep that the north star.

**Open questions to resolve when we spec this:**
1. iframe **cross-origin** (provider domain — my strong rec) vs same-origin to host?
2. Make kitn-chat **wire-compatible with AG-UI/A2UI** (my strong lean) vs a simpler
   kitn-specific protocol?
3. Does the provider render with `<kc-*>` server-side (SSR the components into the
   iframe doc) or client-side-in-the-iframe? (Likely client-side-in-iframe.)
4. Scope a v1: probably the **host embed SDK + a reference provider iframe runtime
   + the postMessage/AG-UI contract**, reusing kc-artifact's iframe plumbing.

**Rob has more thoughts and wants to do this in a fresh session** (full context).
Next step there: brainstorm → spec → build (same flow as resizable/artifact).

## Other findings / decisions
- **ScrollArea already exists** (`src/ui/scroll-area.tsx` = `overflow-y-auto
  scrollbar-thin` + `--color-scrollbar-*` tokens). No new Radix-style scroll
  component needed (overkill). Reuse `.scrollbar-thin` for scroll regions.
- **kc-panels → kc-resizable:** decided to LEVEL UP the existing `Resizable`
  rather than build a new `kc-panels`.
- A **future split/preview layout** idea was folded into `<kc-resizable>`.

## 🎯 Examples to build — THE ORIGINAL GOAL (compose the components together)

This whole arc started because a developer looking at the kit **can't tell how to
use all these components together** — the examples only show the drop-in
`<kc-chat>` + conversation list, never how the *leaf* components compose into a
real chat, nor *when* to reach past the flagship. The composable showcase
(`examples/composable/index.html`) demos each element in isolation (a catalog
grid), and the Storybook `Examples/*` stories render the **Solid** layer, not the
web components. So the gap is real. Now **unblocked** (`<kc-resizable>` = layout
spine, `<kc-artifact>` = preview panel). Build, in priority order:

1. **Composed-chat example — Web Components (REQUIRED), as BOTH a Storybook story
   AND a runnable app.** Assemble a real shell from leaves: `<kc-resizable>`
   laying out `<kc-conversations>` │ a chat column (`<kc-message>` list +
   `<kc-prompt-input>` + `<kc-model-switcher>`/`<kc-context>`) │ `<kc-artifact>`,
   wired with sample data + events. Show it **next to** the `<kc-chat>` drop-in so
   the "compose-your-own vs batteries-included — when do I use which?" contrast is
   explicit.
2. **SolidJS version** (nice-to-have): same composition via Solid components + the
   `Resizable` convenience.
3. **Bring the examples INTO Storybook as a SET of stories — and show the code.**
   The key IA insight: devs learn *in* Storybook, so composition must live there,
   not only as external `examples/` apps (that felt like a disservice). Port the
   content currently only in `examples/` — the `composable/index.html` **catalog**
   (every web component) AND the scenario apps (full chat, streaming, reasoning,
   sources, etc.) — into Storybook stories built from the **`kc-*` web
   components**. Each story MUST expose its **source** (Storybook "Show code" /
   `docs.source`) so a developer can read the exact composition markup and learn
   how to wire it — *that's the whole point: see it working AND see the code.*
   (Today the `Examples/*` stories render the Solid layer, and the WC catalog is an
   orphan HTML file — both need to become source-visible WC stories.)
4. **"Choosing components" overview page** — one doc with the mental model:
   flagship (`<kc-chat>`/`<kc-workspace>`) for drop-in; **leaf features**
   (`<kc-tool>`, `<kc-message>`, …) for custom layouts; **primitives**
   (`<kc-code-block>`, `<kc-markdown>`, …) anywhere — instead of the per-element
   When/How/Placement scattered across all 28 element-story descriptions (those
   exist; there's just no single mental-model page).

**Gotcha:** the `examples/*` apps consume the **published** package (semver), so a
runnable app won't reflect the `kc-*` rename until a release ships and it
reinstalls; **Storybook stories use local source** and work immediately — so lead
with the Storybook story, treat the runnable app as post-release.

### Examples — FULL DETAIL (build these; no info loss)

**Exact tag roster:** read `src/elements/element-meta.json` (32 elements). Grouping
used below — flagship/shells: `kc-chat`, `kc-workspace`; layout: `kc-resizable`(+
`kc-resizable-item`); conversation/header: `kc-conversations`, `kc-scope-picker`,
`kc-model-switcher`, `kc-context`, `kc-checkpoint`, `kc-feedback-bar`; message
internals: `kc-message`, `kc-tool`, `kc-reasoning`, `kc-chain-of-thought`,
`kc-thinking-bar`, `kc-response-stream`, `kc-source`, `kc-sources`, `kc-skills`;
composer: `kc-prompt-input`, `kc-suggestions`, `kc-file-upload`, `kc-voice-input`,
`kc-attachments`; viewer: `kc-artifact`, `kc-file-tree`; primitives: `kc-code-block`,
`kc-markdown`, `kc-loader`, `kc-text-shimmer`, `kc-empty`, `kc-image`.

**Storybook IA:** a top-level **`Examples/` group of source-visible WEB-COMPONENT
stories**, separate from the per-element `Web Components/kc-*` stories and the
`Components/*` Solid stories. ⚠️ Today's `Examples/*` (full-chat, streaming-
response, conversation-with-reasoning, conversation-with-sources, message-actions,
prompt-input-variants, context-usage, checkpoint-restore) render the **SolidJS**
layer (`ChatScene` etc., `src/stories/*.stories.tsx`) — they must be **rebuilt as
WC stories** (or split into `Examples (Web Components)` vs `Examples (SolidJS)`).

**EVERY story MUST show its source.** Set `parameters.docs.source.code` to a
hand-authored, copy-pasteable HTML/JS snippet (the way `kc-resizable`'s
`Playground` story already does via `HTML_SNIPPET`). The Docs tab then shows the
*exact composition markup* next to the live render. **This is the whole point:
see it working AND read the code to learn how to wire it.** Non-negotiable.

**Stories to create:**

**A) Catalog — port `examples/composable/index.html` INTO Storybook.** One (or a
few grouped) story rendering EVERY web component by category (Batteries-included /
Messages / Composer / Header & meta / Attachments & media / Status & motion), each
with minimal sample data. Mirrors the existing external showcase but in Storybook
+ source-visible. Answers "what exists?" (Today that catalog is an orphan HTML
file no Storybook user sees.)

**B) Composed chat shell — THE headline ("Build your own chat").** A `<kc-resizable>`
with up to three panels, wired with sample data + events in the story script:
  - **start panel:** `<kc-conversations>` (optionally a header row with
    `<kc-scope-picker>` / `<kc-model-switcher>`). Handle `select`/`newchat`.
  - **main panel:** the chat column — a scroll region of `<kc-message>` (with
    `<kc-tool>`, `<kc-reasoning>`, `<kc-chain-of-thought>`, `<kc-sources>` rendered
    *inside* messages), a `<kc-context>` token meter, and a composer
    (`<kc-prompt-input>` + `<kc-suggestions>` + `<kc-file-upload>` +
    `<kc-voice-input>`). Handle `submit`, `messageaction`, `modelchange`, etc.
  - **end panel:** `<kc-artifact>` (preview/code), optional/toggleable via
    `<kc-resizable-item hidden>`.
  **Pair it with a `<kc-chat>` drop-in story** so the contrast is explicit and
  documented: *batteries-included vs compose-your-own — and WHEN to choose each.*
  This is the single most important deliverable — it's the answer to the question
  that started this whole arc.

**C) Scenario examples — port the current Solid `Examples/*` to WEB-COMPONENT
stories**, each focused + source-visible:
  - Full chat app (the shell, simplified).
  - Streaming response — `<kc-response-stream>` (+ `<kc-loader>`/`<kc-text-shimmer>`).
  - Conversation with reasoning — `<kc-reasoning>` / `<kc-chain-of-thought>` /
    `<kc-thinking-bar>`.
  - Conversation with sources/citations — `<kc-source>` / `<kc-sources>`.
  - Message actions — `<kc-message>` action events + `<kc-feedback-bar>`.
  - Prompt-input variants — `<kc-prompt-input>` states (loading, disabled,
    multi-action, slash commands).
  - Context & token usage — `<kc-context>`.
  - Checkpoint & restore — `<kc-checkpoint>`.

**D) "Choosing components" overview (MDX docs page).** The mental model in ONE
place: **flagship** (`<kc-chat>`/`<kc-workspace>`) = drop-in, the 90% path; **leaf
features** (`<kc-tool>`, `<kc-message>`, `<kc-conversations>`, …) = compose your
own layout when the flagship doesn't fit; **primitives** (`<kc-code-block>`,
`<kc-markdown>`, `<kc-loader>`, `<kc-image>`, …) = reusable anywhere, not chat-
specific. Decision test: *"would a non-chat app reuse this?"* → primitive. Link to
the catalog (A) and the composed shell (B). (Per-element When/How/Placement already
lives in each element story's `specDescription`; this page is the missing
*overview/decision guide*, not per-element prose.)

**E) Runnable example app (post-release).** Mirror (B) as a real `examples/` app —
**vanilla HTML recommended** (purest WC composition, framework-neutral). NOTE: the
`examples/*` apps depend on the **published** package (semver), so this won't
reflect the `kc-*` rename until a release ships and it reinstalls. Therefore
**lead with the Storybook story (local source, works now); treat the runnable app
as a post-release follow-up.**

**Acceptance (closes the original gap):** a developer arriving at the kit can
(1) browse the **catalog** to see what exists, (2) open the **composed-shell**
story to see a real chat built from leaves *with the source code shown*, (3) read
the **overview** to know which tier to reach for, and (4) clone the **runnable app**
to drop it into their stack. If all four exist and are source-visible, "how/when do
I use all these components together?" is fully answered.

## Norms (unchanged)
Gate = `npm run build` (idempotent) + `npm run typecheck` (3 tsconfigs) + `npm test`
(baseline = **3 pre-existing Shiki failures** in `tests/primitives/highlighter.
test.ts`) + `npm run test:react` (5/5) + a11y (0 violations light+dark). **VERIFY
VISUALLY/EMPIRICALLY with Playwright + measurements** — "it compiles"/static
screenshots missed real bugs repeatedly this session (the resizable fill saga:
agents + I both passed it while vertical-drag/3-panel-settle/content-fill were
broken; only adversarial measured tests caught them). New Storybook stories need a
full **restart** (not HMR); custom elements don't re-register on HMR. SolidJS:
never destructure props. Merge PRs via REST. Version bump per change via
release-please (`[[version-bump-each-change]]`).
