<!-- Lane report, kept as evidence. Written by a delegated agent during the 2026-09-19
     session and copied here FROM /tmp so it survives a session/reset; it is a snapshot of
     what was measured and read at commit c2e684d6 plus that session's in-flight edits, so
     LINE NUMBERS MAY HAVE SHIFTED. Paths and quoted code have not. The decisions taken from
     it are in 2026-09-19-session-close.md and 2026-09-19-layering-security-and-shaking.md. -->

# Lane: independent audit of model-output-to-sink paths

Repo: /Users/home/Projects/kitn-ai/kitn-chat @ c2e684d6 (branch update/primitives, tree clean)
READ-ONLY lane. No repo file modified. No build/tsc/vitest/nx run. Package under audit: packages/ui.
Scope: sinks reachable from model OUTPUT (MessagePart -> part -> card envelope -> tool arg), per CLAUDE.md threat model.

## Method

- grep sweep (src, mcp, frameworks) for: innerHTML, outerHTML, insertAdjacentHTML, document.write,
  dangerouslySetInnerHTML, href, xlink:href, src, srcset, formaction, srcdoc, window.open,
  location assignment, iframe creation, new URL, createObjectURL, style/url(), eval/new Function.
- Every hit classified by whether the value can originate from model output, and by the guard on the path.
- Guards checked against the two sanctioned policies only:
  - src/primitives/url-scheme-policy.ts: SAFE_SCHEMES http/https/mailto (isSafeUrl, :47);
    SCRIPT_SCHEMES javascript/vbscript (isScriptUrl, :67).
  - src/primitives/link-preview.ts: RENDERABLE_SCHEMES http/https, no base (isRenderableLink, :81).
- Coverage cross-checked against the three existing suites.

## Verdict

No live unguarded model-output-to-script-sink path found. Every script-capable sink on a model-reachable
path is filtered by one of the two existing policies. Sinks that are NOT scheme-filtered are all `<img src>`
(inert for `javascript:` and for `data:image/svg+xml`; SVG in `<img>` is non-scripted and cannot load
external resources), plus one latent asymmetry (the `Card` href, F-1) with no model path today.

Findings: 1 latent asymmetry (F-1), 1 hand-rolled policy (F-2), 1 API-boundary duplication of the policy by
instruction (F-3), 1 defense-in-depth / request-leak class on model-supplied image URLs (F-4),
1 coverage gap with concrete vectors to add (F-5), 2 documentation notes (F-6, F-7).

## Sink inventory

Script-capable sinks (href, window.open, iframe src) on MODEL-reachable paths:

| file:line | value origin | guard |
|---|---|---|
| src/components/markdown/markdown.tsx:350 (`href`), :367 (`img src`) | model text (`token.href`) | `isSafeUrl` at :347 / :364; blocked link keeps its label, blocked image falls back to alt text |
| src/components/markdown/markdown.tsx:281 (`html` token) | model text | none needed: returned as a TEXT node, no HTML parse step. Whole file is token-stream rendered, no `innerHTML` (file header :11-58) |
| src/components/source/source.tsx:101, :140 (`href`), :57 | model citation (`wire/consume.ts` source parts) | `isRenderableLink`; unsafe url omits the attribute, domain text stays visible |
| src/components/source/source.tsx:113, :149 (`img src` favicon) | derived from the GUARDED href, via `encodeURIComponent` | n/a, cannot carry a scheme: input is already http(s) or empty |
| src/primitives/card-routing.ts:50-57 (`open` verb -> `window.open`) | model card event url | `isSafeUrl` before both `onOpen` and `window.open` |
| src/components/artifact/artifact.tsx:295 (`window.open`), :285 (`canOpenInTab`) | model card `src` / `files[].url` | `isSafeUrl`; button renders disabled, refusal warned |
| src/components/artifact/artifact.tsx:255, :237 (`framedUrl` -> iframe src) | model card `src` / `files[].url` | `isScriptUrl` (allows data:/blob:, refuses javascript:/vbscript:); default sandbox has no allow-same-origin (:225-241) |
| src/components/artifact/artifact.tsx:796-829 (`href` x2, PDF fallback) | model card url | `isSafeUrl`; omitted, never `href=""` |
| src/components/artifact/artifact.tsx:438 (reads `contentWindow.location.href`) | framed doc | read-only, inside try/catch |
| src/components/card/card.tsx:176, src/components/card/card-surface.tsx:201, src/web-components/card/card.tsx:117 | consumer prop today; MODEL if a consumer card renderer maps card data here | NONE. Finding F-1 |
| src/components/row/row.tsx:63, :150 | consumer `home.links`; model if mapped | `isSafeUrl`; unsafe href forces the inert branch (:66) |
| src/components/link-preview/link-preview.tsx:144 (`href`) | model card `data.url` | `isRenderableLink` (`valid()`, :59) wraps the whole `<a>`; invalid -> href-less error chip; `open` emit re-checked in card-routing |
| src/components/embed/embed.tsx:168 (iframe src) | model card `data`, but origin is FIXED | provider template builds `youtube-nocookie.com/embed/<id>` / `player.vimeo.com/video/<id>`; `id` matches `^[A-Za-z0-9_-]+$` (embed.schema.json:20) and the kit's validator implements `pattern` (card-validate.ts:102). `generic` requires https (:200) AND an app-allowlisted origin (:51, default empty) |
| src/components/artifact/artifact-card.tsx:107 | model card `src` | delegates to `Artifact` (guarded) |
| src/web-components/artifact/artifact.tsx:167, source.tsx:39/:115, row/row.tsx:70 | element props | delegate to the guarded Solid components |
| src/components/tool/tool.tsx:160, :24 | model tool args/output | text node + `JSON.stringify`, no HTML parse |
| src/web-components/define/slot-text.ts:57, :67 | slot text | `textContent` only |

