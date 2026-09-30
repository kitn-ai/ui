# Handoff: composition round, supervisor state (2026-09-30)

For the next supervisor session. Read this, then the umbrella spec, then act. Do not re-derive decisions recorded here.

## What this round is

The owner (Rob) paused the "blocks" work (tag `backup/blocks-exemplar-2026-09-29`, branch `feat/blocks-exemplar-and-wiring`) and re-scoped the kit to **composition over configuration**: shadcn-style parts the developer composes, presets built only on public parts, patterns (small copyable HTML+JS) instead of blocks. Web components first; generated React wrappers stay.

- Base PR: **#420** `feat/kit-components` (the kit half of the old branch, verbatim + 4 bug fixes + stop-icon story + dropdown max-height). Not merged; owner reviews at the end.
- Integration branch: **`feat/composition`** (worktree `.claude/worktrees/composition`), stacked on #420. Every task is its own branch `feat/comp-<id>` + worktree `.claude/worktrees/comp-<id>`, merged into `feat/composition` by the supervisor after independent verification.
- Specs/plans: `docs/superpowers/specs/2026-09-29-*` (umbrella `...-composition-round-design.md`, A–E) and `2026-09-30-P-prompt-attachments-design.md`; plans in `docs/superpowers/plans/2026-09-29-*` and `2026-09-30-P-*`. The umbrella's decisions table (rulings 1–23) is authoritative.

## Owner rulings you must not re-litigate

- Break now (no deprecations). Keep presets, rebuilt on public parts. React wrappers stay. Patterns = docs + `kai add` (`npx -y @kitn.ai/cli add <id>`), plain ESM JS.
- **Checkpoint round 2 (final):** prompt attachments = **B "grows into the input"** (kai-prompt-dock retired; `kai-prompt-input` `above`/`below` regions). Answer receipt = **(a) user bubble**. Question panel v2, **composer variant A**: the panel REPLACES the composer; "Let's chat" (outline, `dismissLabel` + `dismiss` slot) hands it back; "Other" is the last numbered option with an auto-growing textarea; segmented tabs; Back beside Next (hidden on step 1). Supervisor defaults the owner can reverse: single approve/deny = one click; Esc dismisses like "Let's chat"; durations "100ms"; code blocks follow the page scheme with `github-light-default` / `github-dark-default` (owner has NOT seen this look change; call it out in the final review).
- `kai-tool` element kept standalone (unused in threads now) — ask owner at final review whether to delete.
- **C-live**: a by-hand local test (`npm run live:ask-loop`) against OpenRouter `deepseek/deepseek-v4.1-flash` and `xiaomi/mimo-v2.6-flash`; also captures real streams as offline fixtures. **NEVER in GitHub CI** (add a guard test that fails if any workflow references it or the key). Key: `OPENROUTER_API_KEY` from `examples/apps/builder/.env` (gitignored, never committed) — inject into the single command's env only; never print/copy/commit it or reference the path in repo code.

## Merged on feat/composition (all independently verified)

A0–A7 (ChatApp rename, tag registry, preset-parts lint, root theme via light-dark + `--kai-color-scheme`, dock animation, pattern tier, composition guide + MCP hint) · D1–D3 (nested rail rows, rail + command-trigger patterns, docs) · E1–E5 (status tones/outline badge, agent-card pattern + kai-agent-card deleted, artifact toolbar slots + urlSafe + exposeState, artifact-toolbar pattern, ViewStack docs) · kit fixes K1 (pnpm patch of component-register: pre-upgrade props survive), K2 (kai-row `active`), K3 (forwarded aria names, xs sizes, reflected booleans), K4 (kai-action labels, text-node message body, scheme-following code theme), DA/DA2 (dark axe CI leg required, muted-fg 57%, hover-contrast own CI job with derived coverage), G1 (llms-full Shared types, ceiling 331 KiB) · B1 (timing, kai_plan, activity data), B2 (kai-activity), B3 (activity line replaces bold tool panel; `renderers`), B4 (composed thread/message), C1 (kai_ask data; answers = one tool result), C2 (question panel v2), P1 (prompt-input above/below + MeasuredPresence). Integration run #6 green at 363ee4f6 (then B3, K4, G1 merged after; tip cdc75dbe at writing).

## In flight when this was written (check their branches)

