<!-- Lane report, kept as evidence. Written by a delegated agent during the 2026-09-19
     session and copied here FROM /tmp so it survives a session/reset; it is a snapshot of
     what was measured and read at commit c2e684d6 plus that session's in-flight edits, so
     LINE NUMBERS MAY HAVE SHIFTED. Paths and quoted code have not. The decisions taken from
     it are in 2026-09-19-session-close.md and 2026-09-19-layering-security-and-shaking.md. -->

# Lane: layer-direction guard

## Files

- added `packages/ui/scripts/lint-layer-direction.mjs` (guard + `--self-test` + `--repo-root`)
- added `packages/ui/tests/scripts/layer-direction-guard-wiring.test.ts` (9 tests)
- changed `packages/ui/package.json` (+1 line: `lint:layer-direction`)
- changed `.github/workflows/test.yml` (+7 lines: comment + step in the required `test` job)

No `src/` file touched, nothing staged.

## What the guard enforces

Tier order, bottom to top, as CORRECTED on the supervisor's reply (`state` BELOW `stores`,
because a store is a reactive wrapper over the pure folds and nothing in `state/` imports
`stores/`):

    src/utils, src/primitives, src/schemas, src/state, src/stores, src/wire,
    src/diagnostics, src/components, src/web-components, frameworks, mcp

A VALUE import to a higher rank is a finding; same rank and downward are fine; type-only is
always allowed (all three spellings); bare side-effect imports are values; `export ... from`
counts as a value edge (barrels cycle too). Specifiers are RESOLVED (extension candidates,
`index.ts`, and `.js`/`.mjs` -> `.ts`/`.tsx`), never prefix-matched. Waivers need a reason
(`lint-layer-direction: allowed -- <reason>` per line, `file-waived -- <reason>` per file).
Two declared exceptions in `ALLOWED_EDGES`, keyed `(file, resolved target module)`, both hit;
an entry whose file is in the tree but whose edge no longer fires fails the run.

## The two bugs this found

1. `src/primitives/create-kai-chat.ts:5` -> `../state/index`, an upward VALUE import not in
   the task's exception list (7 of 11 specifiers are values). Escalated; the supervisor had a
   sibling lane move the file to `src/stores/` (it is a Solid store: `createKaiChat`,
   `KaiChatStore`, and `stores/` already held `conversation-controller.ts`).
2. The tier order in the task placed `stores` below `state`. Under that order the move would
   have relabelled the finding (`stores -> state`) instead of clearing it. Corrected to
   `state` below `stores`, with the reason in the guard's header and two self-test cases that
   go red if the order is swapped back (proved, below).

## Measured before writing (probe, not the guard)

- walk: 1298 source files / 1217 relative specifiers (prototype, wider skip set); the guard now
  prints 1168 files / 1225 relative specifiers.
- ranked files per layer: utils 4, primitives 62, schemas 11, stores 4, state 18, wire 44,
  diagnostics 8, components 308, web-components 165, frameworks 4, mcp 79 -> 707.
- upward VALUE edges before the fix: 3 (two `mcp/construct` + `create-kai-chat`); all 38 other
  upward edges are type-only.
- unlayered targets reached from layers (blind spot, stated in the header): `src/types.ts` 16,
  `src/remote/host-embed.ts` 2, `src/themes/theme-tokens.ts` 1.

## Mutation proofs (each: break, show red, restore, show green)

All reds below are from the FINAL files.

1. Removed `if (hit.typeOnly) continue;`
   - `--self-test` exit 1: `FAIL lint-layer-direction self-test: 11/24 case(s) failed.`
   - real run exit 1: `FAIL lint-layer-direction: 37 upward value import(s) across the source layers.`
     first line: `packages/ui/src/components/action-icons/action-icons.ts:6  [value]  components -> web-components  '../../web-components/chat/chat-types'`
2. Made `resolveSpecifier` return null (resolution disabled)
   - `--self-test` exit 1: `FAIL lint-layer-direction self-test: 10/24 case(s) failed.`
   - real run exit 1 (NOT a clean line, the stale-exception check catches it):
     `FAIL ALLOWED_EDGES names an edge in packages/ui/src/primitives/construct-form-paths.ts that no longer fires: ...`
3. Dropped the `.js`/`.mjs` -> `.ts`/`.tsx` branch
   - `FAIL the .js -> .ts NodeNext specifier resolves, and fires (expected "utils/nodenext.ts:1" + "utils -> components", got clean)`
   - `FAIL lint-layer-direction self-test: 1/20 case(s) failed.` (20 cases at the time)
4. Swapped `state`/`stores` back to the original order
   - `FAIL stores -> state is DOWNWARD: a store is a wrapper over the pure folds (expected clean, got 1 finding(s))`
   - `FAIL state -> stores is UPWARD, so the corrected tier order cannot be quietly reversed (expected "state/reads-a-store.ts:1" + "state -> stores", got clean)`
   - `FAIL lint-layer-direction self-test: 2/24 case(s) failed.`
5. Set `MIN_FILES = 0`
   - `FAIL VACUITY: a tree too small to have scanned anything (expected "has stopped scanning", got clean)`
6. Dropped the mandatory reason from `LINE_WAIVER_RE`
   - `FAIL a marker with NO reason waives nothing (expected "utils/no-reason-line.ts:1" + "utils/no-reason-file.ts:2", got 1 finding(s))`
7. `lint:layer-direction` without `--self-test` in package.json
   - `AssertionError: \`lint:layer-direction\` no longer runs \`--self-test\`. ...: expected 'node scripts/lint-layer-direction.mjs' to contain '--self-test'` (1 failed | 8 passed)
8. Deleted the CI step from the required `test` job
   - `AssertionError: the \`test\` job does not run \`lint:layer-direction\`, the only check that a Solid component cannot import the kai-* facade layer back and close a cycle.` (1 failed | 8 passed)

## Final green

```
ok   lint-layer-direction self-test: 24/24 cases behave as specified.
ok   lint-layer-direction: 1168 source file(s), 1225 relative specifier(s); no upward value import across 11 layers (2 declared exception(s) in ALLOWED_EDGES).
```
`npm run lint:layer-direction` exit 0. Wiring test 9/9. `tsc --noEmit -p tsconfig.tests.json` exit 0.
`npm run lint:gate-parity` still exit 0 (59 gates, 73 run steps). `vitest run --project=unit tests/scripts/`
= 38 files / 519 tests passed.

## Deliberately left out, and why

- Bare/aliased specifiers (`@kitn.ai/ui/...`) are not resolved: there is no source file to rank
  them against, and no file inside a ranked layer writes one today (the only writers are `mcp/`,
  the top rank, and stories/comments).
- Dynamic `import()`: not a load-order edge, and no upward relative one exists in a ranked file.
- Files outside a listed layer (`src/index.ts`, `src/solid.ts`, `src/types.ts`, `src/remote/`,
  `src/themes/`, `apps/`, `tests/`, `scripts/`) have no rank, so they are neither importers nor
  targets. Both limits are stated in the guard's header rather than left implied.
- Specifiers inside string literals (the scaffolder's emitted-code templates in `mcp/`) are read
  as specifiers by the text scan. Harmless today because a match must RESOLVE into a ranked file,
  and `mcp/` is the top rank. Stated here, not hidden.
