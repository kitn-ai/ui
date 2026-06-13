# Design — Accessibility (508/WCAG 2.1 AA) + Storybook/docs + React wrappers (2026-06-12)

Branch: `spike/composable-web-components`. Three sub-projects, sequenced. Conformance bar: **WCAG 2.1 AA**. Scope: shipped kit components to AA **and** the showcase keyboard-navigable (showcase decorative-chrome contrast is lower priority/noted).

Verification tooling: `scripts/audit-a11y.mjs` (axe-core in a real browser, traverses shadow roots; light + proper dark via `theme="dark"` + `emulateMedia`) + a keyboard tab-order trace. Re-run after each remediation step; target **0 kit violations**.

---

## Sub-project A — Accessibility / 508 (WCAG 2.1 AA)

### Audit findings (axe + keyboard, light & proper dark)

**Kit violations to fix:**
1. **button-name (critical, 6):** icon-only buttons with no accessible name —
   - conversation-list: sidebar toggle (☰), new-chat (＋)
   - chat: send button (`[data-testid=send]`), scroll-to-bottom (`.w-10`)
   - prompt-input: send button
   - voice-input: record button
2. **color-contrast (serious):** text below 4.5:1 —
   - `text-muted-foreground/60` (conversation subtitles, search placeholder, slash-command desc, chat-scope-picker, thinking-bar) — both light & dark
   - tool/message tag text (`.px-2.py-1.text-xs` muted) — light
   - source meta (`tabular-nums` muted) — light
   - message-skills badges (`text-[10px] bg-violet-400/10`) — light
3. **Focus visibility:** the conversation-list **search `<input>` uses `focus:outline-none` with no replacement** → invisible focus. `Button` has `focus-visible:ring-1 ring-ring` (present but subtle). Custom interactive elements (dropdown items) rely on `:focus` bg.
4. **Accessible names on inputs:** the prompt `<textarea>` has no `aria-label` (placeholder only).
5. **scrollable-region-focusable:** `#log-body` (showcase console) — chrome.

**Keyboard tab order:** generally complete — all the controls the user flagged (conversation-list ☰/＋, model-switcher dropdown) ARE in the tab order and dropdowns open via keyboard (fixed earlier). The felt "can't tab" is the **missing names + subtle/absent focus rings**, addressed below.

### Remediation (the contract)

**A1 — Accessible names** (add `aria-label` to every icon-only control; never rely on icon alone):
- `conversation-list.tsx`: toggle → `aria-label="Toggle sidebar"`; new-chat → `aria-label="New chat"`. Search input → `aria-label="Search chats"`.
- `default-input.tsx`: send button → `aria-label="Send message"`; the textarea → `aria-label={placeholder || 'Message'}`. (covers chat + prompt-input)
- `voice-input.tsx`: record button → dynamic `aria-label` ("Voice input" / "Stop recording" / "Transcribing…") matching its tooltip.
- scroll-to-bottom button (`scroll-button.tsx` / wherever `.w-10`): `aria-label="Scroll to bottom"`.
- Sweep all components for other icon-only buttons (file-upload, feedback-bar, attachments remove already says "Remove", checkpoint, etc.) and add labels where missing.

**A2 — Color contrast ≥ 4.5:1** (verify each in light AND dark with the audit):
- Replace `text-muted-foreground/60` with a token/utility meeting AA. Prefer dropping the `/60` opacity (use `text-muted-foreground`) OR introduce a dedicated `--color-muted-foreground` value that passes AA on its surfaces. Check the token's contrast on `--color-background`, `--color-card`, `--color-sidebar`, `--color-muted` in both modes; bump `--color-muted-foreground` lightness if needed (theme.css, both `:root` and `.dark`).
- Tool/message tag chips (`.text-xs` muted on muted bg): ensure ≥4.5:1 (darken text or lighten/adjust chip).
- Source meta `tabular-nums`: ensure ≥4.5:1.
- message-skills badge (`text-[10px]` on `bg-violet-400/10`): bump text color (e.g. a darker violet that passes on the faint bg) — verify.
- Do NOT regress the self-themed look; keep changes token-driven where possible so both modes stay correct.