- **B5 MERGED** (fba517b9 + regen 9e82a9ea): kai-plan inside the prompt input; verified. It also fixed K5(a) code-block bare cancelAnimationFrame and K5(b) cn-merge touch-* (merger now resolves right-to-left like tailwind-merge). llms-full 332,657 B vs 331 KiB ceiling (6.1 KiB headroom).
- **T1** `feat/comp-t1` — root-cause the flaky `upgrade-props` "kai-menu disconnected" test and `promptinput` cold-start flakes (10-run proof).
- **P2** `feat/comp-p2` — DONE by worker (1dc78797: kai-prompt-dock/PromptDock deleted, labs + guides migrated to kai-prompt-input above/below), **NOT yet independently verified or merged**. Next session: dispatch an ivp-verifier (screenshots `/private/tmp/claude-501/comp-p2/{claude-code,codex}-{before,after}.png`, MCP no longer lists it, grep clean), then merge and regenerate artifacts with `build:api` (conflicts with kai-plan registrations/generated files expected; resolve by regenerating). Note: after deleting a component, run `build:api` BEFORE `nx build ui` or `verify:react-wrappers` fails on the stale wrapper.

## Next, in order (task graph from the amended plans)

1. **K5 small fix** — (a) and (b) DONE in B5. Remaining: (c) only. Historical notes: (a) `teardown-without-dom-globals` flags bare `cancelAnimationFrame` at `components/code-block/code-block.tsx:119` (from K4) — use the guarded bound capture like `create-tween`/`MeasuredPresence`; (b) `cn-merge.drift` random tuples: `touch-pan-x … touch-none` — cn-merge drops `pan-x`, tailwind-merge keeps it; fix the cn-merge table; (c) make `gen-llms.mjs` refuse to run standalone (it still writes a thinner file standalone — pre-existing CLAUDE.md pitfall).
2. **C3** — the answer receipt as a user bubble via `threadRows` (C1) in message/thread/chat-app. Serialize `chat-app.tsx` after B5.
3. **C4** — kai-chat wiring: panel replaces the composer when `pendingQuestions`, "Let's chat" → `settlePendingQuestions` + composer back + `kai-questions-waiting` "Reopen"; plan collapses while the panel is open; handle the `slot="composer"` custom-composer case (B5 gap: no plan there) — B5 verifier recommends a `kai-chat` `plan` slot (preferred) or read-only `el.plan` + `kai-plan-change`; docs must say a custom composer opts out of the automatic plan. No aria-live on the plan summary (noisy while streaming).
4. **C5a/b/c** — remove confirm/choice/tasks/form CARD types across kit, schemas, scripts, MCP, docs, examples, spikes (~132 files; `kai-form` element stays). Parallel after C4.
5. **C6 / B6** — scaffolder emitted `renderPart` + Solid starter + docs composition-first; export `groupMessageParts` (B3 left it unexported; B6 needs it).
6. **C-live** (rules above).
7. **Final integration run** with the DERIVED gate list (every `lint:*`/`verify:*` in packages/ui/package.json + every script test.yml invokes, storybook light+dark, hover-contrast, browser-suites, and `test:e2e` — owner OK'd stopping 6007; it is already stopped).
8. Push; open the composition PR (base `feat/kit-components` or main after #420 — ask owner); final review packet for the owner: every ruling applied, look changes (code theme!), removed APIs, open questions (kai-tool delete?).

Backlog noted (not scheduled): kai-conversations `renderers`-style hooks for questions need a "custom element returns its answer" design; plan summary aria-live decision (B5 verifier recommending); outline button variant has no border kit-wide (panel uses a local bordered style).

## Operating rules (earned this round — follow them)

- Supervisor only: every file-touching task goes to a Sonnet task-worker; every result gets an independent `ivp-verifier` with its own adversarial probe BEFORE merge. Worker "done" is not done.
- **Max 3 concurrent agents** (verifiers count). 9 at once pinned the Mac (load 167) and faked test failures.
- Each agent: its own worktree + branch off the current feat/composition; scratch in `/private/tmp/claude-501/<name>/`; `pnpm install` → build:css → `nx build ui --skip-nx-cache` first; gates sequentially; rerun timed-out files alone before calling them failures.
- **Ports**: Playwright suites hard-code 6006 and collide across agents → always tell agents to use their own `KAI_SB_PORT` and private Storybook ports. **Never touch 6008** (owner's checkpoint mockups, served from `.claude/worktrees/comp-c0`). 6007 may be used.
- Only the supervisor merges into feat/composition, and never while another agent is working in that worktree. Generated-artifact conflicts: take either side, then regenerate via `npm run build:api` in an integration run (never hand-merge, never run gen-llms standalone).
- Integration runs must DERIVE the gate list; a hand-picked list missed 5 CI reds.
- Workers that finish but keep a background watcher show as "running" forever — TaskStop them once their result is in.
- Say "prove it can fail" in every verifier brief; several checks this round passed vacuously until mutated.

## State of servers

6008: checkpoint Storybook (comp-c0) — leave running for the owner. 6006, 6007: free.