`<img src>` sinks (no scheme policy, all model-reachable unless noted):
- src/components/choice-card/choice-card.tsx:596 (Thumb) and :693 (hover preview) from `choice.options[].media.image` (MODEL; choice.schema.json carries no format/pattern for it)
- src/components/link-preview/link-preview.tsx:167 (`data.image`), :180 (`data.favicon`) (MODEL; link.schema.json marks them `format: "uri"` only)
- src/components/embed/embed.tsx:147 (`data.poster`) (MODEL)
- src/components/image/image.tsx:18, :56 (`data:${mediaType};base64,` built from model-supplied `mediaType`) (MODEL)
- src/components/source/source.tsx:113, :149 (guarded href derived), src/components/icon/icon.tsx:167 (`renderIcon`, F-2), src/components/dock/dock.tsx:129 (`DockLauncherImage`, construct-authored, `isSafeUrl` at authoring in mcp/construct/schema.ts:725), src/components/composer/composer.tsx:1040 and composer-dom.ts:102 (consumer entity icon), src/components/attachments/attachments.tsx:292, :300, src/components/message/message.tsx:584 (attachment `url`, consumer-set via `addFile`), avatar/`avatarSrc` (chat-thread.tsx:913, message.tsx:268, avatar.tsx:19, all consumer)

Style sinks: one model-supplied style value, src/components/artifact/artifact-card.tsx:21-25 `resolveHeight(data.height)` into `style={{height}}` (:102). Cannot inject declarations (a single CSS property value is parsed as one declaration, CSSOM drops the rest). Model can still choose an arbitrary height (e.g. `100000px`), a UI-level harm, not a security sink.

Raw HTML writes: 3 total, none model-driven.
- src/components/code-block/code-block.tsx:155 `innerHTML={highlighted()}`: suppliers are Shiki `codeToHtml` and the kit's own `plain()` (src/primitives/highlighter.ts:107-112, `escapeHtml` into `plain`). Pinned by markdown-xss.test.tsx:232 (top-level fence, asserts no img/script/anchor, no `on*`, source visible, `&lt;` present, no raw `<img`) and :255 (unknown-language `plain()` path). This is the one sink whose escaping is owned by a third party (Shiki); see Limits.
- src/components/composer/composer.tsx:1035 and composer-dom.ts:112: static built-in SVG from `kindGlyph` (composer-dom.ts:57-71). No model input.
Absent entirely (searched, zero hits): outerHTML, insertAdjacentHTML, document.write, dangerouslySetInnerHTML, srcdoc, formaction, xlink:href, srcset, `eval(`, `new Function(`, `setTimeout('...')`, any `location`/`location.href` assignment.

## Findings

