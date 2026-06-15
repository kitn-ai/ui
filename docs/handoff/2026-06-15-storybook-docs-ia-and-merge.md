# Handoff — Storybook docs IA + sidebar renames + frameworks on-ramps (2026-06-15)

**Session summary.** Shipped a large Storybook documentation/IA overhaul as **PR #72**
(`feat/storybook-docs-ia`, ~32 commits), **merged to `main`** (merge commit `32bf3c1`). It rides out
in release **0.12.0** (release-please PR #67 — see "Release status" below). npm was at **0.11.0**
before this.

This doc is the resume point. The durable, auto-loaded state also lives in the agent memory
(`kitn-chat-state` / `ivp-playwright-verification` / `review-before-commit` / `version-bump-each-change`
/ `gh-cli-projects-classic-bug`).

---

## What shipped in PR #72

Built across two written plans (subagent-driven TDD + per-task spec/quality reviews + multiple
Playwright IVPs + a final holistic review):
- Spec: `docs/superpowers/specs/2026-06-14-storybook-docs-ia-framework-tabs-design.md`
- Plans: `docs/superpowers/plans/2026-06-14-storybook-friendly-naming-framework-tabs.md`,
  `…/2026-06-14-storybook-solid-ia-regroup.md`, `…/2026-06-15-storybook-rename-and-docs-reorg.md`

1. **`displayName` keystone.** Generated per element (`KcArtifactElement → Artifact`) via
   `displayNameFromClass` in `scripts/_ts-helpers.mjs`, emitted into `src/elements/element-meta.json`.
   Single source for wrapper names / story titles / API-tab lookup.
2. **BREAKING — React wrappers renamed `Kc<Name>` → bare `<Name>`** (`@kitn.ai/chat/react`:
   `KcArtifact → Artifact`). `feat!`, minor bump pre-1.0. `kc-image → Image` shadows the browser
   global — **decision: keep + alias** (`import { Image as KcImage }`), NOT renamed.
3. **Per-element framework code-tabs** on the API tab — **HTML · React · Svelte · Vue · Angular ·
   Solid** — generated into `src/elements/framework-usage.json` by `scripts/gen-framework-usage.mjs`,
   rendered by a React `FrameworkTabs` block in `.storybook/api-tab.tsx`. HTML tab is **CDN-based**
   (jsDelivr `dist/kitn-chat.es.js`); Solid tab only where a same-named Solid twin exists; multi-line
   snippets.
4. **Sidebar renames:** `Web Components → Components`; `SolidJS (advanced) → Solid (Advanced)` with
   its `Components` sub-group → **Elements** (Primitives kept). Story titles + generated composed-from
   ids (`solid-advanced-{elements,primitives}-…--docs`) + api-tab `WC_PREFIX='Components/'`/matcher +
   `preview.ts` storySort all moved in lockstep. **Solid (Advanced) is always present but collapsed**
   below Components (Rob rejected an earlier hide+toggle approach — wants visible-but-collapsed).
5. **Frameworks docs reorg:** the 512-line `Integrations.mdx` split into
   `Docs/Frameworks/{Overview,HTML,React,Solid,Vue,Svelte,Angular}` + `Docs/Recipes/{Streaming,
   Text-to-Speech,Speech-to-Text}`. Each framework page is a **self-contained on-ramp**: install →
   setup → quick start → **compose the pieces** (flex sizing + the `Resizable` element) → props/events,
   led by the **"two ways to build"** framing (all-in-one `<kc-chat>` vs compose individual elements).
   New **Solid** page (native components path + web-component option). Theming consolidated into a
   top-level `Theming/` section (Overview-led). Installation reordered **web-components-first** (+ the
   consumer-facing `npm run build` bug dropped). Getting Started tightened to funnel into the framework
   pages.
6. **Accuracy:** element count → generic **"40+ elements"**; bundle/llms sizes refreshed (core
   `dist/kitn-chat.es.js` ≈ **110 KB gzip / 413 KB raw**; `llms-full.txt` ≈ 54 KB); Svelte/Vue code
   fences → ```` ```html ```` (Storybook's docs highlighter doesn't color `svelte`/`vue`).
7. **Tab visibility:** Canvas + API tabs show **only on component stories**; pure doc/MDX pages are
   Docs-only. (SB10 ignores a `types.TAB` `match`, so `.storybook/manager.ts` reactively toggles
   `previewTabs['kitn-api-tab'].hidden` by `storyId`.)
8. **Example-app fixes:** `examples/react` `<Conversations onConversationselect>` (was a no-op
   `onSelect`); `examples/vue` `isCustomElement((t) => t.startsWith('kc-'))` (was `kitn-`); swept stale
   `kitn-*` element refs in example comments/READMEs → `kc-*`.

### CI fixes (repo-wide, also unblock `main`)
The `test` GitHub Actions check was **pre-broken on main** (and is fixed by this PR):
- `.github/workflows/test.yml` — install Playwright chromium **before** the test steps (`npm test`
  runs the Storybook *browser* project; it was installed too late).
- `vitest.config.ts` — chromium `launchOptions: { args: ['--disable-dev-shm-usage', '--no-sandbox'] }`
  so the browser stops crashing mid-suite (`Browser connection was closed`) from `/dev/shm` exhaustion
  on CI runners.
- Note: release-please PR's own `test` check is **`action_required`** (gated for the bot PR) — that's
  normal here; releases merge despite it. The real signal is `main`'s `test` check.

---

## Rob's scope guidance (2026-06-15)
- **Focus: Examples, Patterns, Components (the web components).**
- **Solid (Advanced) + Generative UI are SIDELINED** — don't invest in their docs/polish for now (they
  sit at the sidebar bottom).

## Backlog / next work (each its own effort)

1. **#26 — per-Example & per-Pattern "how to build this".** Rob wants each Example/Pattern to teach how
   to build the thing shown, with **framework code-tabs per example** (Rob's choice). **Key finding:**
   the Examples are **granular SolidJS compositions** (e.g. `Message` + `MessageActions` + `Button` +
   `lucide-solid`), NOT `<kc-chat>` + data — so each non-Solid tab is the **web-component equivalent**
   (e.g. Message Actions → `<kc-chat>` with `messages` carrying an `actions` array + handling
   `messageaction`), hand-authored. ~12 Examples/Patterns × ~6 frameworks ≈ 70 bespoke snippets + a
   reusable code-tabs Docs component + MDX-attachment plumbing on the (Solid-renderer) stories. The API
   tab should also help a dev build the specific item shown. **Sizeable — own branch/plan.** Skip Solid
   (Advanced) + Generative UI per scope.
2. **Card / Generative-UI element framework tabs** — snippets already exist in `framework-usage.json`;
   just broaden the api-tab matcher to `generative-ui-*` / the card story ids (deferred; and GenUI is
   sidelined for now).
3. **Rob's parking lot (`docs/notes.md`)** overlaps with the above — e.g. "break the examples out
   better (CSS from code, organize the data), document how to run examples, Angular/Vue example polish,
   custom scrollbar styling for Windows/Linux." Also a note "Theming section needs to move up" — NOTE
   this is now partly addressed (Theming is its own top-level section near the top via storySort), so
   re-confirm with Rob what he still wants there. Do NOT edit `docs/notes.md` (Rob's file).

## Residual / known
- An axe `aria-valid-attr-value` from React's `useId` colon scheme (`:r6:`) in Storybook's tab
  rendering is **upstream Storybook** (affects its own Canvas tab too) — not fixable in this repo.
- Verify-with-Playwright is the standard for UI changes (memory `ivp-playwright-verification`); run
  `test:storybook` locally (it needs chromium) since it's not in the quick `typecheck/unit/react/build`
  gate.

## Release status
- **PR #72 merged to `main`.** Release **PR #67** (`chore(main): release @kitn.ai/chat 0.12.0`) now
  absorbs everything (iframe/cards work + this docs PR) as **0.12.0** (one minor bump from 0.11.0).
  Merging #67 publishes via npm OIDC trusted publishing. After that, npm = 0.12.0 and no release PR is
  pending until the next change. (If #67 is already merged when you read this, npm is at 0.12.0.)
- Merge PRs via REST (`gh api -X PUT repos/kitn-ai/chat/pulls/<n>/merge -f merge_method=merge`) — the
  repo uses **merge commits**; `gh pr merge` hits the Projects-classic bug (memory
  `gh-cli-projects-classic-bug`).