**A3 — Focus visibility** (clear, consistent focus for keyboard users — the user is an advanced keyboard user):
- Fix the search input: remove bare `focus:outline-none`; add a visible `focus-visible` ring (match the kit's ring style).
- Standardize a clearly-visible focus-visible treatment across interactive controls. Strengthen `Button`'s `focus-visible:ring-1` → `ring-2` with `ring-offset` (or equivalent) so it's obvious; apply the same idiom to the conversation item buttons, dropdown trigger, suggestion chips, source links, and any custom `role` controls. Ensure dropdown `role="menuitem"` items show a clear focus style (they already get `focus:bg-muted`; confirm visible).
- Verify focus is never removed without a replacement anywhere (`grep "outline-none"`/`ring-0`).

**A4 — Roles/semantics & misc:**
- Ensure dropdowns keyboard-operable (done) and `aria-haspopup`/`expanded`/`controls` correct (done).
- Any kit scroll region that scrolls (message list) must be keyboard-focusable (`tabindex="0"` + `aria-label`) or contain focusable children — verify; fix if axe flags a kit one.
- Prompt textarea: associate label via `aria-label`.

**A5 — Showcase keyboard/focus (scope: keyboard nav, not decorative contrast):**
- `examples/composable`: `#log-body` event console → `tabindex="0"` + `aria-label="Event log"` (scrollable-region fix). Ensure the console toggle, theme toggle, and sidebar nav are keyboard-operable with visible focus. The 64 chrome color-contrast nodes (sidebar nav small text) are **noted, lower priority**; bump the worst if cheap.

### A — Verification
`node scripts/audit-a11y.mjs` → **0 kit violations** (button-name, color-contrast, scrollable-region) in light AND dark. Keyboard trace: every interactive control reachable with a visible focus indicator; dropdowns open/navigate via keyboard; conversation-list ☰/＋/items/search all tabbable + named. Add component unit tests asserting `aria-label` presence on the icon buttons. Full gate green vs the 3 Shiki baseline failures.

---

## Sub-project B — Storybook stories + docs + bundle figure

### Findings
- Element-level stories exist for only **3 of 28** (`kitn-chat`, `kitn-conversation-list`, `kitn-prompt-input`). ~25 elements need stories.
- Rich SolidJS-component stories + docs MDX already exist (`src/stories/docs/{Introduction,GettingStarted,Installation,Integrations,Theming}.mdx`).
- Stale bundle figure: `examples/composable/index.html:50` says `~101kb gzip` → now **~80 KB** (kitn-chat.es.js 79.61 KB gzip). Also `docs/composable-web-components-roster.md` and the handoff TL;DR reference ~100 KB.

### Work
**B1 — Element stories:** add one interactive story file per missing element under `src/elements/*.stories.tsx` (or a grouped `Elements/*` hierarchy), each rendering the real `<kitn-*>` custom element with representative props (arrays/objects set as properties), `argTypes` controls where sensible, and an autodocs page. Cover all ~25: message, markdown, code-block, reasoning, tool, model-switcher, context-meter, chat-scope-picker, feedback-bar, prompt-suggestions, file-upload, voice-input, loader, text-shimmer, image, checkpoint, message-skills, source, source-list, response-stream, empty, chain-of-thought, thinking-bar, attachments. Follow the existing element-story pattern (`src/elements/kitn-chat.stories.tsx`).
**B2 — Docs MDX:** update `Integrations.mdx` (or add a "Frameworks" page) with HTML / React (`@kitnai/chat/react`) / Vue usage; add an **Accessibility.mdx** documenting the 508/WCAG 2.1 AA posture, keyboard support, and `theme` attr. Update `Theming.mdx` if needed (it already reflects `--kitn-*`).
**B3 — `docs/web-components.md`:** extend the full element reference to all 28 (can auto-generate the per-element table from `dist/custom-elements.json`).
**B4 — Bundle figure:** update `examples/composable/index.html` `~101kb` → the measured value (~80 KB gzip); fix the handoff TL;DR line and the roster projection note.

### B — Verification
`npm run build-storybook` succeeds; stories render (Storybook is browser-mode vitest — `npm test` includes the storybook project); spot-check a few via the running Storybook. Docs build. Bundle figure matches `gzip -c dist/kitn-chat.es.js | wc -c`.

---

## Sub-project C — React wrappers behave like native components

### Goal
`@kitnai/chat/react` wrappers must feel native: `<KitnChat messages={[...]} onSubmit={...} />` — array/object props passed through as DOM **properties** (not stringified), boolean props correct, `on<Event>` handlers wired to the elements' CustomEvents, refs forwarded. There's an existing `examples/react/` (App.tsx + main.tsx) and generated `frameworks/react/index.tsx` + `runtime.tsx`.

### Work
**C1 — Verify the runtime:** confirm `frameworks/react/runtime.tsx` sets rich props via the element **property** (ref-based, objects/arrays unstringified) and adds/removes event listeners for each `on<Event>`; booleans reflect correctly; children/slots pass through. Fix any gaps so it's a true wrapper.
**C2 — Harden `examples/react`:** make the demo exercise real array/object props (e.g. `<KitnChat messages={[…]} models={[…]} />`, `<KitnConversationList conversations={[…]} />`) and event handlers (`onSubmit`, `onModelchange`, `onSelect`), proving arrays/objects and events round-trip. Ensure it builds and runs (`vite`).
**C3 — React tests:** add `@testing-library/react` tests (new vitest project or jsdom file) asserting: an array/object prop reaches the element as a live property (not a string); an `on<Event>` handler fires on the element's CustomEvent; a boolean prop toggles a feature. Wire into `npm test` (or a `test:react` script) without breaking the Solid/Storybook projects.

### C — Verification
`examples/react` builds (`vite build`) and runs; React tests pass; manual/headless check that a passed array renders (e.g. conversation list shows items) and an event handler logs. Document the React usage in B2.

---

## Sequencing & overall verification
1. **A (accessibility)** — highest value; remediate + re-audit to 0 kit violations.
2. **B (stories/docs/bundle figure)** — documents the (now-accessible) elements.
3. **C (React)** — wrappers + example + tests.
4. **Final:** full gate (`build` + `typecheck` + `test`) green vs 3 Shiki baseline; `scripts/audit-a11y.mjs` 0 kit violations light+dark; keyboard trace clean; Storybook builds; React example builds + React tests pass; `npm pack` consumer smoke. Then open a PR and (per user) **regular merge** to main — surface to the user before merging.

Each sub-project: implemented via fresh subagents (partitioned to avoid parallel-edit conflicts — a11y concerns touch many shared files, so sequence A1→A2→A3→A5; stories can batch) with the two-stage (spec + code-quality) independent review, then the verification above. Commit per logical step.
