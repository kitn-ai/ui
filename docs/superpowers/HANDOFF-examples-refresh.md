# HANDOFF — examples refresh (React reference done, rollout pending)

**Session end: 2026-07-01.** Full detail + gotchas live in the auto-memory `examples-refresh` (read it first). This is the short version.

## Where we are
Brainstormed the `examples/` refresh with Rob into **two phases**:
- **Phase 1 (in progress): refresh the examples into per-framework STARTERS** that double as templates.
- **Phase 2 (deferred, own spec): a `create-kitn` `npx` CLI** that scaffolds the Phase-1 templates.

**The example = a mini-WORKSPACE COMPOSED BY HAND (Option B):** `<Conversations>` sidebar + a `<Message>` thread mapped from state + `<PromptInput>`, wired by hand (NOT the all-in-one `<kai-chat>`/`<kai-workspace>` tag — Rob: composition teaches, one tag doesn't). `useKaiChat` owns messages/streaming. Voice IS included.

## ★The React reference is BUILT, polished, verified — but UNCOMMITTED on `main`
`examples/react/` (`App.tsx`, `chat-data.ts`, `index.css`, `main.tsx`, package.json `workspace:*`; `App.css`/`global.d.ts` deleted; added to `pnpm-workspace.yaml`) + the kit `packages/ui/src/ui/action-icons.ts` (added `Volume2` speaker icon, default stroke). Feature-complete: composition, streaming, conversation switch/new, light/dark ghost-Button toggle (moon/sun) + `panel-left` reopen button (only when collapsed), resizable sidebar (220–420), clean collapse (`visibility:hidden` keeping grid tracks), centered 48rem column, copy+speaker message actions (speak→`speechSynthesis`), `/` skills + `@` agents triggers, voice mic, `/@` hint line.

## Do FIRST on resume
1. **`git status` — the whole example refresh + `action-icons.ts` are dirty on `main`. Checkpoint them to a WIP branch** (safe revert point) — Rob hadn't approved a commit at session end, so confirm first. (Stray untracked `_shot.mjs` at repo root is NOT ours — leave it. Rob's notes commit `2584d49` is unpushed — leave it.) If `nx build ui` churns `packages/ui/src/components/component-meta.json`, `git checkout --` it.
2. Rob to bless the React reference (or request more polish).
3. `superpowers:writing-plans` → the rollout **spec** from this validated pattern.
4. Replicate to **Vue / Angular / Solid / vanilla / Next / TanStack** (same composed workspace, each its own integration idiom); wire `examples/*` into `pnpm-workspace.yaml`; add a CI build check.
5. Phase 2: the `create-kitn` CLI.

## Gotchas that WILL recur (full list in memory)
- Message `actions` go on the message OBJECT (`message.actions`), not a `<Message actions=…>` prop.
- Controlling `PromptInput` `value` BREAKS `/`+`@` triggers (collapses the shadow caret) → keep it uncontrolled; push voice transcript imperatively via a ref.
- `<Conversations>` needs `groups={[]}` alongside `conversations`.
- Theming: each element takes `theme`; shell uses `--color-*` under `.dark` (import `theme.tokens.css`, not `theme.css`); borders put ON element hosts DON'T theme → use plain wrapper divs; kit `<Button>`s need `theme={theme}` or they follow OS.
- Playwright: `getByRole('textbox').first()` = the sidebar SEARCH; target the prompt input specifically.

## Workflow Rob wants
DELEGATE all file edits to agents + have them self-verify (build + Playwright screenshots); don't run/screenshot inline; stay free for his rapid-fire tasks. Serialize edits to the same file (one agent; bundle follow-ups into the in-flight agent). Relay screenshots via SendUserFile + `open` in Preview.
