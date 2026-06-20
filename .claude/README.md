# `.claude/` — project-local Claude Code tooling

Skills and agents that live in this repo and **load automatically** when you open [Claude Code](https://code.claude.com/docs/en/skills) anywhere inside it — no install, no copying. They are **project-scoped** (committed here, not in your personal `~/.claude/`), so they apply only to this project. A first-time clone may need to accept the one-time workspace-trust prompt.

## Skills — `skills/`

| Skill | Invoke | What it does |
|---|---|---|
| **consumer-regression** | `/consumer-regression [smoke\|regression] [scope]` | Field-tests the published `@kitn.ai/ui` + `kai` MCP **consumer experience** — builds real chat apps across every framework (React/Next/Vue/Svelte/HTML/TanStack Start), archetype, integration, and backend, against a *local* build of the package, with parallel agents at mixed model tiers. `smoke` = one pass, report only; `regression` = the full build → triage → fix → re-verify loop. |

Source: [`skills/consumer-regression/SKILL.md`](skills/consumer-regression/SKILL.md) (methodology, modes, phases, model strategy, gotchas) + [`recipes.md`](skills/consumer-regression/recipes.md) (exact commands, the test matrix, mock-backend recipes, the SSR check, the Playwright pattern).

This is **distinct from `npm test`** (the kit's ~1190-test internal suite). The regression tests what a *consumer of the published package* hits — packaging, exports, SSR, scaffold output — which unit tests don't catch.

## Agents — `agents/`

Reusable subagent types the `consumer-regression` skill deploys (you don't normally invoke them directly):

| Agent | Role |
|---|---|
| **consumer-probe** | Builds + runs ONE framework's consumer app against the local tarball + a scaffold; reports every issue by **layer** (library / scaffold-output / framework-setup / consumer). **Strictly read-only on the repo** (it must never edit or repack the library). |
| **regression-triage** | Reads a round's `consumer-probe` reports and produces one deduped, root-caused master fix list + the critical path. Run on a high-end model. |

## Prerequisites to actually *run* a regression

The skill is instructions; executing it needs a normal dev environment: **node + npm + network** (it scaffolds + installs real throwaway apps and integration SDKs), **python3 + pip** for the Pydantic/FastAPI path, and the repo's `node_modules` (run `npm install` once — that's where the reused Playwright browser comes from). Phase 0 builds the MCP bin (`npm run build`). You do **not** need to register the `kai` MCP server — the skill drives `bin/mcp.js` directly.