F-1 (latent asymmetry, medium). `Card` has no URL policy; `Row` has one on the identical sink.
Evidence: src/components/row/row.tsx:22-23 ("the HomePanel precedent, same policy, same sink"), :63 `safeHref = () => (local.href && isSafeUrl(local.href) ? local.href : undefined)`, :66 unsafe href forces the inert branch even when `onActivate` is set. Contrast src/components/card/card.tsx:100 `isLink = () => Boolean(local.href)` and :176 `href={isLink() ? local.href : undefined}`; same in card-surface.tsx:113, :201 and web-components/card/card.tsx:117.
Model reach today: none found. No built-in renderer in `BUILTIN_CARD_COMPONENTS` (src/components/card/card-registry.tsx:44-70; it moved out of src/primitives/ during this audit) passes an href into `Card`; the only model URLs go to artifact/link/embed/choice, all covered. So this is latent, not live.
Why it still matters: `CardRenderer`'s `types` map (card-renderer.tsx:31-44) is the kit's sanctioned extension point for a consumer card renderer, and `Card` is the component a consumer uses there. A renderer that maps model `data.url` into `<Card href>` reintroduces exactly the class this repo names, on the surface whose sibling already refuses it. No test pins it either: tests/components/card.test.tsx:145-155 asserts only a plain `https://kitn.ai` href, and there is no `javascript:` vector in that file.
Recommendation: apply `isSafeUrl` at the sink in `Card`/`CardSurface` (and therefore `<kai-card>`) the way `Row` does, or state in `Card`'s doc comment why this sink is exempt while `Row`'s is not. Choose one; the current silent difference between two sibling primitives is the defect.

F-2 (hand-rolled policy, low). `renderIcon` classifies a URL with its own regex.
Evidence: src/components/icon/icon.tsx:150 `const isUrl = /^(https?:|\/|data:)/.test(icon);`, :167 `<img src={icon}>`. A third list, not `isSafeUrl`/`isRenderableLink`.
Risk today is low: the value lands in `<img src>` only (inert for `javascript:`, which the regex rejects anyway; inert for `data:image/svg+xml`), no extra attribute is interpolated, and model output does not reach it in shipped code (choice-card renders `media.icon` as `IconBadge` text at choice-card.tsx:700, not through this). It is still a second URL policy inside the package that claims one, and it is exported on the public surface.
Recommendation: keep the regex if it must stay dependency-free, but state at the site that it is an img-only classifier and must not be reused for anything navigable; or route through the shared predicate. Do not let an emitted construct reuse it for an href.

F-3 (policy on the wrong side of the boundary, medium). The kit's scheme policies are not exported, so the MCP instructs consumers to re-type them in app code.
Evidence: `.` barrel src/index.ts:71 exports card-routing's 4 functions but NOT `isSafeUrl`/`isScriptUrl`/`isRenderableLink` (grep: zero hits in index.ts). mcp/catalog/invariants.ts:202 tells the emitted app to hand-roll `const isNavigable = (u) => { try { return ['http:','https:','mailto:'].includes(new URL(u, location.href).protocol); } catch { return false; } }` because the kit's helpers are "REPO-INTERNAL ONLY ... neither is reachable from the published package, so never emit an import for them". Same again at :208 for citations.
Consequence: two hand-typed copies of SAFE_SCHEMES/RENDERABLE_SCHEMES in every generated app, with no guard reading emitted consumer code (the invariant itself records that the class has no structural guard). This is the "derive it, don't type it" rule applied to the security policy: the list is typed out in the generated output instead of read from the source of truth.
Recommendation (product decision, do not do silently): export the two predicates from a public subpath and have the invariant emit an import. Until then, the invariant's snippet is the best available, and the duplication should be named as a known copy in docs/coupling-map.md's derived-lists register.

F-4 (request-leak class, low; XSS-clean). Model-supplied image URLs are not scheme-filtered: choice-card.tsx:596/:693, link-preview.tsx:167/:180, embed.tsx:147, image.tsx:56.
No script sink: `<img>` does not execute `javascript:` or run SVG script, so these are not XSS vectors and the guard would not be `isSafeUrl` (data: images are legitimate here, exactly as the artifact's `data:` allowance is deliberate).
Residual harm, worth deciding on: any model output can force the reader's browser to issue an outbound GET to an arbitrary host (tracking pixel / referrer leak / beacon) with no user action, and can fill the card with an arbitrarily large image. There is no allowlist on any of these.
Recommendation: state the trade explicitly (a scheme check on `image`/`favicon`/`poster` would refuse `data:` images, which are legitimate) and leave the request decision to the consumer, matching the "kit decides HOW, app decides WHETHER" rule. Do not add a sixth policy.

F-5 (coverage gap, medium, matches what mcp/catalog/invariants.ts:160 already admits). Nothing structural guards the class; confirmed by reading: no `packages/ui/scripts/lint-*.mjs` concerns sinks, and docs/coupling-map.md has no row for it (grep for `sink` in that file returns only the release-please row). Vectors NOT covered by any test, with the exact strings I would add:

1. choice media image (choice-card.tsx:596): envelope `{ type: 'choice', id: 'c1', data: { options: [{ id: 'a', label: 'A', media: { image: 'javascript:window.__PWNED__=1' } }] } }`, plus `'data:image/svg+xml,<svg onload="window.__PWNED__=2">'`. Assert every `img[src]` squashed (`/\s/g` stripped) does not match `/^(javascript|vbscript):/`, and that the option label still renders.
2. link card image/favicon (link-preview.tsx:167, :180): `{ url: 'https://ex.com', title: 't', image: 'javascript:window.__PWNED__=3', favicon: 'javascript:window.__PWNED__=4' }`. Assert the `https://ex.com` href is present (so the render is not vacuous) and no `img[src]` is a script scheme.
3. embed poster (embed.tsx:147): `{ provider: 'youtube', id: 'dQw4w9WgXcQ', poster: 'javascript:window.__PWNED__=5' }`. Assert the poster `img[src]` is not a script scheme and the play button still renders.
4. `Card` href (F-1's vector, currently FAILS the Row contract): `render(() => <Card heading="Docs" href="javascript:window.__PWNED__=6" />)` and the same with `'data:text/html,<script>window.__PWNED__=7</script>'`, plus `<kai-card href="javascript:window.__PWNED__=8">` as an attribute. Assert `root.hasAttribute('href') === false` (the `Row` outcome), the mirror of tests/components/card.test.tsx:145-155.
5. `renderIcon` img branch (icon.tsx:167): `renderIcon('data:image/svg+xml,<svg onload="window.__PWNED__=9">')` and `renderIcon('javascript:window.__PWNED__=10')`. Assert no element carries an `on*` attribute and the `javascript:` case does not become an `img`.
6. model-supplied style value (artifact-card.tsx:102): card data `{ src: 'https://a.test/', height: '1px; background: url("https://evil.tld/beacon")' }`. Assert `root.style.backgroundImage === ''` and that no background image was applied, pinning that a model cannot inject a second CSS declaration through `height`.
7. attachment url (attachments.tsx:292, message.tsx:584): `{ type: 'file', filename: 'x.png', mediaType: 'image/png', url: 'javascript:window.__PWNED__=11' }`. Assert no `img[src]` carries the scheme. Consumer-set today, so lower priority than 1-4.
8. `Artifact`'s `kai-navigate` (F-7): already asserted only as "not in an href"; there is no test pinning that the EMITTED event carries the raw refused url. Worth one assertion so the documented "reports the REAL url" decision cannot drift silently.

F-6 (documentation precision, no action). The recurring phrase "validated only as `format: \"uri\"`, which constrains no scheme" (artifact.tsx:129, :785, artifact-url-xss.test.tsx:6) is true and slightly understated: the kit's validator does not implement `format` at all. JsonSchema has no `format` field (src/primitives/card-validate.ts:8-27) and no `format` case exists in the keyword handlers; src/primitives/card-validate-schemas.ts:27 already says so exactly ("`format`: string formats are NOT checked"). So an artifact `src`/`files[].url` is checked as `type: 'string'` and nothing more, while embed's `id` IS checked because `pattern` is implemented (card-validate.ts:102). No change needed; do not "fix" the comment into claiming a check exists. Recorded so nobody later reads `format: "uri"` as a guard.

F-7 (event boundary, informational). `Artifact` refuses a hostile url at the sink but emits it verbatim on the public event.
Evidence: artifact.tsx:359-362 `local.onNavigate?.(currentUrl())` (and :395 on the reload path) with the comment "Reports the REAL url, not the framed one"; web-components/artifact/artifact.tsx:186 `onNavigate={(url) => dispatch('kai-navigate', { url })}`; artifact-card.tsx:119 `onNavigate={(url) => patch({ src: url })}` re-enters the card envelope. The event's own public doc (web-components/artifact/artifact.tsx:53-54) says only "`detail.url` = the new location".
This is a deliberate, documented decision and it is correct for auditing (the kit must not lie about what arrived). The note is that the value crossing the public boundary is UNVALIDATED, and the doc comment at the event does not say so, while the source comment does.
Recommendation: one line on the `kai-navigate` doc saying the url is reported as it arrived and is not scheme-validated, so a consumer that renders it must guard (the invariant already tells them how).

## Guard conformance check

- Navigable sinks (href, window.open) use `isSafeUrl`/SAFE_SCHEMES: markdown, source (via isRenderableLink, the citation-shaped sink), row, artifact fallback anchors, artifact open-in-new-tab, card-routing `open`. Correct, and each site says why it chose that list.
- Framing sinks use `isScriptUrl` and the comment at artifact.tsx:247-255 explains why the allowlist is the wrong tool there (data:/blob: are legitimate and get an opaque origin). No competing list.
- No third policy found in package source, except `renderIcon`'s regex (F-2). The remount/dev-tool iframe (mcp/construct/dev.ts:777) is deliberately unguarded and its comment names the trust story (own spawned localhost Vite, never model- or consumer-supplied); `src/remote/` pins provider origin and fails closed before mounting (src/remote/origin.ts:8-11, host-embed.ts:77, :236).

## What I checked and found nothing

- No `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`dangerouslySetInnerHTML` reachable from model output. The three raw HTML writes are Shiki output, a static SVG glyph string, and the same glyph in JSX.
- No `srcdoc`, `formaction`, `xlink:href`, `srcset`, `eval`, `new Function`, timer-string, or `location` assignment anywhere in packages/ui (src, mcp, frameworks).
- No unguarded `window.open` (only 2 call sites, both `isSafeUrl`-gated) and no model-reachable iframe `src` without `isScriptUrl`/provider pinning.
- No `href` built from model data escapes the two policies: markdown (link/image), citations, card `open` verb, artifact's three sinks, link card, row.
- No model text reaches an attribute other than through a URL policy. `title`/`alt` on markdown link/image decode character references on purpose (display-only) and never on a URL; markdown-xss.test.tsx:177 pins that an entity-encoded scheme stays inert.
- No structural guard for the sink class exists (confirmed F-5). This is the one place where "nothing found" is itself the finding, and it is already recorded as `status: 'partial'` in mcp/catalog/invariants.ts:160.

## Limits

- LINE NUMBERS ARE A SNAPSHOT. Another agent was editing packages/ui/src concurrently during this audit (git status at the end showed 35 modified entries and 3 staged renames, none of them mine). Evidence was read at c2e684d6 plus that live worktree, so a cited line number may have shifted by the time anyone reads this; the file paths and the quoted code did not. Files that changed under me while reading: src/index.ts, src/components/message/message.tsx, src/components/chat/chat-thread.tsx, src/components/thread/thread.tsx, src/components/card/card-registry.tsx (moved out of primitives), src/web-components/card/cards.tsx, src/web-components/message/message.tsx, src/state/parts.ts, and tests/components/artifact-url-xss.test.tsx (modified, which may mean a vector was added or renamed after I catalogued it). Nothing in this lane wrote to the repo.
- Static read only, no browser run, so every claim about `<img>` inertness and sandbox behaviour is reasoning from the platform, not an observation. The three suites record that a real Chromium was used once (artifact-url-xss.test.tsx:33-52) and that jsdom assertions are a proxy for non-execution, not a proof.
- code-block.tsx:155 trusts Shiki to escape; the existing test asserts the outcome, not the mechanism, so a Shiki regression that started emitting raw tags would fail markdown-xss.test.tsx:232 rather than being caught at the dependency.
- I did not audit `frameworks/react/index.tsx` (generated wrappers) pointer by pointer; its grep hits are prop docs only and all sinks delegate to the guarded Solid components.

Implemented: nothing (read-only lane, as instructed).
