# Changelog

## [0.17.0](https://github.com/kitn-ai/ui/compare/@kitn.ai/ui-v0.16.0...@kitn.ai/ui-v0.17.0) (2026-06-22)


### Features

* **cards:** dismiss + recovery for generative-UI cards ([9763f94](https://github.com/kitn-ai/ui/commit/9763f944c59e148bd54978d0ea6a800750e8c8c5))
* chat interaction components — toast, action-row feedback, card dismiss/recovery, kai-compare (+ tooltip fix) ([0fd1b40](https://github.com/kitn-ai/ui/commit/0fd1b405138abd08cf4d8a10d34e35b77d79e99a))
* **chat:** stateful message action row — copy-check, like/dislike, toasts ([f2c0f0e](https://github.com/kitn-ai/ui/commit/f2c0f0e2f3e07b626610d6a3b13e1aa75bf94191))
* **chat:** thumb feedback slide-to-fill — collapse the other vote, slide the active in ([942c6d8](https://github.com/kitn-ai/ui/commit/942c6d8325c057215e09a56ac9cc460964ec8141))
* **compare:** tabs layout (pills) + container-query columns↔tabs ([8cd02dd](https://github.com/kitn-ai/ui/commit/8cd02dd65743b8c266a34132220c2b8607106f5a))
* **docs-site:** live agent-flow hero demo with an interactive generative-UI card ([5a15eab](https://github.com/kitn-ai/ui/commit/5a15eab64184fff5bda5e96d4ac4a158884c8a1d))
* **docs-site:** live autoloader demo on the bundle-size page ([ba8d7e5](https://github.com/kitn-ai/ui/commit/ba8d7e54488d083710aacecd6b417ef30ef6c7d4))
* **docs:** compare + toast use the shared Playground preview ([b9e6e21](https://github.com/kitn-ai/ui/commit/b9e6e213682be9ca271f1255c1ceb57dc3a437b3))
* **docs:** live card dismiss/recovery demo (dismiss -&gt; stub -&gt; undo/reopen) ([cd91dc6](https://github.com/kitn-ai/ui/commit/cd91dc657689e13cf613a36e17498929a730542b))
* **docs:** live compare demo (pick/stream/layout) + correct layout values ([c3fe1ce](https://github.com/kitn-ai/ui/commit/c3fe1ce234b816a791e2eb233ed5668476a79b7d))
* **docs:** live message action-row + tooltip demo (copy, thumbs slide-to-fill) ([e204523](https://github.com/kitn-ai/ui/commit/e20452382bbb7508fbd70a6ee3f01181cb56b0e7))
* **docs:** live toast demo + correct duration facts (5s/7s) ([36858fd](https://github.com/kitn-ai/ui/commit/36858fd7ad09aa3e445110fed5c096ce34caa98e))
* **docs:** shared kai theme-sync helpers (getKit, syncKaiTheme, syncToastRegionTheme) ([3e8c999](https://github.com/kitn-ai/ui/commit/3e8c9999928b899c161edf4f37ff2d8ddd76193d))
* **docs:** toast demo with trigger buttons + working position ([ffbfb27](https://github.com/kitn-ai/ui/commit/ffbfb27c559d2c8541cff75081f069878e92e140))
* **elements:** add kai-compare — dual-response "which do you prefer?" ([a48cd80](https://github.com/kitn-ai/ui/commit/a48cd803b194edd0ecbf5f77855b1d6776d5f1a1))
* **elements:** add kai-toast-region + imperative toast() primitive ([44afb9c](https://github.com/kitn-ai/ui/commit/44afb9c963818b480e3da8b4703e4025936ef379))
* **elements:** footprint reduction — per-element imports + opt-in autoloader (+ Shiki devDeps, tailwind-merge v3) ([499a8d1](https://github.com/kitn-ai/ui/commit/499a8d195c84ecbd4d4d3da53faff6c0512dcdc3))
* **elements:** per-element entry points + opt-in DOM autoloader ([6d61d6d](https://github.com/kitn-ai/ui/commit/6d61d6dc39cc47d6e351177e9087a7e839956547))
* **elements:** scope toasts to a container — chat toasts default to the chat ([36e6445](https://github.com/kitn-ai/ui/commit/36e64453fb50e33fefef14e3d5165659b23d9cdc))
* **elements:** type declarations for per-element imports + the autoloader ([5ad894c](https://github.com/kitn-ai/ui/commit/5ad894c3e73176df341d9f5d7999c60da9d18323))
* **mcp:** teach debug + scaffold about per-element imports and the autoloader ([d3abc56](https://github.com/kitn-ai/ui/commit/d3abc56c45879377ac2e03107cd346489ffa5111))
* **mcp:** teach debug + scaffold about toast, card dismiss, and kai-compare ([d1d2334](https://github.com/kitn-ai/ui/commit/d1d233442d2af8632a5dd19755067768470691f5))
* **toast:** collapsed stacking mode (Sonner-style pile, expand on hover/focus) ([de1eb7a](https://github.com/kitn-ai/ui/commit/de1eb7a26b51749f32e2abe286f7e31ade2a18e4))
* **toast:** configureToasts() to opt the imperative singleton into stack/position/max ([07e325e](https://github.com/kitn-ai/ui/commit/07e325e6ce3ec4fccc434847a3c92876dc6fa59d))
* **toast:** expose stack on the kai-toast-region facade (+ regen artifacts) ([537be63](https://github.com/kitn-ai/ui/commit/537be6316d3eaee74da4fa2db1601b419367e8d4))
* **toast:** honor `position` for a target-anchored region ([d53d06c](https://github.com/kitn-ai/ui/commit/d53d06c457ae1c8496bc988e197c172a27b8307c))


### Bug Fixes

* **api:** regenerate stale element artifacts (compare tabs layout, toast target) ([3339951](https://github.com/kitn-ai/ui/commit/333995118d4f3bfcf4dda48015d29c154f6a5582))
* **build:** keep register-all coarse, separate from the per-element split build ([773c2bc](https://github.com/kitn-ai/ui/commit/773c2bcec51964135efdf89dabcdc6ee9ef9f081))
* **compare:** make the pick button the radio (no nested interactive / no double label) ([0db075e](https://github.com/kitn-ai/ui/commit/0db075e78dc9078fd4791cf1c09cd6f6d18108eb))
* **deps:** move shiki/[@shikijs](https://github.com/shikijs) to devDependencies (-17 MB consumer install) ([7944256](https://github.com/kitn-ai/ui/commit/7944256e1088bd12230cf0ce247947aa1464fcd4))
* **deps:** upgrade tailwind-merge ^2 → ^3 (Tailwind v4 class groups) ([186302b](https://github.com/kitn-ai/ui/commit/186302b2f786f0a6525e86313888f63fdfc2d6b1))
* **docs-site:** await element registration before setting props (timing race) ([4797dab](https://github.com/kitn-ai/ui/commit/4797dabcae8017fe25803b57a6f59d803b982ecb))
* **docs-site:** sync-kit ships the dist/elements/ subtree (chunks moved there in the unified build) ([d0e5fd4](https://github.com/kitn-ai/ui/commit/d0e5fd404af70b56ba6a79d09cd994316e92d32b))
* **docs:** landing hero — consistent feedback actions on the follow-up message ([0c65b8e](https://github.com/kitn-ai/ui/commit/0c65b8ea9e25d7a3f58f722bd6096c6470037e02))
* **docs:** toast demo — remove dismissed toasts from the region, not just hide them ([139c9ed](https://github.com/kitn-ai/ui/commit/139c9ede64359770a5f533a1d06a0e0c8ee249fb))
* **elements:** position the autoloader as CDN/static-only (consumer-regression finding) ([2d05e83](https://github.com/kitn-ai/ui/commit/2d05e83995a7b2a03ba536d790a4c9fac36506b9))
* **elements:** render the first toast — bind store after the element upgrades ([ec4baf7](https://github.com/kitn-ai/ui/commit/ec4baf76a97afe2cc547cd8651dc63c0ac576ac3))
* **elements:** restore kit-wide animations (import tw-animate-css) + longer toasts ([b7e4f3d](https://github.com/kitn-ai/ui/commit/b7e4f3da4826643cb70857320210e251980b3b54))
* **storybook:** theme-aware demo chrome + document-wide theme mirror ([fdd7542](https://github.com/kitn-ai/ui/commit/fdd7542401150e5c93b5e6eca7f16b1a8299192c))
* **toast:** collapsed stack — pause all on hover + stable hover surface (no flicker) ([fcb4438](https://github.com/kitn-ai/ui/commit/fcb4438435942eeae357f9e2100adc2a5ef2335c))
* **toast:** export configureToasts from public entries + MCP scaffold note ([15a7ef7](https://github.com/kitn-ai/ui/commit/15a7ef7838a700ea5b4e5d58c056b061e307b8a6))
* **toast:** keep the collapsed stack expanded when dismissing (focusout no longer collapses) ([597925e](https://github.com/kitn-ai/ui/commit/597925e6be742b171e1f73452a24b18bfd3610eb))
* **toast:** tune collapsed-stack pile geometry ([65e5085](https://github.com/kitn-ai/ui/commit/65e5085b85c3ccb9feaa7748ce798f8958e35ce2))
* **ui:** dismiss tooltip when its trigger is clicked ([02656da](https://github.com/kitn-ai/ui/commit/02656da19991c7df9bbb49dd137f2e6c1cfdbd93))

## [0.16.0](https://github.com/kitn-ai/ui/compare/@kitn.ai/ui-v0.15.1...@kitn.ai/ui-v0.16.0) (2026-06-20)


### Features

* add context7.json for Context7 indexing (kai- prefix + contract rules) ([e183b00](https://github.com/kitn-ai/ui/commit/e183b002fc1709d97f096c3c4f85ba95b0f2a360))
* add Pydantic AI integration (catalog + docs) ([f175abd](https://github.com/kitn-ai/ui/commit/f175abdc850760e4efe97b950ab27ba33f97872a))
* **agent-tooling:** archetype entries ([76cbfc8](https://github.com/kitn-ai/ui/commit/76cbfc8131dab0c00d5e0621ba69b1d9e705e7e4))
* **agent-tooling:** catalog types + zod schemas ([2dd806c](https://github.com/kitn-ai/ui/commit/2dd806c3abc8973a2cb841be1cdd78db1c0f4f06))
* **agent-tooling:** registry barrel + tests ([3f622f4](https://github.com/kitn-ai/ui/commit/3f622f4c9831c0f5cc9cc8f98ccea4090d6d94aa))
* **agent-tooling:** TS-backend integration entries ([598cd82](https://github.com/kitn-ai/ui/commit/598cd8201766d0bf295184b9ae1779c9e504041a))
* AI/UI agent-tooling (kai MCP) + consumer-hardening + /consumer-regression harness ([78afb7c](https://github.com/kitn-ai/ui/commit/78afb7cd9e1dec889536d7f1f2a3af941f3b2332))
* **mcp:** add tanstack-start as a scaffold framework (verified ssr:false route pattern) ([bc1a1eb](https://github.com/kitn-ai/ui/commit/bc1a1ebebbcfee131ad841281569cdab6275e80c))
* **mcp:** component_reference tool ([96205d0](https://github.com/kitn-ai/ui/commit/96205d02f50d9144d059b540865f31cdb918dfc1))
* **mcp:** debug rules for unregistered-elements, tsc-source-pull, vite-404 ([18877e0](https://github.com/kitn-ai/ui/commit/18877e043346bc2498f3313d38a7565823a47aac))
* **mcp:** debug tool ([81a2648](https://github.com/kitn-ai/ui/commit/81a2648547a274fa744e9f744bb9518fcb79b1c2))
* **mcp:** install docs + scaffold-matrix verification ([81d79de](https://github.com/kitn-ai/ui/commit/81d79deec1e842499e702af1d4fe74a43fdc7a98))
* **mcp:** scaffold tool (archetype x integration x placement x framework) ([000523b](https://github.com/kitn-ai/ui/commit/000523b2f2a42bb59b4889c91f031860620f3c29))
* **mcp:** server skeleton + four-tool registration ([a10eee7](https://github.com/kitn-ai/ui/commit/a10eee75ecccdca5c18762da18d62f47ef00db27))
* **mcp:** theme tool ([00c2d28](https://github.com/kitn-ai/ui/commit/00c2d287de07929dccc6570ba38e99b6f7345782))


### Bug Fixes

* **mcp:** avoid React page/wrapper name collision in scaffold ([5601343](https://github.com/kitn-ai/ui/commit/5601343f399edba8229427395086488ddb759a56))
* **mcp:** cloudflare worker re-frames native SSE to OpenAI format; drop stale transpilePackages note ([7f2b372](https://github.com/kitn-ai/ui/commit/7f2b37219489c8491e6283dbe206a3183be500e1))
* **mcp:** correct dark accent-foreground contrast + invalid-hex note in theme ([eacb8f9](https://github.com/kitn-ai/ui/commit/eacb8f9fe5eb7975a34fc885928dc8d875561035))
* **mcp:** correct theme docs URLs to ui.kitn.ai; tighten debug matching; svelte loading + scaffold polish ([3f2dbc0](https://github.com/kitn-ai/ui/commit/3f2dbc0b03afc3382f1951203474a4fe4b5c6c10))
* **mcp:** next dynamic ssr:false import (SSR-safe) + strict-TS role literals ([0686d7d](https://github.com/kitn-ai/ui/commit/0686d7d34d80686693fb39c3e163da2611a57931))
* **mcp:** node typecheck config + result-shape casts in tests ([0e4d536](https://github.com/kitn-ai/ui/commit/0e4d536721d8f93efd0d1cd82029cefc87205aa0))
* **mcp:** runnable react (wrapper) + svelte front-ends in scaffold ([9537009](https://github.com/kitn-ai/ui/commit/953700920d83ae1d5d71bf185c0132ef52d3d804))
* **mcp:** scaffold gates raw-DOM prop-setting on customElements.whenDefined (SCAF-15) ([e5f26a5](https://github.com/kitn-ai/ui/commit/e5f26a5641a007508bed8c802800702389482112))
* **mcp:** scaffold sends model for real backends + idiomatic message-embedded tool/reasoning composition ([988c81e](https://github.com/kitn-ai/ui/commit/988c81e6df42173d7b64d34027bdf7c90ae1f35f))
* **mcp:** scaffold side-panel placement, suggestions, elements-import, + mock integration ([cc6221e](https://github.com/kitn-ai/ui/commit/cc6221e2b9565bb61c8270e117bb9a956f7dc168))
* **mcp:** scaffold uses theme.tokens.css, next use-client, vue isCustomElement, typed handlers ([fcecef0](https://github.com/kitn-ai/ui/commit/fcecef042459f446a01944ca6e3e5dea54551a67))
* **mcp:** svelte mock + non-mock role literals use as const (zero-edit svelte-check) ([2f5db1a](https://github.com/kitn-ai/ui/commit/2f5db1a42f837d9adcd9a28ef9a0743a92e70194))
* **mcp:** tighten scaffold ChatMessage type to library union; pydantic route CORS allow OPTIONS ([3946a4d](https://github.com/kitn-ai/ui/commit/3946a4d92c3726b508e3629aaa214bb2d1efcda6))
* **mcp:** vue + svelte workspace emit resizable split (SCAF-14B) ([03d3257](https://github.com/kitn-ai/ui/commit/03d32570647a8546f37201fd805917f275912312))
* **mcp:** vue role as-const + svelte typed element access (zero-edit svelte-check) ([057b1d5](https://github.com/kitn-ai/ui/commit/057b1d5bf089d592b778603f1f90b47154edad47))
* **mcp:** vue suggestion-mode kebab attribute + tighten suggestions test ([d0c0b17](https://github.com/kitn-ai/ui/commit/d0c0b17df0ec1926091a8699337692c46c9e9c35))
* **mcp:** vue/svelte typed messages + .prop binding, html DOMContentLoaded-safe wiring ([5433a94](https://github.com/kitn-ai/ui/commit/5433a94c63919c3b96b8043d0ab8a3c12bf6ea3e))
* **mcp:** workspace archetype emits runnable resizable split (chat + artifact panes) ([3b75824](https://github.com/kitn-ai/ui/commit/3b7582423c4a4545ede05b44dbc032b0ca1406b1))
* **pkg:** inject elements self-register via build banner (keep React wrapper source typecheck-clean; fixes 1474 react-jsx errors from walking Solid source) ([fc3b05f](https://github.com/kitn-ai/ui/commit/fc3b05fc71b452bc8fea84406999bd9308ed4e9c))
* **pkg:** remove sideEffects field that hollowed the elements bundle (it tree-shook the registrations out of the lib's own build) ([e3bf7f9](https://github.com/kitn-ai/ui/commit/e3bf7f96989db60a3559308c2b416557df553ff8))
* **pkg:** self-register elements from /react, SSR-safe registration, consumable theme.css, drop redundant solid-js peer ([6cc5fde](https://github.com/kitn-ai/ui/commit/6cc5fdefc834f7d33b8d1f7208bb7575ecea764a))
* **pkg:** ship compiled . + ./react + type-only ./elements (stop shipping raw source) ([c6241fe](https://github.com/kitn-ai/ui/commit/c6241fe6be14b7a576f4390e92295072d1c9c84d))
* **pkg:** SSR-import-safe element registration (client-only via gated dynamic import) ([d0907d5](https://github.com/kitn-ai/ui/commit/d0907d57fa178df6038198e572a7409cac3e97e8))
* **test:** make consumer-regression harness paths portable (resolve repo via git rev-parse --show-toplevel; no hardcoded absolute paths) ([bcd1c69](https://github.com/kitn-ai/ui/commit/bcd1c69f4b7ff391e9ace997b9e0251e8451dcfb))

## [0.15.1](https://github.com/kitn-ai/ui/compare/@kitn.ai/ui-v0.15.0...@kitn.ai/ui-v0.15.1) (2026-06-19)


### Bug Fixes

* exclude dev-only files (stories/tests/mdx) from the npm package ([fc1a213](https://github.com/kitn-ai/ui/commit/fc1a213b9078ad39ca82f967221200dccb8b1856))
* **landing:** polish + harness section + serve llms.txt ([0e515eb](https://github.com/kitn-ai/ui/commit/0e515eb2935a3612f0273ad693713429adfbf188))
* **landing:** polish the landing page + add a harness section ([31cd344](https://github.com/kitn-ai/ui/commit/31cd34409526fd2e4b37283f8460050c5c2fe2ce))
* slim the npm tarball (exclude stories/tests/mdx) ([d67a673](https://github.com/kitn-ai/ui/commit/d67a6731e1a3b30d521c6b1c1a657406ee56fd9e))

## [0.15.0](https://github.com/kitn-ai/ui/compare/@kitn.ai/ui-v0.14.1...@kitn.ai/ui-v0.15.0) (2026-06-19)


### ⚠ BREAKING CHANGES

* CSS theming tokens are renamed `--kc-*` → `--kai-*` and form-card schema keys `x-kc-*` → `x-kai-*`. Update token overrides (e.g. `--kc-color-primary` → `--kai-color-primary`) and any card payloads using the `x-kc-*` hints.
* all element tags and events are renamed from `kc-` to `kai-`. Update `<kc-*>` tags to `<kai-*>` and event listeners from `kc-*` to `kai-*`.
* `sidebarCollapsed` no longer just seeds the initial state — when set it now controls the sidebar (the element won't self-toggle away from it). To start collapsed but keep the element managing it, use `defaultSidebarCollapsed` (or the `default-sidebar-collapsed` attribute).
* composite gaps — prompt-input stoppable/kc-stop, context thresholds, sources numbered, kc-scroll-button
* DX foundation — self-contained FeedbackBar, kc-action children, kebab kc- events
* ChatMessage.actions widens to (ChatMessageAction | CustomAction)[] and the messageaction event `action` is now `string` (built-in name or custom id).
* **events:** Two element-event API consolidations following the kc-message `messageaction` pattern (single event with discriminant).
* **release:** rename npm scope @kitnai/chat → @kitn.ai/chat
* all web-component tag names and React wrapper names changed to the kc-* / Kc* scheme. Update markup and imports accordingly. A runtime prefix override (register({ prefix })) is planned so consumers can re-namespace on the fly without recompiling.
* **ui:** remove @kobalte/core dependency (replaced by DIY overlay primitives)

### Features

* add kc-popover element (button + popover card primitive) ([5095c59](https://github.com/kitn-ai/ui/commit/5095c596c481122eeac829ad0e23c4c435295af1))
* adopt the kc-* custom-element prefix (Shoelace-style brand mark) ([5a4ec19](https://github.com/kitn-ai/ui/commit/5a4ec192a3e3fbebad9db83961bb4661c591774e))
* AI/UI rebrand + marketing landing page + rename package to [@kitn](https://github.com/kitn).ai/ui ([5481b8b](https://github.com/kitn-ai/ui/commit/5481b8b05be03e3c398da0883d5cd4ae8bdca5f3))
* **artifact:** &lt;kc-artifact&gt; viewer + &lt;kc-file-tree&gt; ([3edda25](https://github.com/kitn-ai/ui/commit/3edda2500ec22878783c17097bdd43cc6fe2dfb9))
* **artifact:** &lt;kc-artifact&gt; viewer + &lt;kc-file-tree&gt; ([e0232a0](https://github.com/kitn-ai/ui/commit/e0232a0b77cf7d5e0d89aa301beb67a5b219b37a))
* **artifact:** ArtifactPdfPreview inline pdf.js viewer ([f72083a](https://github.com/kitn-ai/ui/commit/f72083a4d38c9a128f87bc098317aa819981abaf))
* **artifact:** branch Preview to inline PDF viewer + reload ([2d3f934](https://github.com/kitn-ai/ui/commit/2d3f934506f4456c4f4e020116c36fd358db9cd2))
* **artifact:** expand/maximize + open-in-tab + configurable toolbar + standalone/readonly-path ([e13bddf](https://github.com/kitn-ai/ui/commit/e13bddf4c137354e25a5a737dac51e0213bae295))
* **artifact:** expand/open-in-tab/configurable toolbar + standalone + readonly-path (Solid) ([c49683e](https://github.com/kitn-ai/ui/commit/c49683ec9086d325b2c702f04457adde982c04c4))
* **artifact:** facade flags + kc-maximize-intent emit + maximizechange + state reconcile ([38272aa](https://github.com/kitn-ai/ui/commit/38272aa4787b8deb107323df0e67d2056127e0f1))
* **artifact:** inline PDF preview via on-demand pdf.js + fallback ([85b360c](https://github.com/kitn-ai/ui/commit/85b360c0d7de1ae2c52c9a4739b9ba0cabdc1b34))
* **artifact:** isPdfUrl preview detector ([7437251](https://github.com/kitn-ai/ui/commit/743725176c41fe1a1882d68a1e27fe61586b23e7))
* **artifact:** PDF fallback card (open / download) ([62a18fc](https://github.com/kitn-ai/ui/commit/62a18fc786042d8aa0343d49648906c10e556121))
* attachment support in the web-component input ([59d2c55](https://github.com/kitn-ai/ui/commit/59d2c55cbe3598fa0f8bb277212cfb7b10733aa8))
* **card-contract:** CardProvider + useCardHost native transport ([9909ca1](https://github.com/kitn-ai/ui/commit/9909ca18f110eed94923ea4e910bbb9d88d7238a))
* **card-contract:** emitCardEvent + routeCardEvent + listener ([2cf1f10](https://github.com/kitn-ai/ui/commit/2cf1f10c694e130d16e8665f3cbd3198805d088c))
* **card-contract:** export the foundation from the public barrel ([4d9fe9c](https://github.com/kitn-ai/ui/commit/4d9fe9ccfaf9d209a6f02e780284578c8f7039cd))
* **card-contract:** frozen contract types + version ([712e3a5](https://github.com/kitn-ai/ui/commit/712e3a55318f2ee37d1b8ec4e058b3bdaf44d2ee))
* **card-contract:** generative-UI foundation (types, validator, transport, schemas) ([8392275](https://github.com/kitn-ai/ui/commit/83922756d3c695d2e11a99e7e869353c8bdb42ae))
* **card-contract:** shared lean JSON-Schema validator ([a93281e](https://github.com/kitn-ai/ui/commit/a93281e27add3c2dccb28f12ec74afc92cbec9f0))
* **card-contract:** ship envelope/event schemas to dist/schemas ([99715de](https://github.com/kitn-ai/ui/commit/99715de1e5118c540f22c76a06f9523c05a96313))
* **cards:** &lt;kc-cards&gt; web-component list dispatcher ([a7abd54](https://github.com/kitn-ai/ui/commit/a7abd5438056ba6790e825c79c40e4b2ab0379e8))
* **cards:** add applyResolution round-trip helper ([dde21e3](https://github.com/kitn-ai/ui/commit/dde21e30c5eb4ee083d2b0089af5214b7ecb67d0))
* **cards:** add CardResolution re-hydration field to the card contract ([d15e743](https://github.com/kitn-ai/ui/commit/d15e7432b21a3b02f831990b96537c0238e1460d))
* **cards:** add useCardResolution controller (prop &gt; optimistic precedence) ([c2a161b](https://github.com/kitn-ai/ui/commit/c2a161b4bdbcc67d514babad2c7d9addb8dcf7bc))
* **cards:** card-registry — type→component/tag maps + merge helpers ([a5f945f](https://github.com/kitn-ai/ui/commit/a5f945fcd853a055d4189c1b614e04206d44d895))
* **cards:** CardFallback for unsupported card types ([f6385ac](https://github.com/kitn-ai/ui/commit/f6385acb0b77ece53159cf9d0fdf787afd3331de))
* **cards:** CardRenderer + renderCard (Solid single-envelope dispatcher) ([4aa2030](https://github.com/kitn-ai/ui/commit/4aa2030645a4bdb4a701e46403280bb239974416))
* **cards:** chromed read-only resolved state + card-API consistency pass ([35166ee](https://github.com/kitn-ai/ui/commit/35166ee5ff05c35645d4ddb98a07f8e30539064c))
* **cards:** export the dispatcher from the public barrel ([47cebaa](https://github.com/kitn-ai/ui/commit/47cebaa8129a822b6df27617ef52f26739364491))
* **cards:** forward resolution through dispatcher + element facades ([0f9ea6e](https://github.com/kitn-ai/ui/commit/0f9ea6ec4b5521daa02a3b0b7f3debbdcaae11af))
* **cards:** generative-UI card dispatcher (renderCard / &lt;kc-cards&gt;) + Overview ([04e1bb7](https://github.com/kitn-ai/ui/commit/04e1bb7fe25337dbe1cb1c0be25d9631a111b884))
* **cards:** integrate kc-card/kc-form/kc-link-card/kc-embed (register + barrel + regen) ([cf2ad3a](https://github.com/kitn-ai/ui/commit/cf2ad3ac5320e74f5fff4e7ecf0238bda50175e8))
* **cards:** integrate kc-confirm + kc-task-list (register + x-kc hints + regen) ([f832995](https://github.com/kitn-ai/ui/commit/f832995b012928f28dcaa5da0fc4fb73b74d109f))
* **cards:** kc-card base shell + kc-form JSON-Schema renderer ([b759978](https://github.com/kitn-ai/ui/commit/b759978903edfdfd507042bc9db8318271bee3d3))
* **cards:** kc-card, kc-form, kc-link-card, kc-embed (generative-UI cards) ([00e5884](https://github.com/kitn-ai/ui/commit/00e58849d88c93c86348db9f5b13708953969ec7))
* **cards:** kc-choice chromed read-only resolved state ([fb95710](https://github.com/kitn-ai/ui/commit/fb95710ed1f568469983bdce71a611975b2be781))
* **cards:** kc-choice image hover preview for small thumbnails ([e69557b](https://github.com/kitn-ai/ui/commit/e69557bddf0759f6e74d8a1167510ad673785e3a))
* **cards:** kc-choice single-select option card ([aab58c9](https://github.com/kitn-ai/ui/commit/aab58c9596da7d479e223ef9cdf8cc5a046d72ff))
* **cards:** kc-choice single-select option card ([1dd0250](https://github.com/kitn-ai/ui/commit/1dd02501f2e5a0d59ba43757aa5c49e9f9843274))
* **cards:** kc-confirm + kc-task-list (approval cards) + Button destructive variant ([fb8d255](https://github.com/kitn-ai/ui/commit/fb8d255bdc534a762abb5be2b97a1890a55464a2))
* **cards:** kc-confirm + kc-task-list + full generative-UI card design pass ([f9acdc4](https://github.com/kitn-ai/ui/commit/f9acdc447abf35f9cf983c6444646bd099425ce9))
* **cards:** kc-confirm chromed read-only resolved state ([ba3c3a0](https://github.com/kitn-ai/ui/commit/ba3c3a0eb2a6389843ddf0b988fbb1a5abd098fa))
* **cards:** kc-form chromed read-only summary (summarizeForm + dl view) ([e43cdce](https://github.com/kitn-ai/ui/commit/e43cdcee0045b7dafb7a92d42d108bf86d09559c))
* **cards:** kc-link-card + kc-embed (display cards on the Card Contract) ([8b5a5bc](https://github.com/kitn-ai/ui/commit/8b5a5bcc4c92a29eec6e00de192c2f54b4744f64))
* **cards:** kc-tasks chromed read-only resolved summary ([d2a2890](https://github.com/kitn-ai/ui/commit/d2a28909ae7325869889f1756dd7fc1cce369af7))
* **cards:** premium control design + Storybook light/dark + a11y fixes ([1855321](https://github.com/kitn-ai/ui/commit/18553213127a6c6b716a7f98cdca1b05a6c837dd))
* **cards:** redesign card chrome + form controls ([d6df789](https://github.com/kitn-ai/ui/commit/d6df789402b918e2bdef9f98aa9ea7217ac63b67))
* **cards:** redesign kc-choice — select+Submit, list-only, unified allowOther ([f3dd422](https://github.com/kitn-ai/ui/commit/f3dd422b3511480715a35d4f5276adfb3beeccbb))
* CDN full-chat example + web-component icon fix + curated highlighter defaults ([766b3e8](https://github.com/kitn-ai/ui/commit/766b3e8d8211abce9e7c41e823afb570243e6111))
* **chat:** suggestions default to empty-thread, add persistSuggestions (U5) ([82e6c61](https://github.com/kitn-ai/ui/commit/82e6c61b34f95d473a28bcbcc400a5b6cbb223c0))
* child-elements reference doc, prompt-input toolbar &lt;kc-action&gt; composition, Patterns Usage tabs ([ffedb99](https://github.com/kitn-ai/ui/commit/ffedb99b440dcc9e67d3776ed1889e30ab9d2df1))
* **code-block:** radius CSS var + Vue/Svelte highlighting ([e8762bd](https://github.com/kitn-ai/ui/commit/e8762bdbc8825ce99d9b0f624f0bfc135bdb28e1))
* composable web-component layer — DIY accessible primitives, React wrappers, Storybook/docs, llms.txt ([501e7db](https://github.com/kitn-ai/ui/commit/501e7db4aa6b1861fd6981f4d167f03836b929ed))
* composite gaps — prompt-input stoppable/kc-stop, context thresholds, sources numbered, kc-scroll-button ([6baa261](https://github.com/kitn-ai/ui/commit/6baa2616317b98f561efabad222d9c9d563b5d89))
* composition path (declarative children) for conversations, chain-of-thought, model-switcher, skills + dual data/composition stories ([204126f](https://github.com/kitn-ai/ui/commit/204126fed6b0e6641e5f849a01442f3c8b07b31c))
* controlled sidebar collapse on kc-workspace ([44656a1](https://github.com/kitn-ai/ui/commit/44656a1fb5ee9035a0345eff200339e5e64f2642))
* declarative children for kc-suggestions (&lt;kc-suggestion&gt;) and kc-sources (&lt;kc-source&gt;) ([a29d259](https://github.com/kitn-ai/ui/commit/a29d259da8fe405b1c3da9aa2f672b283372caa0))
* **docs-site:** ChatDemo island + Drop-in chat example (Examples foundation) ([b798bf6](https://github.com/kitn-ai/ui/commit/b798bf64fe0342eba4a90f6d21e1ad600bd1295d))
* **docs-site:** conflict-free fan-out infra (glob samples + autogen sidebar) ([9346ef9](https://github.com/kitn-ai/ui/commit/9346ef949996b7c258564ebc47119d38014724fb))
* **docs-site:** Examples (apps) + Patterns (segments) sections ([fe7959d](https://github.com/kitn-ai/ui/commit/fe7959d01d9a0a387844a52a84a6eb7bb4cd7455))
* **docs-site:** generic data-driven component-page machinery ([9b86564](https://github.com/kitn-ai/ui/commit/9b86564df163c5dc6a216f4bdfa87d630606bc03))
* **docs-site:** MockSite island + Support widget example ([7785d7b](https://github.com/kitn-ai/ui/commit/7785d7b5b36aa03b5a2dd2b926d9a5c6537d1975))
* **docs-site:** segmented controls, type chips, Iconify icons ([39480e5](https://github.com/kitn-ai/ui/commit/39480e51398475ec38c51ffdf579299de6bb4316))
* **docs:** add "Open an artifact from a message" pattern ([9fc220c](https://github.com/kitn-ai/ui/commit/9fc220c6f80f412b3aec4beeb88c91f98972741e))
* **docs:** align dark-mode tokens to component defaults + standardize callout blue (U1, U12) ([931cb12](https://github.com/kitn-ai/ui/commit/931cb122fe0057ba24becf3bfcb8a12ddb13b006))
* **docs:** generate llms.txt + llms-full.txt for AI-agent integration ([bd40c90](https://github.com/kitn-ai/ui/commit/bd40c90cc77f237f007d38f4a8cf816acdb19394))
* **docs:** generate web-components.md tables from element-meta (between markers) ([bf0935f](https://github.com/kitn-ai/ui/commit/bf0935fdadf065b4cc62d5aeeca5033eeba6efdc))
* **docs:** six new example apps — artifacts canvas, theme editor, models & context, knowledge base, voice, skills ([6dd9e71](https://github.com/kitn-ai/ui/commit/6dd9e7171b1413df63bd991be278777f20fe7c92))
* DX foundation — self-contained FeedbackBar, kc-action children, kebab kc- events ([0e6b82e](https://github.com/kitn-ai/ui/commit/0e6b82ef9b75c7adf9484367a9eb6172a1f45e7a))
* **elements:** add &lt;kitn-chat-workspace&gt; (list + chat + resize) ([4d6f799](https://github.com/kitn-ai/ui/commit/4d6f79980b893537f8aafc85f170dc1f574ba58a))
* **elements:** attachment support in the web-component input ([6cedda3](https://github.com/kitn-ai/ui/commit/6cedda328f783b33ff68a32cbe2717b50c1bec3b))
* **elements:** bring &lt;kitn-chat&gt; web component to full-chat parity ([dbd1c24](https://github.com/kitn-ai/ui/commit/dbd1c240cebf707a3ce10242a451936b2713c0e0))
* **elements:** composable web-component foundation + first three elements ([bb79a2a](https://github.com/kitn-ai/ui/commit/bb79a2af28c9b5892f5c491116e4a11e21f159b0))
* **elements:** declare typed Events maps on flagship facades (typed dispatch + generated detail shapes) ([a1ace5c](https://github.com/kitn-ai/ui/commit/a1ace5c317739af19c0e176893c298ef189983ac))
* **elements:** emit named type, shape, and importability for object props ([991a966](https://github.com/kitn-ai/ui/commit/991a966397e242b11f0640719f3bf4a724d82478))
* **elements:** fold SlashCommand into prompt-input + chat ([46709c8](https://github.com/kitn-ai/ui/commit/46709c8f79a3214548ec27dfd66804498710eb49))
* **elements:** generate Custom Elements Manifest from the facades ([bd9f18b](https://github.com/kitn-ai/ui/commit/bd9f18b30113405f6c8fed9efdd8df1f7f9cfecc))
* **elements:** generate typed HTMLElementTagNameMap d.ts ([9545780](https://github.com/kitn-ai/ui/commit/9545780ce5a4904da8de6df2944b5e0c211fd6f2))
* **elements:** phase 1 — message-rendering core elements ([ca26d95](https://github.com/kitn-ai/ui/commit/ca26d955ec7427c04202c3fa0ce68824a3380016))
* **elements:** phase 2 — header / meta elements ([2ea6595](https://github.com/kitn-ai/ui/commit/2ea659550eedb32e784546dbf61cdac8cb80b4b4))
* **elements:** phase 3 — input ecosystem elements ([1e09086](https://github.com/kitn-ai/ui/commit/1e09086ea9ffe82c1a540603f4b7e647d939b508))
* **elements:** phase 4 — indicators & leaf elements ([3a3b68e](https://github.com/kitn-ai/ui/commit/3a3b68ea16b4a4d066e529b83cc66118ebc4efe0))
* **elements:** typed Events maps on remaining dispatching facades ([fd292ec](https://github.com/kitn-ai/ui/commit/fd292ec3022ca7fb252b1317525d8017487380f4))
* **examples:** add React + Vite example using kitn-chat web components ([5b836bb](https://github.com/kitn-ai/ui/commit/5b836bb3e43c138b549bb276df0a43238de2ddb6))
* **examples:** add runnable Angular example app ([dab40bd](https://github.com/kitn-ai/ui/commit/dab40bdd8972819a99b54df1fae7909f6710224d))
* **examples:** add runnable Vue example app ([97e9495](https://github.com/kitn-ai/ui/commit/97e94955be09470d2b1dffc3e209a8796d0e6245))
* **examples:** add SolidJS primitives example (Vite + Tailwind v4) ([6dea25f](https://github.com/kitn-ai/ui/commit/6dea25f979fc2cf00e0b147e838fd3f3030039a9))
* **examples:** docked, collapsible event console in the showcase ([25923ec](https://github.com/kitn-ai/ui/commit/25923ec2b79b587f774175f5c5d6a519541f5526))
* full story parity for &lt;kitn-chat&gt; (header, model switcher, context, scroll button, toolbar) ([aae1541](https://github.com/kitn-ai/ui/commit/aae15414bc82a35bb53ce3372947bb7087b926c0))
* **gen:** add composedFrom links + component tokens to element spec ([04886b8](https://github.com/kitn-ai/ui/commit/04886b87a67b72f8390d391a4413497c2e0fc98b))
* **gen:** extract prop defaults + always emit element-meta.json ([1463793](https://github.com/kitn-ai/ui/commit/14637936022b9db8ae9954ddd672edc881c02c3d))
* header-composition kit — kc-switch, kc-chat header slots, grouped model-switcher ([0519b57](https://github.com/kitn-ai/ui/commit/0519b57da687af41d967d61bf799b665f535acd5))
* kc-message/kc-chat actions reveal, avatar payload, custom actions ([3fa7cd6](https://github.com/kitn-ai/ui/commit/3fa7cd673109cc03a522b71b62128af5b9e4a321))
* **pdf-preview:** config + enable/reset primitive scaffold ([49a0b87](https://github.com/kitn-ai/ui/commit/49a0b870f338df11df4ecef86c73a99ff404dff8))
* **pdf-preview:** export configurePdfPreview from the barrel ([8be2e6d](https://github.com/kitn-ai/ui/commit/8be2e6d6fbd8a10711598f8875da323f676858c8))
* **pdf-preview:** on-demand pdf.js loader + renderPdfInto ([c55b43e](https://github.com/kitn-ai/ui/commit/c55b43ea796c4ed16fd964dc024592c065943fa7))
* **primitives:** shared use-resize-observer; reasoning.tsx consumes it ([a42baec](https://github.com/kitn-ai/ui/commit/a42baecd1490c2c2ed1373259c942d1ea9f92cc9))
* **prompt-input:** disabled state + leading/trailing slots (U3, U9) ([d12dc4e](https://github.com/kitn-ai/ui/commit/d12dc4ee56399adefbb69fe688e9af9353b8bcc8))
* **prompt-input:** disallow leading whitespace in the prompt ([0ce580b](https://github.com/kitn-ai/ui/commit/0ce580b5783602b2999f38aab3eac6e8678330a4))
* **prompt-input:** insert slash command on select; configurable suggestion submit ([4229d6b](https://github.com/kitn-ai/ui/commit/4229d6bbf4b8bf3e8cb68173c86099332f774ec4))
* **react:** generated typed React wrappers (@kitnai/chat/react) ([faa4da4](https://github.com/kitn-ai/ui/commit/faa4da432b28f6bfce116e08376012a2648c8ab6))
* **react:** wrapper verification, native-style examples/react demo, React wrapper tests ([b142cb6](https://github.com/kitn-ai/ui/commit/b142cb6a1e10a59abaa3ea38d4f076cc653864e2))
* **remote:** &lt;kc-remote-card&gt; element facade ([bdd6626](https://github.com/kitn-ai/ui/commit/bdd6626e662554da62878f3d564398a00e5e1669))
* **remote:** AG-UI iframe transport — Phase 1 (host SDK + provider runtime + kc-remote) ([3388cb5](https://github.com/kitn-ai/ui/commit/3388cb5a869762dec1b54cd407ae4dd339e87799))
* **remote:** AG-UI iframe transport — Phase 2 (cross-origin tests, CI, stories, docs) ([dfe6e5c](https://github.com/kitn-ai/ui/commit/dfe6e5ca4e9947afe16baf9a32a5626e1f8a322b))
* **remote:** host embed SDK (mountRemoteCard + bridge state machine) ([c8f1ce7](https://github.com/kitn-ai/ui/commit/c8f1ce76fa158de5aa3aeea68fd2ee2138a1353d))
* **remote:** inbound validation (proto-pollution + known-verb guards) ([b75ff85](https://github.com/kitn-ai/ui/commit/b75ff85e2cedb8c90e176656fb52d117a94a0986))
* **remote:** origin guards, cross-origin precondition, log redaction ([6fa093e](https://github.com/kitn-ai/ui/commit/6fa093ec73182cc0da5e10ee8b3d698e5d22ad60))
* **remote:** provider iframe runtime (createCardBridge + RemoteCardRenderer) ([0b2dbb7](https://github.com/kitn-ai/ui/commit/0b2dbb7cd3ba8ab4268ad85b9528960a5bcecf86))
* **remote:** public host + provider entry points ([e99e463](https://github.com/kitn-ai/ui/commit/e99e46392c78a26e7e7df89cc569cd0d28085fde))
* **remote:** version negotiation (validated, highest-common) ([9bc4266](https://github.com/kitn-ai/ui/commit/9bc42662f7446443f9da46fd22ab9c0d95e775eb))
* **remote:** wire protocol types + packer + direction guard ([9cd4004](https://github.com/kitn-ai/ui/commit/9cd4004082c7c5086ed512d7da67c812d8bb84d6))
* rename element prefix kc- → kai- (Phase 1: tags + events) ([f1d2678](https://github.com/kitn-ai/ui/commit/f1d2678c6c9b8df85ad871ef026d2768dac1faa0))
* rename token prefix --kc- → --kai- + finish kc- migration (Phase 2) ([19bf84d](https://github.com/kitn-ai/ui/commit/19bf84d56fe15b854bf8108ca063fff82cf0298a))
* **resizable-ui:** Solid Resizable maximizedIndex/onMaximizeChange parity ([17f9b62](https://github.com/kitn-ai/ui/commit/17f9b629f4cbe8d24420aca437ff54860c950dfd))
* **resizable:** &lt;kc-resizable&gt; panel layout + level up the primitives ([7abc84b](https://github.com/kitn-ai/ui/commit/7abc84b6b2c432bef47c10c31bad75e3e4d99986))
* **resizable:** &lt;kc-resizable&gt; panel layout + level up the primitives ([656adeb](https://github.com/kitn-ai/ui/commit/656adebc5c19c8349b885b7e6170c83158dd342c))
* **resizable:** Escape-to-restore, auto-restore on item removal, nested stopPropagation ([4f2c1f1](https://github.com/kitn-ai/ui/commit/4f2c1f129ab920b3b0399a7a964ed6dc8f8a0ee6))
* **resizable:** kc-maximize-intent listener + stash/restore core ([fe0780e](https://github.com/kitn-ai/ui/commit/fe0780edfc3a925a90df480cf6d77db39b5aa097))
* **resizable:** maximize protocol types + ambient host API typing ([f03d2ae](https://github.com/kitn-ai/ui/commit/f03d2aee34ee6fe5b6f2f796be2cf8a6fecf9344))
* **resizable:** maximizedIndex prop + maximize/restore methods + maximizechange ([5ba03ff](https://github.com/kitn-ai/ui/commit/5ba03ff11fdcb3142adf1a1637aed0239b9a269d))
* slash-command composition, Solid usage tabs, Anatomy sections, Using-with-AI doc ([0438453](https://github.com/kitn-ai/ui/commit/043845347c50a0292a8347b5ed56b9b43306d616))
* **spec:** add Svelte usage tab + CDN-based HTML snippet ([8c23189](https://github.com/kitn-ai/ui/commit/8c231897b8b45d072d737f14ba570a60b7202962))
* **spec:** generate displayName for every element ([d5ea56e](https://github.com/kitn-ai/ui/commit/d5ea56eaee90d32d0ee4774858e288ae8b8e8c0d))
* **spec:** generate per-framework usage snippets ([26fa861](https://github.com/kitn-ai/ui/commit/26fa8615159d5bd6288566607fc18499eb505e8e))
* **spec:** multi-line framework usage snippets for readability ([6d03add](https://github.com/kitn-ai/ui/commit/6d03addce4f658f6f71479bf407837d2b52d1880))
* **stories:** Examples/ composition stories (catalog, composed shell, choosing-components) ([233858e](https://github.com/kitn-ai/ui/commit/233858ec4e04c342e36e623c97c10cca965824a0))
* **stories:** Examples/Catalog + Choosing-components overview (web components) ([10d2e81](https://github.com/kitn-ai/ui/commit/10d2e815250cd4d70091296cf1cd68af4b3ece23))
* **stories:** Examples/Composed chat shell (compose-your-own vs drop-in) ([10abceb](https://github.com/kitn-ai/ui/commit/10abcebc2e0303e3ea5bd829aa482fe45eb5eff1))
* **storybook:** API spec page + live Controls on flagship element stories ([96c1d8a](https://github.com/kitn-ai/ui/commit/96c1d8a8dcefe066e5ebb3d42afc968b6c638f79))
* **storybook:** API spec page on attachments/chain-of-thought/chat-scope-picker/checkpoint/code-block/context-meter element stories ([7dbfc0f](https://github.com/kitn-ai/ui/commit/7dbfc0ff97e2a09e5c649faef8300e372b916fd2))
* **storybook:** API spec page on empty/feedback-bar/file-upload/image/loader/markdown element stories ([9b4dd9f](https://github.com/kitn-ai/ui/commit/9b4dd9f74b272ba4094253e96c03f249ca2af754))
* **storybook:** API spec page on message-skills/message/model-switcher/prompt-suggestions/reasoning/response-stream element stories ([fd06dcc](https://github.com/kitn-ai/ui/commit/fd06dcc280a9f3c2430428f77ebab66e16d4dcd8))
* **storybook:** API spec page on source-list/source/text-shimmer/thinking-bar/tool/voice-input element stories ([6f2d3bd](https://github.com/kitn-ai/ui/commit/6f2d3bd8d0351db0966d4ba74ef8f253b11d1b52))
* **storybook:** ElementSpec doc-component + argTypesFor controls helper ([bb1ea25](https://github.com/kitn-ai/ui/commit/bb1ea25d8433825f4e437cb1b3fdfd25b35ae4f8))
* **storybook:** hide the SolidJS (advanced) tier from the default sidebar ([ca692a5](https://github.com/kitn-ai/ui/commit/ca692a5ad2cdf8218e99f20dd31690555c17796f))
* **storybook:** per-framework usage code-tabs on the API tab ([9d57949](https://github.com/kitn-ai/ui/commit/9d57949dca531bba707d3d70d5cd98f30a0bb5a0))
* **storybook:** sidebar IA — Web Components first, Examples by importance ([da44605](https://github.com/kitn-ai/ui/commit/da446059487a2a910a1f03bbcf37d211edcc7905))
* **storybook:** SolidJS tier always present + collapsed (drop hide+toggle) ([61e03bc](https://github.com/kitn-ai/ui/commit/61e03bc46fb222f9f8b4103fcfa457b9945a238b))
* **storybook:** toolbar toggle to reveal the SolidJS (advanced) tier ([1163f0c](https://github.com/kitn-ai/ui/commit/1163f0c00d4f19e8b474e8c6bcf4938c2f607734))
* **theme:** add font, tracking, and shadow-color tokens ([2368b5e](https://github.com/kitn-ai/ui/commit/2368b5e9a86804686ec9fbe5b00995961c92328f))
* **theme:** controlled blue focus ring across all components ([603e3c4](https://github.com/kitn-ai/ui/commit/603e3c41f929cf4104763d47c019c2923c615b2d))
* **theme:** custom cross-platform scrollbars (thin, rounded, subtle, themed) ([ae9b83b](https://github.com/kitn-ai/ui/commit/ae9b83b55da50149fd863ea694417a7e9e51e328))
* **theme:** ship browser-ready theme.tokens.css for &lt;link&gt;/CDN consumers ([2ec93c4](https://github.com/kitn-ai/ui/commit/2ec93c459a325a0414ba345019bacdc57d99794f))
* **theme:** tokenized typography scale + consistent component sizing ([4dc46e2](https://github.com/kitn-ai/ui/commit/4dc46e2fd271803d73de42beec6ce0da22f8411a))
* **ui:** add @floating-ui/dom dep + createPresence overlay primitive ([a327a7c](https://github.com/kitn-ai/ui/commit/a327a7cd9fd1d90ed2fcdb13582f2a463d3846fa))
* **ui:** add usePosition (autoUpdate) + useDismiss + As to overlay core ([a459ec5](https://github.com/kitn-ai/ui/commit/a459ec5e872d5982734cc9fe272a524864bffa1c))
* **ui:** emit data-state on Collapsible root/trigger so consumer chevron-rotation classes work ([f4be7ad](https://github.com/kitn-ai/ui/commit/f4be7ad41550c17a92dc8dbb14ebc0be7ac03d8b))
* **ui:** HoverCard placement prop; kc-choice preview right-start + larger ([9897759](https://github.com/kitn-ai/ui/commit/9897759a70403451727060efa1e2bcce2cae7bc6))
* **ui:** reimplement Collapsible without Kobalte (grid-rows anim, inert on close) ([c9ae2a7](https://github.com/kitn-ai/ui/commit/c9ae2a71041998ab496c065eef3fce2e5910ea5c))
* **ui:** reimplement Dropdown menu on overlay core (roving focus, typeahead, no scroll-lock, follows scroll) ([3575b7c](https://github.com/kitn-ai/ui/commit/3575b7c35b699526f31f598339f98dbca34e47ee))
* **ui:** reimplement HoverCard with deterministic shared-timer machine (HC-1); migrate context.tsx ([968a1b4](https://github.com/kitn-ai/ui/commit/968a1b4af2bdf6e894d736de187d71a38dbc1cf7))
* **ui:** reimplement Tooltip on overlay core (role=tooltip, aria-describedby) ([b06c4f5](https://github.com/kitn-ai/ui/commit/b06c4f56a16913e2b98f12ece4da71fab5f106b7))
* **ui:** remove @kobalte/core dependency (replaced by DIY overlay primitives) ([a1b9e1f](https://github.com/kitn-ai/ui/commit/a1b9e1ff826eea380c50581b46fcd035594ed2cb))


### Bug Fixes

* **a11y,examples:** darken showcase --muted token to meet AA (0 axe violations, light+dark) ([18577be](https://github.com/kitn-ai/ui/commit/18577bee0859c91da1c026a72444cd237b08a337))
* **a11y,examples:** keyboard-accessible event log (scrollable-region) + update bundle figure to ~80kb ([503e821](https://github.com/kitn-ai/ui/commit/503e8218a12a906d7acea95b62651449e1d151e1))
* **a11y:** accessible names on icon buttons + visible focus (WCAG 2.1 AA, A1/A3) ([812348a](https://github.com/kitn-ai/ui/commit/812348a28f65b518c8c33d8acf7d22d0881fcb9c))
* **a11y:** brighten destructive red in dark across the cards ([1163995](https://github.com/kitn-ai/ui/commit/1163995295591581540cb42ac9a00a0763c6653e))
* **a11y:** darken light-mode --color-destructive for WCAG contrast ([a245236](https://github.com/kitn-ai/ui/commit/a245236ff96a3fd4874d1bc26b5decfac43fde9a))
* **a11y:** gate Storybook a11y to error (code-block + checkpoint fixes + scoped Shiki exception) ([2f367d9](https://github.com/kitn-ai/ui/commit/2f367d9a544773514e5dbb01ea53a14867baad9c))
* **a11y:** keyboard-focusable code scroll region + named icon-only checkpoint ([7d1d7cd](https://github.com/kitn-ai/ui/commit/7d1d7cdeaeb41753f0a3fc2544ee621818376a3a))
* **a11y:** label icon buttons/selects + fix contrast in story fixtures ([b1b464e](https://github.com/kitn-ai/ui/commit/b1b464e535b64188d057fa9dad7ae78408dd6334))
* **a11y:** raise muted/subtle text contrast to WCAG 2.1 AA (A2, light+dark) ([0668785](https://github.com/kitn-ai/ui/commit/06687852c8c8bf675e8c6f7a7564d8671874c40a))
* **a11y:** WCAG AA fixes across component library + story fixtures ([994e738](https://github.com/kitn-ai/ui/commit/994e738c02e4377b00cbbf66b53fe86ebfb94fa8))
* **a11y:** WCAG AA fixes in component library (axe-clean) ([7a18461](https://github.com/kitn-ai/ui/commit/7a18461d20f00120aa249228c40041279229f867))
* **artifact:** keep Preview/Code tabs right-aligned without a path field (U13) ([9c18e74](https://github.com/kitn-ai/ui/commit/9c18e74fee21501eefbae0d6c81d80fd0e04ab46))
* **artifact:** make inline PDF scroll region keyboard-focusable ([767ce31](https://github.com/kitn-ai/ui/commit/767ce310557b907f270a2d95ace0e0c72a01a183))
* **attachments:** hover-card layout + reactive variant in kc-attachments ([#78](https://github.com/kitn-ai/ui/issues/78)) ([683a02e](https://github.com/kitn-ai/ui/commit/683a02ee0a7311e9673d0e45636fa9c1614bd2c8))
* **build:** minify ES lib chunks via generateBundle esbuild pass ([ff49688](https://github.com/kitn-ai/ui/commit/ff49688475f1cde620314e2d49a5195f33b1b0f9))
* **build:** minify the library bundle (Vite skips minify for ESM lib builds) ([13cb3f5](https://github.com/kitn-ai/ui/commit/13cb3f5514f7a56967503bece53d0ed9d5f93f6a))
* **cards:** &lt;kc-cards&gt; reads policy at event-time + inline types prop; soften streaming docs ([7b384a1](https://github.com/kitn-ai/ui/commit/7b384a1958bd99bf4c57080ab91b316db6fe11f7))
* **cards:** kc-choice store resolution payload consistently with the emitted event ([7012a67](https://github.com/kitn-ai/ui/commit/7012a67f1c47bf92b2c90f0f34dbd603d16bb354))
* **cards:** kc-confirm store resolution payload consistently with the emitted event ([2f05efc](https://github.com/kitn-ai/ui/commit/2f05efc21ce708d8726517255f82533cdaefa279))
* **cards:** null out native range-track border/groove ([9bda968](https://github.com/kitn-ai/ui/commit/9bda96872f439e83024ef5b24ee6e5a466277ace))
* **cards:** propagate theme to child cards reactively ([d31ac45](https://github.com/kitn-ai/ui/commit/d31ac45c44afb7a70be8b99dd90bc5e6f4116499))
* **checkpoint:** use a button factory so tooltip variant doesn't share a DOM node ([e5971c2](https://github.com/kitn-ai/ui/commit/e5971c2793b2838690171ccdcd188639c6db08e3))
* **components,examples:** font sizes, attachment layout, showcase polish ([7efd3e1](https://github.com/kitn-ai/ui/commit/7efd3e143cf4dc12fec88aecae64bfe6eacdc443))
* **conversation-list:** smaller conversation labels; docs(web-components): full API reference ([ceff6fa](https://github.com/kitn-ai/ui/commit/ceff6fa52598ba952d6b53b0bc5d4226e2071940))
* **conversation-list:** smaller labels + docs(web-components): full API reference ([e29698e](https://github.com/kitn-ai/ui/commit/e29698e4975e9b3a59a9a8fa2a112f432b6e5e91))
* **conversations:** drop the section-label background (U11) ([124c555](https://github.com/kitn-ai/ui/commit/124c555cc0d9d18effd9d2a5951360d3d54d7e02))
* **docs-site:** Components nav → first item, underline code tabs, flush code viewer ([89da0d6](https://github.com/kitn-ai/ui/commit/89da0d6378c32e176e091f24e402e4d7b65879fd))
* **docs-site:** Examples/Patterns audit fixes (Opus 8 good / 2 revise / 1 fix) ([41cf39a](https://github.com/kitn-ai/ui/commit/41cf39af084958d6d1ad38adacfea3da8c0bde27))
* **docs-site:** target .large span so sidebar size/weight actually apply ([0887e18](https://github.com/kitn-ai/ui/commit/0887e18676272fa6c27271322bb785dd3b76ff6f))
* **docs-site:** topic-based sidebars + logo layout shift ([e71d2df](https://github.com/kitn-ai/ui/commit/e71d2dfd5924ceff699ad67a444b68e83e743ad0))
* **docs:** bare React names in llms.txt headers; hide API tab on SolidJS Overview ([bca01d9](https://github.com/kitn-ai/ui/commit/bca01d981e8ef779e204c32c7f16ba13909ab59a))
* **docs:** knowledge-base preview layout — wrap multi-child resizable items (U21) ([ea6435c](https://github.com/kitn-ai/ui/commit/ea6435c017786f77dcb745e408248237a3f3468e))
* **docs:** render payloadless event detail as — (not Record&lt;string, never&gt;) ([c32c436](https://github.com/kitn-ai/ui/commit/c32c436968556b9a2546c1afc1de478ba1a00a2a))
* **docs:** web-components.md headers use bare React wrapper names ([59a52ec](https://github.com/kitn-ai/ui/commit/59a52ec58a446643d5268a85e58bd95c6740258d))
* **elements:** apply flag() to existing element booleans + docs ([9cdc85b](https://github.com/kitn-ai/ui/commit/9cdc85bc0c37c2b1c7405fae5a6178c0a3898d00))
* **elements:** inherited text color follows light/dark (attachment labels, etc.) ([e39dc1a](https://github.com/kitn-ai/ui/commit/e39dc1a305586ef613ce470a83068bb1588f9a89))
* **elements:** inherited text color follows the element's light/dark mode ([dae7f0a](https://github.com/kitn-ai/ui/commit/dae7f0a27d6b9548e2fb4ab5ec5cb6cc4ab5aaca))
* **elements:** make --color-*/--text-* overridable from :root in shadow DOM ([b6b998e](https://github.com/kitn-ai/ui/commit/b6b998e8b19eda6c9c944deeb6768ab2e3869689))
* **elements:** preserve chat draft across kitn-chat-workspace sidebar toggle ([339aa9e](https://github.com/kitn-ai/ui/commit/339aa9e59bb88c44e2ab6b780d21a22ee67eec51))
* **examples:** composable showcase follows OS dark mode on first paint ([518bd56](https://github.com/kitn-ai/ui/commit/518bd56930fcba8844821ca302c8643c38a56bbe))
* **examples:** correct Conversations event prop + Vue isCustomElement prefix ([ac55680](https://github.com/kitn-ai/ui/commit/ac556808e4eaed27f07eca1681f8dc065d51c72f))
* **highlighter:** highlight TypeScript/TSX by default ([5686b4a](https://github.com/kitn-ai/ui/commit/5686b4a5ea4f9c8ccac3f8848126d9533ddd939f))
* **highlighter:** highlight TypeScript/TSX by default ([896a103](https://github.com/kitn-ai/ui/commit/896a10329b2f39183a137bfb46fde62587daaaab))
* missed camelCase data-attrs (kcRemoteFallback → kai) ([5c22cf4](https://github.com/kitn-ai/ui/commit/5c22cf42059480627788ab463e5f2da68dd61bff))
* **overlay:** hide floating panels when the trigger scrolls out of view ([6562da8](https://github.com/kitn-ai/ui/commit/6562da830865dfefaa381cd631971d94c38f6445))
* **popover:** default the panel to a compact text-sm ([b6c1220](https://github.com/kitn-ai/ui/commit/b6c122082359e47678a0a40abe36f6bf37845f04))
* **prompt-input:** typed text uses foreground, not the brand color ([042efe9](https://github.com/kitn-ai/ui/commit/042efe9cfb1edfe168e2e5c70260def4ad6ee6c8))
* **remote:** deployed kc-remote stories render the real card (theme-aware) ([cfd3d45](https://github.com/kitn-ai/ui/commit/cfd3d450089e77161ad6a8bbb6b411e05bde2b8f))
* **remote:** deployed kc-remote stories render the real card directly (theme-aware); extract provider renderers ([d4f9f9f](https://github.com/kitn-ai/ui/commit/d4f9f9fec11a77a42d0414e957ca2448632cd878))
* **remote:** kc-remote reacts to theme changes; document remount-on-theme; reconcile spec ([0e2c0c6](https://github.com/kitn-ai/ui/commit/0e2c0c64fdf406a5c21d261e665569ca3548dbba))
* **remote:** kc-remote stories degrade gracefully on deployed Storybook ([d488035](https://github.com/kitn-ai/ui/commit/d48803522c1d24d3bb66b9d51a223abdf55abddf))
* **remote:** kc-remote stories degrade gracefully on static/deployed Storybook ([923688d](https://github.com/kitn-ai/ui/commit/923688d0a19b22a4025632a8e83eda27be03455d))
* **remote:** re-render on context only when theme changes (silent token/locale refresh) ([175db26](https://github.com/kitn-ai/ui/commit/175db26c8ba73529b641a25afd255c32a9b0178f))
* **remote:** restart resize observer per mount; guard message handler from throws ([2b0e3e8](https://github.com/kitn-ai/ui/commit/2b0e3e8bcdb647218f68f64da4f8d4843c1dab8d))
* **remote:** restrict pre-OPEN buffering to connecting state; harden Retry ([350e3ce](https://github.com/kitn-ai/ui/commit/350e3cec7e0f11ae1d4ce2453cf27ac5d5ac8830))
* rename missed camelCase data-attrs kcRemoteFallback/kcBound → kai ([f404bbf](https://github.com/kitn-ai/ui/commit/f404bbf3486780e00d613ce21bc90aa08d07a07e))
* **resizable:** element-keyed maximize stash (index-drift) + remove dead guards ([bb6a99b](https://github.com/kitn-ai/ui/commit/bb6a99b1325830d7662517f4376c9fe63ea57899))
* **resizable:** keep dragging when sizes persist mid-drag ([7a0458e](https://github.com/kitn-ai/ui/commit/7a0458e0e27dba2fecc46eafcc39b21ffffb47bb))
* **resizable:** preserve dragged sizes across content changes + dbl-click restore (U10) ([ed46578](https://github.com/kitn-ai/ui/commit/ed46578f876aa70b3f273c655bd5a49e025d0be0))
* **spec:** narrow framework-usage catch to ENOENT; skip empty html script block ([b1e30c9](https://github.com/kitn-ai/ui/commit/b1e30c9c6c6a3461c46146148e669a4eabbd219b))
* **stories:** artifact fixtures 404 on GitHub Pages (root-absolute base path) ([9e00e4f](https://github.com/kitn-ai/ui/commit/9e00e4f65d28ec0ad6057b547df54300d7c4d819))
* **stories:** drop duplicate kc-artifact JSX decl (use artifact.stories augmentation) ([0202077](https://github.com/kitn-ai/ui/commit/02020772208654f3efcd9e3f6239eecd4e627360))
* **stories:** infer boolean/select controls from element-meta type strings ([2ad2d39](https://github.com/kitn-ai/ui/commit/2ad2d393ecc7290c71af64b9ef7a84ce4e5c7e25))
* **stories:** infer boolean/select controls from element-meta type strings ([4d7a4ed](https://github.com/kitn-ai/ui/commit/4d7a4edcfef62e3fe6e1bc0ae7a73421fa4bf755))
* **storybook:** block-display code pre, reconcile framework tab state ([31bc267](https://github.com/kitn-ai/ui/commit/31bc267858ff2501b574dc7025b8f60793fdeace))
* **storybook:** show Canvas + API tabs only on component stories, Docs-only on doc pages ([c7d9c8d](https://github.com/kitn-ai/ui/commit/c7d9c8d98de85700e0d35bc2e7ccf0e7b56458a2))
* **storybook:** slash-free API tab id to satisfy aria-controls (axe) ([c29ff8e](https://github.com/kitn-ai/ui/commit/c29ff8e5ccea19dced8b4fbcacd6b8c2642ecfb7))
* **theme:** harmonize dark surface tokens with the warm background ([6022492](https://github.com/kitn-ai/ui/commit/60224927beebdc1586afaf1e867476524e96aec0))
* **ui:** dropdown roving focus works inside Shadow DOM ([58c4096](https://github.com/kitn-ai/ui/commit/58c4096a750f8427663bc7e66b554fe158023d26))
* **ui:** dropdown Tab closes without stealing focus; skip disabled items; clarify focus timing ([46df213](https://github.com/kitn-ai/ui/commit/46df213d2b39726fecf551cc41099dc87280d284))
* **ui:** gate Tooltip content on presence so exit animation plays; await async unmount in test ([1a12a6e](https://github.com/kitn-ai/ui/commit/1a12a6e1b5713381d5c0698f1f40ade8e53d05de))
* **ui:** guard createPresence microtask close; broaden setRef type; add docs + tests ([11b0d65](https://github.com/kitn-ai/ui/commit/11b0d652d2599f708a196bc5d4ac366d73e870e3))
* **ui:** harden Collapsible prop forwarding (id/onClick), data-closed parity, tests ([d8afc02](https://github.com/kitn-ai/ui/commit/d8afc02a191ca65e31b7b40b8950cd830802eee1))
* **ui:** hover-card safe-area (transparent-gap bridge + 300ms closeDelay) so pointer can cross to content ([726519f](https://github.com/kitn-ai/ui/commit/726519f14e8deafeed5abd65a96c87d6bf7a06de))
* **ui:** make tooltip/hover-card refs reactive so floating position computes (C-1); hover-card focus persistence + instant Escape ([8ab1f70](https://github.com/kitn-ai/ui/commit/8ab1f704b2ef3d4ff8060f0274de6fc75a3fe4a0))
* **ui:** register custom text-* size utilities with tailwind-merge; explicit thinking-bar size ([09e4e7e](https://github.com/kitn-ai/ui/commit/09e4e7e4a61a7417d4ca4e4cbdd0c9b56e7a31d2))
* **ui:** tooltip stays open while focused or hovered; clean up hover timer ([0264710](https://github.com/kitn-ai/ui/commit/0264710673a646bd98eb5e74980fe3052307f40a))


### Miscellaneous Chores

* **release:** rename npm scope @kitnai/chat → [@kitn](https://github.com/kitn).ai/chat ([633b345](https://github.com/kitn-ai/ui/commit/633b345f40384dd1dcc2b13156119dbdaf451bd5))


### Code Refactoring

* **events:** feedback-bar onFeedback + kc-conversations conversationselect ([e801740](https://github.com/kitn-ai/ui/commit/e801740993d8914b957caf945fbfd23a6f4b612f))

## [0.14.1](https://github.com/kitn-ai/chat/compare/@kitn.ai/chat-v0.14.0...@kitn.ai/chat-v0.14.1) (2026-06-18)


### Bug Fixes

* **prompt-input:** typed text uses foreground, not the brand color ([042efe9](https://github.com/kitn-ai/chat/commit/042efe9cfb1edfe168e2e5c70260def4ad6ee6c8))

## [0.14.0](https://github.com/kitn-ai/chat/compare/@kitn.ai/chat-v0.13.0...@kitn.ai/chat-v0.14.0) (2026-06-18)


### ⚠ BREAKING CHANGES

* `sidebarCollapsed` no longer just seeds the initial state — when set it now controls the sidebar (the element won't self-toggle away from it). To start collapsed but keep the element managing it, use `defaultSidebarCollapsed` (or the `default-sidebar-collapsed` attribute).
* composite gaps — prompt-input stoppable/kc-stop, context thresholds, sources numbered, kc-scroll-button
* DX foundation — self-contained FeedbackBar, kc-action children, kebab kc- events

### Features

* add kc-popover element (button + popover card primitive) ([5095c59](https://github.com/kitn-ai/chat/commit/5095c596c481122eeac829ad0e23c4c435295af1))
* **chat:** suggestions default to empty-thread, add persistSuggestions (U5) ([82e6c61](https://github.com/kitn-ai/chat/commit/82e6c61b34f95d473a28bcbcc400a5b6cbb223c0))
* child-elements reference doc, prompt-input toolbar &lt;kc-action&gt; composition, Patterns Usage tabs ([ffedb99](https://github.com/kitn-ai/chat/commit/ffedb99b440dcc9e67d3776ed1889e30ab9d2df1))
* **code-block:** radius CSS var + Vue/Svelte highlighting ([e8762bd](https://github.com/kitn-ai/chat/commit/e8762bdbc8825ce99d9b0f624f0bfc135bdb28e1))
* composite gaps — prompt-input stoppable/kc-stop, context thresholds, sources numbered, kc-scroll-button ([6baa261](https://github.com/kitn-ai/chat/commit/6baa2616317b98f561efabad222d9c9d563b5d89))
* composition path (declarative children) for conversations, chain-of-thought, model-switcher, skills + dual data/composition stories ([204126f](https://github.com/kitn-ai/chat/commit/204126fed6b0e6641e5f849a01442f3c8b07b31c))
* controlled sidebar collapse on kc-workspace ([44656a1](https://github.com/kitn-ai/chat/commit/44656a1fb5ee9035a0345eff200339e5e64f2642))
* declarative children for kc-suggestions (&lt;kc-suggestion&gt;) and kc-sources (&lt;kc-source&gt;) ([a29d259](https://github.com/kitn-ai/chat/commit/a29d259da8fe405b1c3da9aa2f672b283372caa0))
* **docs-site:** ChatDemo island + Drop-in chat example (Examples foundation) ([b798bf6](https://github.com/kitn-ai/chat/commit/b798bf64fe0342eba4a90f6d21e1ad600bd1295d))
* **docs-site:** conflict-free fan-out infra (glob samples + autogen sidebar) ([9346ef9](https://github.com/kitn-ai/chat/commit/9346ef949996b7c258564ebc47119d38014724fb))
* **docs-site:** Examples (apps) + Patterns (segments) sections ([fe7959d](https://github.com/kitn-ai/chat/commit/fe7959d01d9a0a387844a52a84a6eb7bb4cd7455))
* **docs-site:** generic data-driven component-page machinery ([9b86564](https://github.com/kitn-ai/chat/commit/9b86564df163c5dc6a216f4bdfa87d630606bc03))
* **docs-site:** MockSite island + Support widget example ([7785d7b](https://github.com/kitn-ai/chat/commit/7785d7b5b36aa03b5a2dd2b926d9a5c6537d1975))
* **docs-site:** segmented controls, type chips, Iconify icons ([39480e5](https://github.com/kitn-ai/chat/commit/39480e51398475ec38c51ffdf579299de6bb4316))
* **docs:** add "Open an artifact from a message" pattern ([9fc220c](https://github.com/kitn-ai/chat/commit/9fc220c6f80f412b3aec4beeb88c91f98972741e))
* **docs:** align dark-mode tokens to component defaults + standardize callout blue (U1, U12) ([931cb12](https://github.com/kitn-ai/chat/commit/931cb122fe0057ba24becf3bfcb8a12ddb13b006))
* **docs:** six new example apps — artifacts canvas, theme editor, models & context, knowledge base, voice, skills ([6dd9e71](https://github.com/kitn-ai/chat/commit/6dd9e7171b1413df63bd991be278777f20fe7c92))
* DX foundation — self-contained FeedbackBar, kc-action children, kebab kc- events ([0e6b82e](https://github.com/kitn-ai/chat/commit/0e6b82ef9b75c7adf9484367a9eb6172a1f45e7a))
* **elements:** emit named type, shape, and importability for object props ([991a966](https://github.com/kitn-ai/chat/commit/991a966397e242b11f0640719f3bf4a724d82478))
* header-composition kit — kc-switch, kc-chat header slots, grouped model-switcher ([0519b57](https://github.com/kitn-ai/chat/commit/0519b57da687af41d967d61bf799b665f535acd5))
* **prompt-input:** disabled state + leading/trailing slots (U3, U9) ([d12dc4e](https://github.com/kitn-ai/chat/commit/d12dc4ee56399adefbb69fe688e9af9353b8bcc8))
* slash-command composition, Solid usage tabs, Anatomy sections, Using-with-AI doc ([0438453](https://github.com/kitn-ai/chat/commit/043845347c50a0292a8347b5ed56b9b43306d616))
* **theme:** add font, tracking, and shadow-color tokens ([2368b5e](https://github.com/kitn-ai/chat/commit/2368b5e9a86804686ec9fbe5b00995961c92328f))


### Bug Fixes

* **artifact:** keep Preview/Code tabs right-aligned without a path field (U13) ([9c18e74](https://github.com/kitn-ai/chat/commit/9c18e74fee21501eefbae0d6c81d80fd0e04ab46))
* **attachments:** hover-card layout + reactive variant in kc-attachments ([#78](https://github.com/kitn-ai/chat/issues/78)) ([683a02e](https://github.com/kitn-ai/chat/commit/683a02ee0a7311e9673d0e45636fa9c1614bd2c8))
* **cards:** propagate theme to child cards reactively ([d31ac45](https://github.com/kitn-ai/chat/commit/d31ac45c44afb7a70be8b99dd90bc5e6f4116499))
* **conversations:** drop the section-label background (U11) ([124c555](https://github.com/kitn-ai/chat/commit/124c555cc0d9d18effd9d2a5951360d3d54d7e02))
* **docs-site:** Components nav → first item, underline code tabs, flush code viewer ([89da0d6](https://github.com/kitn-ai/chat/commit/89da0d6378c32e176e091f24e402e4d7b65879fd))
* **docs-site:** Examples/Patterns audit fixes (Opus 8 good / 2 revise / 1 fix) ([41cf39a](https://github.com/kitn-ai/chat/commit/41cf39af084958d6d1ad38adacfea3da8c0bde27))
* **docs-site:** target .large span so sidebar size/weight actually apply ([0887e18](https://github.com/kitn-ai/chat/commit/0887e18676272fa6c27271322bb785dd3b76ff6f))
* **docs-site:** topic-based sidebars + logo layout shift ([e71d2df](https://github.com/kitn-ai/chat/commit/e71d2dfd5924ceff699ad67a444b68e83e743ad0))
* **docs:** knowledge-base preview layout — wrap multi-child resizable items (U21) ([ea6435c](https://github.com/kitn-ai/chat/commit/ea6435c017786f77dcb745e408248237a3f3468e))
* **overlay:** hide floating panels when the trigger scrolls out of view ([6562da8](https://github.com/kitn-ai/chat/commit/6562da830865dfefaa381cd631971d94c38f6445))
* **popover:** default the panel to a compact text-sm ([b6c1220](https://github.com/kitn-ai/chat/commit/b6c122082359e47678a0a40abe36f6bf37845f04))
* **resizable:** keep dragging when sizes persist mid-drag ([7a0458e](https://github.com/kitn-ai/chat/commit/7a0458e0e27dba2fecc46eafcc39b21ffffb47bb))
* **resizable:** preserve dragged sizes across content changes + dbl-click restore (U10) ([ed46578](https://github.com/kitn-ai/chat/commit/ed46578f876aa70b3f273c655bd5a49e025d0be0))

## [0.13.0](https://github.com/kitn-ai/chat/compare/@kitn.ai/chat-v0.12.0...@kitn.ai/chat-v0.13.0) (2026-06-15)


### ⚠ BREAKING CHANGES

* ChatMessage.actions widens to (ChatMessageAction | CustomAction)[] and the messageaction event `action` is now `string` (built-in name or custom id).

### Features

* kc-message/kc-chat actions reveal, avatar payload, custom actions ([3fa7cd6](https://github.com/kitn-ai/chat/commit/3fa7cd673109cc03a522b71b62128af5b9e4a321))

## [0.12.0](https://github.com/kitn-ai/chat/compare/@kitn.ai/chat-v0.11.0...@kitn.ai/chat-v0.12.0) (2026-06-15)


### Features

* **cards:** add applyResolution round-trip helper ([dde21e3](https://github.com/kitn-ai/chat/commit/dde21e30c5eb4ee083d2b0089af5214b7ecb67d0))
* **cards:** add CardResolution re-hydration field to the card contract ([d15e743](https://github.com/kitn-ai/chat/commit/d15e7432b21a3b02f831990b96537c0238e1460d))
* **cards:** add useCardResolution controller (prop &gt; optimistic precedence) ([c2a161b](https://github.com/kitn-ai/chat/commit/c2a161b4bdbcc67d514babad2c7d9addb8dcf7bc))
* **cards:** chromed read-only resolved state + card-API consistency pass ([35166ee](https://github.com/kitn-ai/chat/commit/35166ee5ff05c35645d4ddb98a07f8e30539064c))
* **cards:** forward resolution through dispatcher + element facades ([0f9ea6e](https://github.com/kitn-ai/chat/commit/0f9ea6ec4b5521daa02a3b0b7f3debbdcaae11af))
* **cards:** kc-choice chromed read-only resolved state ([fb95710](https://github.com/kitn-ai/chat/commit/fb95710ed1f568469983bdce71a611975b2be781))
* **cards:** kc-choice image hover preview for small thumbnails ([e69557b](https://github.com/kitn-ai/chat/commit/e69557bddf0759f6e74d8a1167510ad673785e3a))
* **cards:** kc-confirm chromed read-only resolved state ([ba3c3a0](https://github.com/kitn-ai/chat/commit/ba3c3a0eb2a6389843ddf0b988fbb1a5abd098fa))
* **cards:** kc-form chromed read-only summary (summarizeForm + dl view) ([e43cdce](https://github.com/kitn-ai/chat/commit/e43cdcee0045b7dafb7a92d42d108bf86d09559c))
* **cards:** kc-tasks chromed read-only resolved summary ([d2a2890](https://github.com/kitn-ai/chat/commit/d2a28909ae7325869889f1756dd7fc1cce369af7))
* **cards:** redesign kc-choice — select+Submit, list-only, unified allowOther ([f3dd422](https://github.com/kitn-ai/chat/commit/f3dd422b3511480715a35d4f5276adfb3beeccbb))
* **primitives:** shared use-resize-observer; reasoning.tsx consumes it ([a42baec](https://github.com/kitn-ai/chat/commit/a42baecd1490c2c2ed1373259c942d1ea9f92cc9))
* **remote:** &lt;kc-remote-card&gt; element facade ([bdd6626](https://github.com/kitn-ai/chat/commit/bdd6626e662554da62878f3d564398a00e5e1669))
* **remote:** AG-UI iframe transport — Phase 1 (host SDK + provider runtime + kc-remote) ([3388cb5](https://github.com/kitn-ai/chat/commit/3388cb5a869762dec1b54cd407ae4dd339e87799))
* **remote:** AG-UI iframe transport — Phase 2 (cross-origin tests, CI, stories, docs) ([dfe6e5c](https://github.com/kitn-ai/chat/commit/dfe6e5ca4e9947afe16baf9a32a5626e1f8a322b))
* **remote:** host embed SDK (mountRemoteCard + bridge state machine) ([c8f1ce7](https://github.com/kitn-ai/chat/commit/c8f1ce76fa158de5aa3aeea68fd2ee2138a1353d))
* **remote:** inbound validation (proto-pollution + known-verb guards) ([b75ff85](https://github.com/kitn-ai/chat/commit/b75ff85e2cedb8c90e176656fb52d117a94a0986))
* **remote:** origin guards, cross-origin precondition, log redaction ([6fa093e](https://github.com/kitn-ai/chat/commit/6fa093ec73182cc0da5e10ee8b3d698e5d22ad60))
* **remote:** provider iframe runtime (createCardBridge + RemoteCardRenderer) ([0b2dbb7](https://github.com/kitn-ai/chat/commit/0b2dbb7cd3ba8ab4268ad85b9528960a5bcecf86))
* **remote:** public host + provider entry points ([e99e463](https://github.com/kitn-ai/chat/commit/e99e46392c78a26e7e7df89cc569cd0d28085fde))
* **remote:** version negotiation (validated, highest-common) ([9bc4266](https://github.com/kitn-ai/chat/commit/9bc42662f7446443f9da46fd22ab9c0d95e775eb))
* **remote:** wire protocol types + packer + direction guard ([9cd4004](https://github.com/kitn-ai/chat/commit/9cd4004082c7c5086ed512d7da67c812d8bb84d6))
* **spec:** add Svelte usage tab + CDN-based HTML snippet ([8c23189](https://github.com/kitn-ai/chat/commit/8c231897b8b45d072d737f14ba570a60b7202962))
* **spec:** generate displayName for every element ([d5ea56e](https://github.com/kitn-ai/chat/commit/d5ea56eaee90d32d0ee4774858e288ae8b8e8c0d))
* **spec:** generate per-framework usage snippets ([26fa861](https://github.com/kitn-ai/chat/commit/26fa8615159d5bd6288566607fc18499eb505e8e))
* **spec:** multi-line framework usage snippets for readability ([6d03add](https://github.com/kitn-ai/chat/commit/6d03addce4f658f6f71479bf407837d2b52d1880))
* **storybook:** hide the SolidJS (advanced) tier from the default sidebar ([ca692a5](https://github.com/kitn-ai/chat/commit/ca692a5ad2cdf8218e99f20dd31690555c17796f))
* **storybook:** per-framework usage code-tabs on the API tab ([9d57949](https://github.com/kitn-ai/chat/commit/9d57949dca531bba707d3d70d5cd98f30a0bb5a0))
* **storybook:** SolidJS tier always present + collapsed (drop hide+toggle) ([61e03bc](https://github.com/kitn-ai/chat/commit/61e03bc46fb222f9f8b4103fcfa457b9945a238b))
* **storybook:** toolbar toggle to reveal the SolidJS (advanced) tier ([1163f0c](https://github.com/kitn-ai/chat/commit/1163f0c00d4f19e8b474e8c6bcf4938c2f607734))
* **ui:** HoverCard placement prop; kc-choice preview right-start + larger ([9897759](https://github.com/kitn-ai/chat/commit/9897759a70403451727060efa1e2bcce2cae7bc6))


### Bug Fixes

* **cards:** kc-choice store resolution payload consistently with the emitted event ([7012a67](https://github.com/kitn-ai/chat/commit/7012a67f1c47bf92b2c90f0f34dbd603d16bb354))
* **cards:** kc-confirm store resolution payload consistently with the emitted event ([2f05efc](https://github.com/kitn-ai/chat/commit/2f05efc21ce708d8726517255f82533cdaefa279))
* **docs:** bare React names in llms.txt headers; hide API tab on SolidJS Overview ([bca01d9](https://github.com/kitn-ai/chat/commit/bca01d981e8ef779e204c32c7f16ba13909ab59a))
* **docs:** web-components.md headers use bare React wrapper names ([59a52ec](https://github.com/kitn-ai/chat/commit/59a52ec58a446643d5268a85e58bd95c6740258d))
* **examples:** correct Conversations event prop + Vue isCustomElement prefix ([ac55680](https://github.com/kitn-ai/chat/commit/ac556808e4eaed27f07eca1681f8dc065d51c72f))
* **remote:** deployed kc-remote stories render the real card (theme-aware) ([cfd3d45](https://github.com/kitn-ai/chat/commit/cfd3d450089e77161ad6a8bbb6b411e05bde2b8f))
* **remote:** deployed kc-remote stories render the real card directly (theme-aware); extract provider renderers ([d4f9f9f](https://github.com/kitn-ai/chat/commit/d4f9f9fec11a77a42d0414e957ca2448632cd878))
* **remote:** kc-remote reacts to theme changes; document remount-on-theme; reconcile spec ([0e2c0c6](https://github.com/kitn-ai/chat/commit/0e2c0c64fdf406a5c21d261e665569ca3548dbba))
* **remote:** kc-remote stories degrade gracefully on deployed Storybook ([d488035](https://github.com/kitn-ai/chat/commit/d48803522c1d24d3bb66b9d51a223abdf55abddf))
* **remote:** kc-remote stories degrade gracefully on static/deployed Storybook ([923688d](https://github.com/kitn-ai/chat/commit/923688d0a19b22a4025632a8e83eda27be03455d))
* **remote:** re-render on context only when theme changes (silent token/locale refresh) ([175db26](https://github.com/kitn-ai/chat/commit/175db26c8ba73529b641a25afd255c32a9b0178f))
* **remote:** restart resize observer per mount; guard message handler from throws ([2b0e3e8](https://github.com/kitn-ai/chat/commit/2b0e3e8bcdb647218f68f64da4f8d4843c1dab8d))
* **remote:** restrict pre-OPEN buffering to connecting state; harden Retry ([350e3ce](https://github.com/kitn-ai/chat/commit/350e3cec7e0f11ae1d4ce2453cf27ac5d5ac8830))
* **spec:** narrow framework-usage catch to ENOENT; skip empty html script block ([b1e30c9](https://github.com/kitn-ai/chat/commit/b1e30c9c6c6a3461c46146148e669a4eabbd219b))
* **storybook:** block-display code pre, reconcile framework tab state ([31bc267](https://github.com/kitn-ai/chat/commit/31bc267858ff2501b574dc7025b8f60793fdeace))
* **storybook:** show Canvas + API tabs only on component stories, Docs-only on doc pages ([c7d9c8d](https://github.com/kitn-ai/chat/commit/c7d9c8d98de85700e0d35bc2e7ccf0e7b56458a2))
* **storybook:** slash-free API tab id to satisfy aria-controls (axe) ([c29ff8e](https://github.com/kitn-ai/chat/commit/c29ff8e5ccea19dced8b4fbcacd6b8c2642ecfb7))

## [0.11.0](https://github.com/kitn-ai/chat/compare/@kitn.ai/chat-v0.10.0...@kitn.ai/chat-v0.11.0) (2026-06-14)


### ⚠ BREAKING CHANGES

* **events:** Two element-event API consolidations following the kc-message `messageaction` pattern (single event with discriminant).

### Features

* **cards:** kc-choice single-select option card ([aab58c9](https://github.com/kitn-ai/chat/commit/aab58c9596da7d479e223ef9cdf8cc5a046d72ff))
* **cards:** kc-choice single-select option card ([1dd0250](https://github.com/kitn-ai/chat/commit/1dd02501f2e5a0d59ba43757aa5c49e9f9843274))


### Bug Fixes

* **stories:** artifact fixtures 404 on GitHub Pages (root-absolute base path) ([9e00e4f](https://github.com/kitn-ai/chat/commit/9e00e4f65d28ec0ad6057b547df54300d7c4d819))
* **stories:** infer boolean/select controls from element-meta type strings ([2ad2d39](https://github.com/kitn-ai/chat/commit/2ad2d393ecc7290c71af64b9ef7a84ce4e5c7e25))
* **stories:** infer boolean/select controls from element-meta type strings ([4d7a4ed](https://github.com/kitn-ai/chat/commit/4d7a4edcfef62e3fe6e1bc0ae7a73421fa4bf755))


### Code Refactoring

* **events:** feedback-bar onFeedback + kc-conversations conversationselect ([e801740](https://github.com/kitn-ai/chat/commit/e801740993d8914b957caf945fbfd23a6f4b612f))

## [0.10.0](https://github.com/kitn-ai/chat/compare/@kitn.ai/chat-v0.9.0...@kitn.ai/chat-v0.10.0) (2026-06-14)


### ⚠ BREAKING CHANGES

* **release:** rename npm scope @kitnai/chat → @kitn.ai/chat
* all web-component tag names and React wrapper names changed to the kc-* / Kc* scheme. Update markup and imports accordingly. A runtime prefix override (register({ prefix })) is planned so consumers can re-namespace on the fly without recompiling.
* **ui:** remove @kobalte/core dependency (replaced by DIY overlay primitives)

### Features

* adopt the kc-* custom-element prefix (Shoelace-style brand mark) ([5a4ec19](https://github.com/kitn-ai/chat/commit/5a4ec192a3e3fbebad9db83961bb4661c591774e))
* **artifact:** &lt;kc-artifact&gt; viewer + &lt;kc-file-tree&gt; ([3edda25](https://github.com/kitn-ai/chat/commit/3edda2500ec22878783c17097bdd43cc6fe2dfb9))
* **artifact:** &lt;kc-artifact&gt; viewer + &lt;kc-file-tree&gt; ([e0232a0](https://github.com/kitn-ai/chat/commit/e0232a0b77cf7d5e0d89aa301beb67a5b219b37a))
* **artifact:** ArtifactPdfPreview inline pdf.js viewer ([f72083a](https://github.com/kitn-ai/chat/commit/f72083a4d38c9a128f87bc098317aa819981abaf))
* **artifact:** branch Preview to inline PDF viewer + reload ([2d3f934](https://github.com/kitn-ai/chat/commit/2d3f934506f4456c4f4e020116c36fd358db9cd2))
* **artifact:** expand/maximize + open-in-tab + configurable toolbar + standalone/readonly-path ([e13bddf](https://github.com/kitn-ai/chat/commit/e13bddf4c137354e25a5a737dac51e0213bae295))
* **artifact:** expand/open-in-tab/configurable toolbar + standalone + readonly-path (Solid) ([c49683e](https://github.com/kitn-ai/chat/commit/c49683ec9086d325b2c702f04457adde982c04c4))
* **artifact:** facade flags + kc-maximize-intent emit + maximizechange + state reconcile ([38272aa](https://github.com/kitn-ai/chat/commit/38272aa4787b8deb107323df0e67d2056127e0f1))
* **artifact:** inline PDF preview via on-demand pdf.js + fallback ([85b360c](https://github.com/kitn-ai/chat/commit/85b360c0d7de1ae2c52c9a4739b9ba0cabdc1b34))
* **artifact:** isPdfUrl preview detector ([7437251](https://github.com/kitn-ai/chat/commit/743725176c41fe1a1882d68a1e27fe61586b23e7))
* **artifact:** PDF fallback card (open / download) ([62a18fc](https://github.com/kitn-ai/chat/commit/62a18fc786042d8aa0343d49648906c10e556121))
* attachment support in the web-component input ([59d2c55](https://github.com/kitn-ai/chat/commit/59d2c55cbe3598fa0f8bb277212cfb7b10733aa8))
* **card-contract:** CardProvider + useCardHost native transport ([9909ca1](https://github.com/kitn-ai/chat/commit/9909ca18f110eed94923ea4e910bbb9d88d7238a))
* **card-contract:** emitCardEvent + routeCardEvent + listener ([2cf1f10](https://github.com/kitn-ai/chat/commit/2cf1f10c694e130d16e8665f3cbd3198805d088c))
* **card-contract:** export the foundation from the public barrel ([4d9fe9c](https://github.com/kitn-ai/chat/commit/4d9fe9ccfaf9d209a6f02e780284578c8f7039cd))
* **card-contract:** frozen contract types + version ([712e3a5](https://github.com/kitn-ai/chat/commit/712e3a55318f2ee37d1b8ec4e058b3bdaf44d2ee))
* **card-contract:** generative-UI foundation (types, validator, transport, schemas) ([8392275](https://github.com/kitn-ai/chat/commit/83922756d3c695d2e11a99e7e869353c8bdb42ae))
* **card-contract:** shared lean JSON-Schema validator ([a93281e](https://github.com/kitn-ai/chat/commit/a93281e27add3c2dccb28f12ec74afc92cbec9f0))
* **card-contract:** ship envelope/event schemas to dist/schemas ([99715de](https://github.com/kitn-ai/chat/commit/99715de1e5118c540f22c76a06f9523c05a96313))
* **cards:** &lt;kc-cards&gt; web-component list dispatcher ([a7abd54](https://github.com/kitn-ai/chat/commit/a7abd5438056ba6790e825c79c40e4b2ab0379e8))
* **cards:** card-registry — type→component/tag maps + merge helpers ([a5f945f](https://github.com/kitn-ai/chat/commit/a5f945fcd853a055d4189c1b614e04206d44d895))
* **cards:** CardFallback for unsupported card types ([f6385ac](https://github.com/kitn-ai/chat/commit/f6385acb0b77ece53159cf9d0fdf787afd3331de))
* **cards:** CardRenderer + renderCard (Solid single-envelope dispatcher) ([4aa2030](https://github.com/kitn-ai/chat/commit/4aa2030645a4bdb4a701e46403280bb239974416))
* **cards:** export the dispatcher from the public barrel ([47cebaa](https://github.com/kitn-ai/chat/commit/47cebaa8129a822b6df27617ef52f26739364491))
* **cards:** generative-UI card dispatcher (renderCard / &lt;kc-cards&gt;) + Overview ([04e1bb7](https://github.com/kitn-ai/chat/commit/04e1bb7fe25337dbe1cb1c0be25d9631a111b884))
* **cards:** integrate kc-card/kc-form/kc-link-card/kc-embed (register + barrel + regen) ([cf2ad3a](https://github.com/kitn-ai/chat/commit/cf2ad3ac5320e74f5fff4e7ecf0238bda50175e8))
* **cards:** integrate kc-confirm + kc-task-list (register + x-kc hints + regen) ([f832995](https://github.com/kitn-ai/chat/commit/f832995b012928f28dcaa5da0fc4fb73b74d109f))
* **cards:** kc-card base shell + kc-form JSON-Schema renderer ([b759978](https://github.com/kitn-ai/chat/commit/b759978903edfdfd507042bc9db8318271bee3d3))
* **cards:** kc-card, kc-form, kc-link-card, kc-embed (generative-UI cards) ([00e5884](https://github.com/kitn-ai/chat/commit/00e58849d88c93c86348db9f5b13708953969ec7))
* **cards:** kc-confirm + kc-task-list (approval cards) + Button destructive variant ([fb8d255](https://github.com/kitn-ai/chat/commit/fb8d255bdc534a762abb5be2b97a1890a55464a2))
* **cards:** kc-confirm + kc-task-list + full generative-UI card design pass ([f9acdc4](https://github.com/kitn-ai/chat/commit/f9acdc447abf35f9cf983c6444646bd099425ce9))
* **cards:** kc-link-card + kc-embed (display cards on the Card Contract) ([8b5a5bc](https://github.com/kitn-ai/chat/commit/8b5a5bcc4c92a29eec6e00de192c2f54b4744f64))
* **cards:** premium control design + Storybook light/dark + a11y fixes ([1855321](https://github.com/kitn-ai/chat/commit/18553213127a6c6b716a7f98cdca1b05a6c837dd))
* **cards:** redesign card chrome + form controls ([d6df789](https://github.com/kitn-ai/chat/commit/d6df789402b918e2bdef9f98aa9ea7217ac63b67))
* CDN full-chat example + web-component icon fix + curated highlighter defaults ([766b3e8](https://github.com/kitn-ai/chat/commit/766b3e8d8211abce9e7c41e823afb570243e6111))
* **chat-config:** add portalMount accessor for shadow-root portals ([b25e796](https://github.com/kitn-ai/chat/commit/b25e796cea2ed76db7b53a68dab715d0363af2c5))
* **chat-config:** default text size sm -&gt; base (16px) for readability ([0cf7c49](https://github.com/kitn-ai/chat/commit/0cf7c4935f43a5e46e2dc0d86d535269c10dbe3f))
* composable web-component layer — DIY accessible primitives, React wrappers, Storybook/docs, llms.txt ([501e7db](https://github.com/kitn-ai/chat/commit/501e7db4aa6b1861fd6981f4d167f03836b929ed))
* **docs:** generate llms.txt + llms-full.txt for AI-agent integration ([bd40c90](https://github.com/kitn-ai/chat/commit/bd40c90cc77f237f007d38f4a8cf816acdb19394))
* **docs:** generate web-components.md tables from element-meta (between markers) ([bf0935f](https://github.com/kitn-ai/chat/commit/bf0935fdadf065b4cc62d5aeeca5033eeba6efdc))
* **elements:** add &lt;kitn-chat-workspace&gt; (list + chat + resize) ([4d6f799](https://github.com/kitn-ai/chat/commit/4d6f79980b893537f8aafc85f170dc1f574ba58a))
* **elements:** add &lt;kitn-chat&gt; data-driven message renderer ([fc4b0a8](https://github.com/kitn-ai/chat/commit/fc4b0a8aef77154a19e6c023be8b9f9fa71321a0))
* **elements:** add &lt;kitn-conversation-list&gt; ([75ecc23](https://github.com/kitn-ai/chat/commit/75ecc237fb4f4a5d167fc3d38f02cc5cd4a249cd))
* **elements:** add &lt;kitn-prompt-input&gt; ([a69ec56](https://github.com/kitn-ai/chat/commit/a69ec5639b4ac7186668a66c7fbf77786f9339a9))
* **elements:** add defineKitnElement shadow-DOM wrapper helper ([80d049f](https://github.com/kitn-ai/chat/commit/80d049f8592fd990ce94f96f191720c4dfab4a11))
* **elements:** add registration entry, Vite library build, ./elements export ([52ff40f](https://github.com/kitn-ai/chat/commit/52ff40f692681d703ca4c4716f68a301c0f33b50))
* **elements:** attachment support in the web-component input ([6cedda3](https://github.com/kitn-ai/chat/commit/6cedda328f783b33ff68a32cbe2717b50c1bec3b))
* **elements:** bring &lt;kitn-chat&gt; web component to full-chat parity ([dbd1c24](https://github.com/kitn-ai/chat/commit/dbd1c240cebf707a3ce10242a451936b2713c0e0))
* **elements:** compile kit Tailwind CSS to an injectable string ([ab3acd4](https://github.com/kitn-ai/chat/commit/ab3acd4508bc4bbbb71efa7f2ec00596c8aefc11))
* **elements:** composable web-component foundation + first three elements ([bb79a2a](https://github.com/kitn-ai/chat/commit/bb79a2af28c9b5892f5c491116e4a11e21f159b0))
* **elements:** declare typed Events maps on flagship facades (typed dispatch + generated detail shapes) ([a1ace5c](https://github.com/kitn-ai/chat/commit/a1ace5c317739af19c0e176893c298ef189983ac))
* **elements:** fold SlashCommand into prompt-input + chat ([46709c8](https://github.com/kitn-ai/chat/commit/46709c8f79a3214548ec27dfd66804498710eb49))
* **elements:** generate Custom Elements Manifest from the facades ([bd9f18b](https://github.com/kitn-ai/chat/commit/bd9f18b30113405f6c8fed9efdd8df1f7f9cfecc))
* **elements:** generate typed HTMLElementTagNameMap d.ts ([9545780](https://github.com/kitn-ai/chat/commit/9545780ce5a4904da8de6df2944b5e0c211fd6f2))
* **elements:** light/dark/auto theme support for web components ([c8992e4](https://github.com/kitn-ai/chat/commit/c8992e4facb332d94cc83c2aa6751ac365c5d67b))
* **elements:** phase 1 — message-rendering core elements ([ca26d95](https://github.com/kitn-ai/chat/commit/ca26d955ec7427c04202c3fa0ce68824a3380016))
* **elements:** phase 2 — header / meta elements ([2ea6595](https://github.com/kitn-ai/chat/commit/2ea659550eedb32e784546dbf61cdac8cb80b4b4))
* **elements:** phase 3 — input ecosystem elements ([1e09086](https://github.com/kitn-ai/chat/commit/1e09086ea9ffe82c1a540603f4b7e647d939b508))
* **elements:** phase 4 — indicators & leaf elements ([3a3b68e](https://github.com/kitn-ai/chat/commit/3a3b68ea16b4a4d066e529b83cc66118ebc4efe0))
* **elements:** render message attachments in &lt;kitn-chat&gt; ([6717222](https://github.com/kitn-ai/chat/commit/6717222b39bc2730acb58c095ce0a908c5f00367))
* **elements:** shared DefaultPromptInput with suggestions + loading/disabled wiring ([85272e5](https://github.com/kitn-ai/chat/commit/85272e5b9ae9bd7c9d59aa87b45876b2dc799031))
* **elements:** typed Events maps on remaining dispatching facades ([fd292ec](https://github.com/kitn-ai/chat/commit/fd292ec3022ca7fb252b1317525d8017487380f4))
* **examples:** add React + Vite example using kitn-chat web components ([5b836bb](https://github.com/kitn-ai/chat/commit/5b836bb3e43c138b549bb276df0a43238de2ddb6))
* **examples:** add runnable Angular example app ([dab40bd](https://github.com/kitn-ai/chat/commit/dab40bdd8972819a99b54df1fae7909f6710224d))
* **examples:** add runnable Vue example app ([97e9495](https://github.com/kitn-ai/chat/commit/97e94955be09470d2b1dffc3e209a8796d0e6245))
* **examples:** add SolidJS primitives example (Vite + Tailwind v4) ([6dea25f](https://github.com/kitn-ai/chat/commit/6dea25f979fc2cf00e0b147e838fd3f3030039a9))
* **examples:** docked, collapsible event console in the showcase ([25923ec](https://github.com/kitn-ai/chat/commit/25923ec2b79b587f774175f5c5d6a519541f5526))
* full story parity for &lt;kitn-chat&gt; (header, model switcher, context, scroll button, toolbar) ([aae1541](https://github.com/kitn-ai/chat/commit/aae15414bc82a35bb53ce3372947bb7087b926c0))
* full-screen theme editor (light/dark, presets, live chat preview) ([c656735](https://github.com/kitn-ai/chat/commit/c656735690c5a050e61d414ddfcc73795354e564))
* **gen:** add composedFrom links + component tokens to element spec ([04886b8](https://github.com/kitn-ai/chat/commit/04886b87a67b72f8390d391a4413497c2e0fc98b))
* **gen:** extract prop defaults + always emit element-meta.json ([1463793](https://github.com/kitn-ai/chat/commit/14637936022b9db8ae9954ddd672edc881c02c3d))
* **highlighter:** curate default language set (bash, javascript, html, css, json) ([c2c2492](https://github.com/kitn-ai/chat/commit/c2c24928fe55a163fbce5973eb02f6fda33f0bb4))
* **highlighter:** on-demand, no-WASM Shiki; ESM-only build ([7c121d2](https://github.com/kitn-ai/chat/commit/7c121d25521cfd32bf9d7ac623884b4124393616))
* **highlighter:** trim default languages to 5 core (js/ts/tsx/json/bash) ([c8c75bd](https://github.com/kitn-ai/chat/commit/c8c75bdd64a775f7830445a8d053eccaf8b13f80))
* **pdf-preview:** config + enable/reset primitive scaffold ([49a0b87](https://github.com/kitn-ai/chat/commit/49a0b870f338df11df4ecef86c73a99ff404dff8))
* **pdf-preview:** export configurePdfPreview from the barrel ([8be2e6d](https://github.com/kitn-ai/chat/commit/8be2e6d6fbd8a10711598f8875da323f676858c8))
* **pdf-preview:** on-demand pdf.js loader + renderPdfInto ([c55b43e](https://github.com/kitn-ai/chat/commit/c55b43ea796c4ed16fd964dc024592c065943fa7))
* **prompt-input:** disallow leading whitespace in the prompt ([0ce580b](https://github.com/kitn-ai/chat/commit/0ce580b5783602b2999f38aab3eac6e8678330a4))
* **prompt-input:** insert slash command on select; configurable suggestion submit ([4229d6b](https://github.com/kitn-ai/chat/commit/4229d6bbf4b8bf3e8cb68173c86099332f774ec4))
* **react:** generated typed React wrappers (@kitnai/chat/react) ([faa4da4](https://github.com/kitn-ai/chat/commit/faa4da432b28f6bfce116e08376012a2648c8ab6))
* **react:** wrapper verification, native-style examples/react demo, React wrapper tests ([b142cb6](https://github.com/kitn-ai/chat/commit/b142cb6a1e10a59abaa3ea38d4f076cc653864e2))
* **resizable-ui:** Solid Resizable maximizedIndex/onMaximizeChange parity ([17f9b62](https://github.com/kitn-ai/chat/commit/17f9b629f4cbe8d24420aca437ff54860c950dfd))
* **resizable:** &lt;kc-resizable&gt; panel layout + level up the primitives ([7abc84b](https://github.com/kitn-ai/chat/commit/7abc84b6b2c432bef47c10c31bad75e3e4d99986))
* **resizable:** &lt;kc-resizable&gt; panel layout + level up the primitives ([656adeb](https://github.com/kitn-ai/chat/commit/656adebc5c19c8349b885b7e6170c83158dd342c))
* **resizable:** Escape-to-restore, auto-restore on item removal, nested stopPropagation ([4f2c1f1](https://github.com/kitn-ai/chat/commit/4f2c1f129ab920b3b0399a7a964ed6dc8f8a0ee6))
* **resizable:** kc-maximize-intent listener + stash/restore core ([fe0780e](https://github.com/kitn-ai/chat/commit/fe0780edfc3a925a90df480cf6d77db39b5aa097))
* **resizable:** maximize protocol types + ambient host API typing ([f03d2ae](https://github.com/kitn-ai/chat/commit/f03d2aee34ee6fe5b6f2f796be2cf8a6fecf9344))
* **resizable:** maximizedIndex prop + maximize/restore methods + maximizechange ([5ba03ff](https://github.com/kitn-ai/chat/commit/5ba03ff11fdcb3142adf1a1637aed0239b9a269d))
* **stories:** add controls/actions/autodocs convention exemplar (Button) ([b99a10c](https://github.com/kitn-ai/chat/commit/b99a10c9c198c2ae2b86ca403fca8faf372a6f23))
* **stories:** bake import-line snippets + web-component story exemplar ([072297a](https://github.com/kitn-ai/chat/commit/072297ad5236b01da20c43116b850a00df18cc57))
* **stories:** controls, actions, autodocs + copyable snippets across all components ([0045ba1](https://github.com/kitn-ai/chat/commit/0045ba1dfb118fb4899df34d5855ff3b513c5a57))
* **stories:** Examples/ composition stories (catalog, composed shell, choosing-components) ([233858e](https://github.com/kitn-ai/chat/commit/233858ec4e04c342e36e623c97c10cca965824a0))
* **stories:** Examples/Catalog + Choosing-components overview (web components) ([10d2e81](https://github.com/kitn-ai/chat/commit/10d2e815250cd4d70091296cf1cd68af4b3ece23))
* **stories:** Examples/Composed chat shell (compose-your-own vs drop-in) ([10abceb](https://github.com/kitn-ai/chat/commit/10abcebc2e0303e3ea5bd829aa482fe45eb5eff1))
* **storybook:** API spec page + live Controls on flagship element stories ([96c1d8a](https://github.com/kitn-ai/chat/commit/96c1d8a8dcefe066e5ebb3d42afc968b6c638f79))
* **storybook:** API spec page on attachments/chain-of-thought/chat-scope-picker/checkpoint/code-block/context-meter element stories ([7dbfc0f](https://github.com/kitn-ai/chat/commit/7dbfc0ff97e2a09e5c649faef8300e372b916fd2))
* **storybook:** API spec page on empty/feedback-bar/file-upload/image/loader/markdown element stories ([9b4dd9f](https://github.com/kitn-ai/chat/commit/9b4dd9f74b272ba4094253e96c03f249ca2af754))
* **storybook:** API spec page on message-skills/message/model-switcher/prompt-suggestions/reasoning/response-stream element stories ([fd06dcc](https://github.com/kitn-ai/chat/commit/fd06dcc280a9f3c2430428f77ebab66e16d4dcd8))
* **storybook:** API spec page on source-list/source/text-shimmer/thinking-bar/tool/voice-input element stories ([6f2d3bd](https://github.com/kitn-ai/chat/commit/6f2d3bd8d0351db0966d4ba74ef8f253b11d1b52))
* **storybook:** ElementSpec doc-component + argTypesFor controls helper ([bb1ea25](https://github.com/kitn-ai/chat/commit/bb1ea25d8433825f4e437cb1b3fdfd25b35ae4f8))
* **storybook:** sidebar IA — Web Components first, Examples by importance ([da44605](https://github.com/kitn-ai/chat/commit/da446059487a2a910a1f03bbcf37d211edcc7905))
* **storybook:** sync dark/light across the whole UI via storybook-dark-mode ([53b5398](https://github.com/kitn-ai/chat/commit/53b5398830b7ecd8e5af7ea1949533c0bb909bad))
* **theme-editor:** compose editor (state, injected style, top bar) ([3315e05](https://github.com/kitn-ai/chat/commit/3315e056b18cf2537a5e4c3361a201280940b3a2))
* **theme-editor:** full-theme presets (Default/Violet/Emerald/Mono) ([f197554](https://github.com/kitn-ai/chat/commit/f197554fbc6101c0b7ef47f01b857289383e620d))
* **theme-editor:** fullscreen 'Theming/Editor' story ([7332c97](https://github.com/kitn-ai/chat/commit/7332c97d120e47007a8ca440f7ff98d7485b42f1))
* **theme-editor:** inspector panel (swatches + radius slider) ([2e28512](https://github.com/kitn-ai/chat/commit/2e2851232c7e57e175b07120304efb3b1e6b7cb0))
* **theme-editor:** pure :root/.dark CSS exporter ([cdc9d1e](https://github.com/kitn-ai/chat/commit/cdc9d1efc48ea8a0108c6cdff0d3b510afe4de57))
* **theme-editor:** realistic chat preview canvas + coverage rail ([5d27c0d](https://github.com/kitn-ai/chat/commit/5d27c0dce803758f6392c3bedbf1640417935528))
* **theme:** blue accent for inline code (borderless chip, mode-aware) ([c21b1b7](https://github.com/kitn-ai/chat/commit/c21b1b78f7df25d45ef1c92cf9a17f3c90cd9e9d))
* **theme:** controlled blue focus ring across all components ([603e3c4](https://github.com/kitn-ai/chat/commit/603e3c41f929cf4104763d47c019c2923c615b2d))
* **theme:** custom cross-platform scrollbars (thin, rounded, subtle, themed) ([ae9b83b](https://github.com/kitn-ai/chat/commit/ae9b83b55da50149fd863ea694417a7e9e51e328))
* **theme:** ship browser-ready theme.tokens.css for &lt;link&gt;/CDN consumers ([2ec93c4](https://github.com/kitn-ai/chat/commit/2ec93c459a325a0414ba345019bacdc57d99794f))
* **theme:** tokenized typography scale + consistent component sizing ([4dc46e2](https://github.com/kitn-ai/chat/commit/4dc46e2fd271803d73de42beec6ce0da22f8411a))
* **ui:** add @floating-ui/dom dep + createPresence overlay primitive ([a327a7c](https://github.com/kitn-ai/chat/commit/a327a7cd9fd1d90ed2fcdb13582f2a463d3846fa))
* **ui:** add usePosition (autoUpdate) + useDismiss + As to overlay core ([a459ec5](https://github.com/kitn-ai/chat/commit/a459ec5e872d5982734cc9fe272a524864bffa1c))
* **ui:** emit data-state on Collapsible root/trigger so consumer chevron-rotation classes work ([f4be7ad](https://github.com/kitn-ai/chat/commit/f4be7ad41550c17a92dc8dbb14ebc0be7ac03d8b))
* **ui:** reimplement Collapsible without Kobalte (grid-rows anim, inert on close) ([c9ae2a7](https://github.com/kitn-ai/chat/commit/c9ae2a71041998ab496c065eef3fce2e5910ea5c))
* **ui:** reimplement Dropdown menu on overlay core (roving focus, typeahead, no scroll-lock, follows scroll) ([3575b7c](https://github.com/kitn-ai/chat/commit/3575b7c35b699526f31f598339f98dbca34e47ee))
* **ui:** reimplement HoverCard with deterministic shared-timer machine (HC-1); migrate context.tsx ([968a1b4](https://github.com/kitn-ai/chat/commit/968a1b4af2bdf6e894d736de187d71a38dbc1cf7))
* **ui:** reimplement Tooltip on overlay core (role=tooltip, aria-describedby) ([b06c4f5](https://github.com/kitn-ai/chat/commit/b06c4f56a16913e2b98f12ece4da71fab5f106b7))
* **ui:** remove @kobalte/core dependency (replaced by DIY overlay primitives) ([a1b9e1f](https://github.com/kitn-ai/chat/commit/a1b9e1ff826eea380c50581b46fcd035594ed2cb))
* **ui:** route Kobalte overlays through ChatConfig.portalMount ([18f6425](https://github.com/kitn-ai/chat/commit/18f64254c4529af36646ab06916ccf51d726d85e))


### Bug Fixes

* **a11y,examples:** darken showcase --muted token to meet AA (0 axe violations, light+dark) ([18577be](https://github.com/kitn-ai/chat/commit/18577bee0859c91da1c026a72444cd237b08a337))
* **a11y,examples:** keyboard-accessible event log (scrollable-region) + update bundle figure to ~80kb ([503e821](https://github.com/kitn-ai/chat/commit/503e8218a12a906d7acea95b62651449e1d151e1))
* **a11y:** accessible names on icon buttons + visible focus (WCAG 2.1 AA, A1/A3) ([812348a](https://github.com/kitn-ai/chat/commit/812348a28f65b518c8c33d8acf7d22d0881fcb9c))
* **a11y:** brighten destructive red in dark across the cards ([1163995](https://github.com/kitn-ai/chat/commit/1163995295591581540cb42ac9a00a0763c6653e))
* **a11y:** darken light-mode --color-destructive for WCAG contrast ([a245236](https://github.com/kitn-ai/chat/commit/a245236ff96a3fd4874d1bc26b5decfac43fde9a))
* **a11y:** gate Storybook a11y to error (code-block + checkpoint fixes + scoped Shiki exception) ([2f367d9](https://github.com/kitn-ai/chat/commit/2f367d9a544773514e5dbb01ea53a14867baad9c))
* **a11y:** keyboard-focusable code scroll region + named icon-only checkpoint ([7d1d7cd](https://github.com/kitn-ai/chat/commit/7d1d7cdeaeb41753f0a3fc2544ee621818376a3a))
* **a11y:** label icon buttons/selects + fix contrast in story fixtures ([b1b464e](https://github.com/kitn-ai/chat/commit/b1b464e535b64188d057fa9dad7ae78408dd6334))
* **a11y:** raise muted/subtle text contrast to WCAG 2.1 AA (A2, light+dark) ([0668785](https://github.com/kitn-ai/chat/commit/06687852c8c8bf675e8c6f7a7564d8671874c40a))
* **a11y:** WCAG AA fixes across component library + story fixtures ([994e738](https://github.com/kitn-ai/chat/commit/994e738c02e4377b00cbbf66b53fe86ebfb94fa8))
* **a11y:** WCAG AA fixes in component library (axe-clean) ([7a18461](https://github.com/kitn-ai/chat/commit/7a18461d20f00120aa249228c40041279229f867))
* **artifact:** make inline PDF scroll region keyboard-focusable ([767ce31](https://github.com/kitn-ai/chat/commit/767ce310557b907f270a2d95ace0e0c72a01a183))
* **build:** minify ES lib chunks via generateBundle esbuild pass ([ff49688](https://github.com/kitn-ai/chat/commit/ff49688475f1cde620314e2d49a5195f33b1b0f9))
* **build:** minify the library bundle (Vite skips minify for ESM lib builds) ([13cb3f5](https://github.com/kitn-ai/chat/commit/13cb3f5514f7a56967503bece53d0ed9d5f93f6a))
* **cards:** &lt;kc-cards&gt; reads policy at event-time + inline types prop; soften streaming docs ([7b384a1](https://github.com/kitn-ai/chat/commit/7b384a1958bd99bf4c57080ab91b316db6fe11f7))
* **cards:** null out native range-track border/groove ([9bda968](https://github.com/kitn-ai/chat/commit/9bda96872f439e83024ef5b24ee6e5a466277ace))
* **checkpoint:** use a button factory so tooltip variant doesn't share a DOM node ([e5971c2](https://github.com/kitn-ai/chat/commit/e5971c2793b2838690171ccdcd188639c6db08e3))
* **components,examples:** font sizes, attachment layout, showcase polish ([7efd3e1](https://github.com/kitn-ai/chat/commit/7efd3e143cf4dc12fec88aecae64bfe6eacdc443))
* **conversation-list:** smaller conversation labels; docs(web-components): full API reference ([ceff6fa](https://github.com/kitn-ai/chat/commit/ceff6fa52598ba952d6b53b0bc5d4226e2071940))
* **conversation-list:** smaller labels + docs(web-components): full API reference ([e29698e](https://github.com/kitn-ai/chat/commit/e29698e4975e9b3a59a9a8fa2a112f432b6e5e91))
* **docs:** render payloadless event detail as — (not Record&lt;string, never&gt;) ([c32c436](https://github.com/kitn-ai/chat/commit/c32c436968556b9a2546c1afc1de478ba1a00a2a))
* **elements:** apply flag() to existing element booleans + docs ([9cdc85b](https://github.com/kitn-ai/chat/commit/9cdc85bc0c37c2b1c7405fae5a6178c0a3898d00))
* **elements:** correct defineKitnElement component-callback typing ([b33d284](https://github.com/kitn-ai/chat/commit/b33d284446e9c3dea5524eb746a42950456442ac))
* **elements:** inherited text color follows light/dark (attachment labels, etc.) ([e39dc1a](https://github.com/kitn-ai/chat/commit/e39dc1a305586ef613ce470a83068bb1588f9a89))
* **elements:** inherited text color follows the element's light/dark mode ([dae7f0a](https://github.com/kitn-ai/chat/commit/dae7f0a27d6b9548e2fb4ab5ec5cb6cc4ab5aaca))
* **elements:** make --color-*/--text-* overridable from :root in shadow DOM ([b6b998e](https://github.com/kitn-ai/chat/commit/b6b998e8b19eda6c9c944deeb6768ab2e3869689))
* **elements:** make custom events non-bubbling to avoid host collisions ([b90a395](https://github.com/kitn-ai/chat/commit/b90a3957a896722c17ec6f20976801b03f4b6c78))
* **elements:** preserve chat draft across kitn-chat-workspace sidebar toggle ([339aa9e](https://github.com/kitn-ai/chat/commit/339aa9e59bb88c44e2ab6b780d21a22ee67eec51))
* **elements:** render real action icons in &lt;kitn-chat&gt; ([d7a6d21](https://github.com/kitn-ai/chat/commit/d7a6d21dcf26eb67e24137799d3183cee0b9870f))
* **examples:** composable showcase follows OS dark mode on first paint ([518bd56](https://github.com/kitn-ai/chat/commit/518bd56930fcba8844821ca302c8643c38a56bbe))
* hide Storybook addon panel on presentational stories (SB10 manager config) ([db01af2](https://github.com/kitn-ai/chat/commit/db01af27b3b2b003219f7a73be9b7f44d2c225d8))
* **highlighter:** highlight TypeScript/TSX by default ([5686b4a](https://github.com/kitn-ai/chat/commit/5686b4a5ea4f9c8ccac3f8848126d9533ddd939f))
* **highlighter:** highlight TypeScript/TSX by default ([896a103](https://github.com/kitn-ai/chat/commit/896a10329b2f39183a137bfb46fde62587daaaab))
* **resizable:** element-keyed maximize stash (index-drift) + remove dead guards ([bb6a99b](https://github.com/kitn-ai/chat/commit/bb6a99b1325830d7662517f4376c9fe63ea57899))
* **stories:** dark preview toolbar + real copyable source snippets ([49dafe2](https://github.com/kitn-ai/chat/commit/49dafe2f5a6188367d2cd6e8066c7d2be87c4489))
* **stories:** drop duplicate kc-artifact JSX decl (use artifact.stories augmentation) ([0202077](https://github.com/kitn-ai/chat/commit/02020772208654f3efcd9e3f6239eecd4e627360))
* **storybook:** dark-mode args-table controls (select/input/toggle/button) ([72d9f7b](https://github.com/kitn-ai/chat/commit/72d9f7b2655ab50839770574437f7b874881a52a))
* **storybook:** dark-mode markdown contrast + render full-chat example inline ([350baef](https://github.com/kitn-ai/chat/commit/350baefb8a6dd4d22dbd3757bad8c44a0c43539b))
* **storybook:** hide addon panel via manager layoutCustomisations (SB10) ([b9f3337](https://github.com/kitn-ai/chat/commit/b9f3337156029423ff9bc1d0c8ac096abdd724de))
* **theme-editor:** make swatch color reactive to active mode ([046e013](https://github.com/kitn-ai/chat/commit/046e01320ea0a5917ef31d5e549d7c9512e093e0))
* **theme-editor:** re-root inherited color/color-scheme on the canvas wrapper ([5de968c](https://github.com/kitn-ai/chat/commit/5de968c44f711c66744aeea3fdc949f33eeb7676))
* **theme-editor:** recurse [@layer](https://github.com/layer) for token discovery; reuse real chat scene ([69231b3](https://github.com/kitn-ai/chat/commit/69231b32ff6c7a502bfd2a593e9c4e65babb4bf8))
* **theme-editor:** scope live preview to the canvas, independent of ancestor .dark ([d8a164f](https://github.com/kitn-ai/chat/commit/d8a164ffcf54ef278efdf4262534fd1e97be6113))
* **theme-editor:** wire radius scale to canvas; larger non-mono token labels ([836a06e](https://github.com/kitn-ai/chat/commit/836a06eafb7b824950fe691015d90e0d65130f72))
* **theme:** harmonize dark surface tokens with the warm background ([6022492](https://github.com/kitn-ai/chat/commit/60224927beebdc1586afaf1e867476524e96aec0))
* **ui:** dropdown roving focus works inside Shadow DOM ([58c4096](https://github.com/kitn-ai/chat/commit/58c4096a750f8427663bc7e66b554fe158023d26))
* **ui:** dropdown Tab closes without stealing focus; skip disabled items; clarify focus timing ([46df213](https://github.com/kitn-ai/chat/commit/46df213d2b39726fecf551cc41099dc87280d284))
* **ui:** gate Tooltip content on presence so exit animation plays; await async unmount in test ([1a12a6e](https://github.com/kitn-ai/chat/commit/1a12a6e1b5713381d5c0698f1f40ade8e53d05de))
* **ui:** guard createPresence microtask close; broaden setRef type; add docs + tests ([11b0d65](https://github.com/kitn-ai/chat/commit/11b0d652d2599f708a196bc5d4ac366d73e870e3))
* **ui:** harden Collapsible prop forwarding (id/onClick), data-closed parity, tests ([d8afc02](https://github.com/kitn-ai/chat/commit/d8afc02a191ca65e31b7b40b8950cd830802eee1))
* **ui:** hover-card safe-area (transparent-gap bridge + 300ms closeDelay) so pointer can cross to content ([726519f](https://github.com/kitn-ai/chat/commit/726519f14e8deafeed5abd65a96c87d6bf7a06de))
* **ui:** make tooltip/hover-card refs reactive so floating position computes (C-1); hover-card focus persistence + instant Escape ([8ab1f70](https://github.com/kitn-ai/chat/commit/8ab1f704b2ef3d4ff8060f0274de6fc75a3fe4a0))
* **ui:** register custom text-* size utilities with tailwind-merge; explicit thinking-bar size ([09e4e7e](https://github.com/kitn-ai/chat/commit/09e4e7e4a61a7417d4ca4e4cbdd0c9b56e7a31d2))
* **ui:** tooltip stays open while focused or hovered; clean up hover timer ([0264710](https://github.com/kitn-ai/chat/commit/0264710673a646bd98eb5e74980fe3052307f40a))


### Performance Improvements

* **code-block:** use shiki/bundle/web (~78 langs) instead of full bundle ([78b7fa9](https://github.com/kitn-ai/chat/commit/78b7fa9bfa1c55fc97db741719cc7958838b1016))


### Miscellaneous Chores

* **release:** rename npm scope @kitnai/chat → [@kitn](https://github.com/kitn).ai/chat ([633b345](https://github.com/kitn-ai/chat/commit/633b345f40384dd1dcc2b13156119dbdaf451bd5))

## [0.9.0](https://github.com/kitn-ai/chat/compare/chat-v0.8.1...chat-v0.9.0) (2026-06-14)


### Features

* **artifact:** expand/maximize + open-in-tab + configurable toolbar + standalone/readonly-path ([e13bddf](https://github.com/kitn-ai/chat/commit/e13bddf4c137354e25a5a737dac51e0213bae295))
* **artifact:** expand/open-in-tab/configurable toolbar + standalone + readonly-path (Solid) ([c49683e](https://github.com/kitn-ai/chat/commit/c49683ec9086d325b2c702f04457adde982c04c4))
* **artifact:** facade flags + kc-maximize-intent emit + maximizechange + state reconcile ([38272aa](https://github.com/kitn-ai/chat/commit/38272aa4787b8deb107323df0e67d2056127e0f1))
* **cards:** &lt;kc-cards&gt; web-component list dispatcher ([a7abd54](https://github.com/kitn-ai/chat/commit/a7abd5438056ba6790e825c79c40e4b2ab0379e8))
* **cards:** card-registry — type→component/tag maps + merge helpers ([a5f945f](https://github.com/kitn-ai/chat/commit/a5f945fcd853a055d4189c1b614e04206d44d895))
* **cards:** CardFallback for unsupported card types ([f6385ac](https://github.com/kitn-ai/chat/commit/f6385acb0b77ece53159cf9d0fdf787afd3331de))
* **cards:** CardRenderer + renderCard (Solid single-envelope dispatcher) ([4aa2030](https://github.com/kitn-ai/chat/commit/4aa2030645a4bdb4a701e46403280bb239974416))
* **cards:** export the dispatcher from the public barrel ([47cebaa](https://github.com/kitn-ai/chat/commit/47cebaa8129a822b6df27617ef52f26739364491))
* **cards:** generative-UI card dispatcher (renderCard / &lt;kc-cards&gt;) + Overview ([04e1bb7](https://github.com/kitn-ai/chat/commit/04e1bb7fe25337dbe1cb1c0be25d9631a111b884))
* **resizable-ui:** Solid Resizable maximizedIndex/onMaximizeChange parity ([17f9b62](https://github.com/kitn-ai/chat/commit/17f9b629f4cbe8d24420aca437ff54860c950dfd))
* **resizable:** Escape-to-restore, auto-restore on item removal, nested stopPropagation ([4f2c1f1](https://github.com/kitn-ai/chat/commit/4f2c1f129ab920b3b0399a7a964ed6dc8f8a0ee6))
* **resizable:** kc-maximize-intent listener + stash/restore core ([fe0780e](https://github.com/kitn-ai/chat/commit/fe0780edfc3a925a90df480cf6d77db39b5aa097))
* **resizable:** maximize protocol types + ambient host API typing ([f03d2ae](https://github.com/kitn-ai/chat/commit/f03d2aee34ee6fe5b6f2f796be2cf8a6fecf9344))
* **resizable:** maximizedIndex prop + maximize/restore methods + maximizechange ([5ba03ff](https://github.com/kitn-ai/chat/commit/5ba03ff11fdcb3142adf1a1637aed0239b9a269d))


### Bug Fixes

* **cards:** &lt;kc-cards&gt; reads policy at event-time + inline types prop; soften streaming docs ([7b384a1](https://github.com/kitn-ai/chat/commit/7b384a1958bd99bf4c57080ab91b316db6fe11f7))
* **resizable:** element-keyed maximize stash (index-drift) + remove dead guards ([bb6a99b](https://github.com/kitn-ai/chat/commit/bb6a99b1325830d7662517f4376c9fe63ea57899))
* **stories:** drop duplicate kc-artifact JSX decl (use artifact.stories augmentation) ([0202077](https://github.com/kitn-ai/chat/commit/02020772208654f3efcd9e3f6239eecd4e627360))

## [0.8.1](https://github.com/kitn-ai/chat/compare/chat-v0.8.0...chat-v0.8.1) (2026-06-14)


### Bug Fixes

* **a11y:** gate Storybook a11y to error (code-block + checkpoint fixes + scoped Shiki exception) ([2f367d9](https://github.com/kitn-ai/chat/commit/2f367d9a544773514e5dbb01ea53a14867baad9c))
* **a11y:** keyboard-focusable code scroll region + named icon-only checkpoint ([7d1d7cd](https://github.com/kitn-ai/chat/commit/7d1d7cdeaeb41753f0a3fc2544ee621818376a3a))

## [0.8.0](https://github.com/kitn-ai/chat/compare/chat-v0.7.0...chat-v0.8.0) (2026-06-14)


### ⚠ BREAKING CHANGES

* all web-component tag names and React wrapper names changed to the kc-* / Kc* scheme. Update markup and imports accordingly. A runtime prefix override (register({ prefix })) is planned so consumers can re-namespace on the fly without recompiling.

### Features

* adopt the kc-* custom-element prefix (Shoelace-style brand mark) ([5a4ec19](https://github.com/kitn-ai/chat/commit/5a4ec192a3e3fbebad9db83961bb4661c591774e))
* **artifact:** &lt;kc-artifact&gt; viewer + &lt;kc-file-tree&gt; ([3edda25](https://github.com/kitn-ai/chat/commit/3edda2500ec22878783c17097bdd43cc6fe2dfb9))
* **artifact:** &lt;kc-artifact&gt; viewer + &lt;kc-file-tree&gt; ([e0232a0](https://github.com/kitn-ai/chat/commit/e0232a0b77cf7d5e0d89aa301beb67a5b219b37a))
* **artifact:** ArtifactPdfPreview inline pdf.js viewer ([f72083a](https://github.com/kitn-ai/chat/commit/f72083a4d38c9a128f87bc098317aa819981abaf))
* **artifact:** branch Preview to inline PDF viewer + reload ([2d3f934](https://github.com/kitn-ai/chat/commit/2d3f934506f4456c4f4e020116c36fd358db9cd2))
* **artifact:** inline PDF preview via on-demand pdf.js + fallback ([85b360c](https://github.com/kitn-ai/chat/commit/85b360c0d7de1ae2c52c9a4739b9ba0cabdc1b34))
* **artifact:** isPdfUrl preview detector ([7437251](https://github.com/kitn-ai/chat/commit/743725176c41fe1a1882d68a1e27fe61586b23e7))
* **artifact:** PDF fallback card (open / download) ([62a18fc](https://github.com/kitn-ai/chat/commit/62a18fc786042d8aa0343d49648906c10e556121))
* **card-contract:** CardProvider + useCardHost native transport ([9909ca1](https://github.com/kitn-ai/chat/commit/9909ca18f110eed94923ea4e910bbb9d88d7238a))
* **card-contract:** emitCardEvent + routeCardEvent + listener ([2cf1f10](https://github.com/kitn-ai/chat/commit/2cf1f10c694e130d16e8665f3cbd3198805d088c))
* **card-contract:** export the foundation from the public barrel ([4d9fe9c](https://github.com/kitn-ai/chat/commit/4d9fe9ccfaf9d209a6f02e780284578c8f7039cd))
* **card-contract:** frozen contract types + version ([712e3a5](https://github.com/kitn-ai/chat/commit/712e3a55318f2ee37d1b8ec4e058b3bdaf44d2ee))
* **card-contract:** generative-UI foundation (types, validator, transport, schemas) ([8392275](https://github.com/kitn-ai/chat/commit/83922756d3c695d2e11a99e7e869353c8bdb42ae))
* **card-contract:** shared lean JSON-Schema validator ([a93281e](https://github.com/kitn-ai/chat/commit/a93281e27add3c2dccb28f12ec74afc92cbec9f0))
* **card-contract:** ship envelope/event schemas to dist/schemas ([99715de](https://github.com/kitn-ai/chat/commit/99715de1e5118c540f22c76a06f9523c05a96313))
* **cards:** integrate kc-card/kc-form/kc-link-card/kc-embed (register + barrel + regen) ([cf2ad3a](https://github.com/kitn-ai/chat/commit/cf2ad3ac5320e74f5fff4e7ecf0238bda50175e8))
* **cards:** integrate kc-confirm + kc-task-list (register + x-kc hints + regen) ([f832995](https://github.com/kitn-ai/chat/commit/f832995b012928f28dcaa5da0fc4fb73b74d109f))
* **cards:** kc-card base shell + kc-form JSON-Schema renderer ([b759978](https://github.com/kitn-ai/chat/commit/b759978903edfdfd507042bc9db8318271bee3d3))
* **cards:** kc-card, kc-form, kc-link-card, kc-embed (generative-UI cards) ([00e5884](https://github.com/kitn-ai/chat/commit/00e58849d88c93c86348db9f5b13708953969ec7))
* **cards:** kc-confirm + kc-task-list (approval cards) + Button destructive variant ([fb8d255](https://github.com/kitn-ai/chat/commit/fb8d255bdc534a762abb5be2b97a1890a55464a2))
* **cards:** kc-confirm + kc-task-list + full generative-UI card design pass ([f9acdc4](https://github.com/kitn-ai/chat/commit/f9acdc447abf35f9cf983c6444646bd099425ce9))
* **cards:** kc-link-card + kc-embed (display cards on the Card Contract) ([8b5a5bc](https://github.com/kitn-ai/chat/commit/8b5a5bcc4c92a29eec6e00de192c2f54b4744f64))
* **cards:** premium control design + Storybook light/dark + a11y fixes ([1855321](https://github.com/kitn-ai/chat/commit/18553213127a6c6b716a7f98cdca1b05a6c837dd))
* **cards:** redesign card chrome + form controls ([d6df789](https://github.com/kitn-ai/chat/commit/d6df789402b918e2bdef9f98aa9ea7217ac63b67))
* **pdf-preview:** config + enable/reset primitive scaffold ([49a0b87](https://github.com/kitn-ai/chat/commit/49a0b870f338df11df4ecef86c73a99ff404dff8))
* **pdf-preview:** export configurePdfPreview from the barrel ([8be2e6d](https://github.com/kitn-ai/chat/commit/8be2e6d6fbd8a10711598f8875da323f676858c8))
* **pdf-preview:** on-demand pdf.js loader + renderPdfInto ([c55b43e](https://github.com/kitn-ai/chat/commit/c55b43ea796c4ed16fd964dc024592c065943fa7))
* **resizable:** &lt;kc-resizable&gt; panel layout + level up the primitives ([7abc84b](https://github.com/kitn-ai/chat/commit/7abc84b6b2c432bef47c10c31bad75e3e4d99986))
* **resizable:** &lt;kc-resizable&gt; panel layout + level up the primitives ([656adeb](https://github.com/kitn-ai/chat/commit/656adebc5c19c8349b885b7e6170c83158dd342c))
* **stories:** Examples/ composition stories (catalog, composed shell, choosing-components) ([233858e](https://github.com/kitn-ai/chat/commit/233858ec4e04c342e36e623c97c10cca965824a0))
* **stories:** Examples/Catalog + Choosing-components overview (web components) ([10d2e81](https://github.com/kitn-ai/chat/commit/10d2e815250cd4d70091296cf1cd68af4b3ece23))
* **stories:** Examples/Composed chat shell (compose-your-own vs drop-in) ([10abceb](https://github.com/kitn-ai/chat/commit/10abcebc2e0303e3ea5bd829aa482fe45eb5eff1))


### Bug Fixes

* **a11y:** brighten destructive red in dark across the cards ([1163995](https://github.com/kitn-ai/chat/commit/1163995295591581540cb42ac9a00a0763c6653e))
* **a11y:** darken light-mode --color-destructive for WCAG contrast ([a245236](https://github.com/kitn-ai/chat/commit/a245236ff96a3fd4874d1bc26b5decfac43fde9a))
* **a11y:** label icon buttons/selects + fix contrast in story fixtures ([b1b464e](https://github.com/kitn-ai/chat/commit/b1b464e535b64188d057fa9dad7ae78408dd6334))
* **a11y:** WCAG AA fixes across component library + story fixtures ([994e738](https://github.com/kitn-ai/chat/commit/994e738c02e4377b00cbbf66b53fe86ebfb94fa8))
* **a11y:** WCAG AA fixes in component library (axe-clean) ([7a18461](https://github.com/kitn-ai/chat/commit/7a18461d20f00120aa249228c40041279229f867))
* **artifact:** make inline PDF scroll region keyboard-focusable ([767ce31](https://github.com/kitn-ai/chat/commit/767ce310557b907f270a2d95ace0e0c72a01a183))
* **cards:** null out native range-track border/groove ([9bda968](https://github.com/kitn-ai/chat/commit/9bda96872f439e83024ef5b24ee6e5a466277ace))
* **highlighter:** highlight TypeScript/TSX by default ([5686b4a](https://github.com/kitn-ai/chat/commit/5686b4a5ea4f9c8ccac3f8848126d9533ddd939f))
* **highlighter:** highlight TypeScript/TSX by default ([896a103](https://github.com/kitn-ai/chat/commit/896a10329b2f39183a137bfb46fde62587daaaab))

## [0.7.0](https://github.com/kitn-ai/chat/compare/chat-v0.6.0...chat-v0.7.0) (2026-06-13)


### Features

* **docs:** generate web-components.md tables from element-meta (between markers) ([bf0935f](https://github.com/kitn-ai/chat/commit/bf0935fdadf065b4cc62d5aeeca5033eeba6efdc))
* **elements:** declare typed Events maps on flagship facades (typed dispatch + generated detail shapes) ([a1ace5c](https://github.com/kitn-ai/chat/commit/a1ace5c317739af19c0e176893c298ef189983ac))
* **elements:** typed Events maps on remaining dispatching facades ([fd292ec](https://github.com/kitn-ai/chat/commit/fd292ec3022ca7fb252b1317525d8017487380f4))
* **gen:** add composedFrom links + component tokens to element spec ([04886b8](https://github.com/kitn-ai/chat/commit/04886b87a67b72f8390d391a4413497c2e0fc98b))
* **gen:** extract prop defaults + always emit element-meta.json ([1463793](https://github.com/kitn-ai/chat/commit/14637936022b9db8ae9954ddd672edc881c02c3d))
* **storybook:** API spec page + live Controls on flagship element stories ([96c1d8a](https://github.com/kitn-ai/chat/commit/96c1d8a8dcefe066e5ebb3d42afc968b6c638f79))
* **storybook:** API spec page on attachments/chain-of-thought/chat-scope-picker/checkpoint/code-block/context-meter element stories ([7dbfc0f](https://github.com/kitn-ai/chat/commit/7dbfc0ff97e2a09e5c649faef8300e372b916fd2))
* **storybook:** API spec page on empty/feedback-bar/file-upload/image/loader/markdown element stories ([9b4dd9f](https://github.com/kitn-ai/chat/commit/9b4dd9f74b272ba4094253e96c03f249ca2af754))
* **storybook:** API spec page on message-skills/message/model-switcher/prompt-suggestions/reasoning/response-stream element stories ([fd06dcc](https://github.com/kitn-ai/chat/commit/fd06dcc280a9f3c2430428f77ebab66e16d4dcd8))
* **storybook:** API spec page on source-list/source/text-shimmer/thinking-bar/tool/voice-input element stories ([6f2d3bd](https://github.com/kitn-ai/chat/commit/6f2d3bd8d0351db0966d4ba74ef8f253b11d1b52))
* **storybook:** ElementSpec doc-component + argTypesFor controls helper ([bb1ea25](https://github.com/kitn-ai/chat/commit/bb1ea25d8433825f4e437cb1b3fdfd25b35ae4f8))


### Bug Fixes

* **docs:** render payloadless event detail as — (not Record&lt;string, never&gt;) ([c32c436](https://github.com/kitn-ai/chat/commit/c32c436968556b9a2546c1afc1de478ba1a00a2a))

## [0.6.0](https://github.com/kitn-ai/chat/compare/chat-v0.5.0...chat-v0.6.0) (2026-06-13)


### Features

* **examples:** add runnable Angular example app ([dab40bd](https://github.com/kitn-ai/chat/commit/dab40bdd8972819a99b54df1fae7909f6710224d))
* **examples:** add runnable Vue example app ([97e9495](https://github.com/kitn-ai/chat/commit/97e94955be09470d2b1dffc3e209a8796d0e6245))
* **theme:** custom cross-platform scrollbars (thin, rounded, subtle, themed) ([ae9b83b](https://github.com/kitn-ai/chat/commit/ae9b83b55da50149fd863ea694417a7e9e51e328))

## [0.5.0](https://github.com/kitn-ai/chat/compare/chat-v0.4.0...chat-v0.5.0) (2026-06-13)


### Features

* **elements:** add &lt;kitn-chat-workspace&gt; (list + chat + resize) ([4d6f799](https://github.com/kitn-ai/chat/commit/4d6f79980b893537f8aafc85f170dc1f574ba58a))
* **storybook:** sidebar IA — Web Components first, Examples by importance ([da44605](https://github.com/kitn-ai/chat/commit/da446059487a2a910a1f03bbcf37d211edcc7905))
* **theme:** controlled blue focus ring across all components ([603e3c4](https://github.com/kitn-ai/chat/commit/603e3c41f929cf4104763d47c019c2923c615b2d))


### Bug Fixes

* **elements:** preserve chat draft across kitn-chat-workspace sidebar toggle ([339aa9e](https://github.com/kitn-ai/chat/commit/339aa9e59bb88c44e2ab6b780d21a22ee67eec51))

## [0.4.0](https://github.com/kitn-ai/chat/compare/chat-v0.3.1...chat-v0.4.0) (2026-06-13)


### ⚠ BREAKING CHANGES

* **ui:** remove @kobalte/core dependency (replaced by DIY overlay primitives)

### Features

* composable web-component layer — DIY accessible primitives, React wrappers, Storybook/docs, llms.txt ([501e7db](https://github.com/kitn-ai/chat/commit/501e7db4aa6b1861fd6981f4d167f03836b929ed))
* **docs:** generate llms.txt + llms-full.txt for AI-agent integration ([bd40c90](https://github.com/kitn-ai/chat/commit/bd40c90cc77f237f007d38f4a8cf816acdb19394))
* **elements:** composable web-component foundation + first three elements ([bb79a2a](https://github.com/kitn-ai/chat/commit/bb79a2af28c9b5892f5c491116e4a11e21f159b0))
* **elements:** fold SlashCommand into prompt-input + chat ([46709c8](https://github.com/kitn-ai/chat/commit/46709c8f79a3214548ec27dfd66804498710eb49))
* **elements:** generate Custom Elements Manifest from the facades ([bd9f18b](https://github.com/kitn-ai/chat/commit/bd9f18b30113405f6c8fed9efdd8df1f7f9cfecc))
* **elements:** generate typed HTMLElementTagNameMap d.ts ([9545780](https://github.com/kitn-ai/chat/commit/9545780ce5a4904da8de6df2944b5e0c211fd6f2))
* **elements:** phase 1 — message-rendering core elements ([ca26d95](https://github.com/kitn-ai/chat/commit/ca26d955ec7427c04202c3fa0ce68824a3380016))
* **elements:** phase 2 — header / meta elements ([2ea6595](https://github.com/kitn-ai/chat/commit/2ea659550eedb32e784546dbf61cdac8cb80b4b4))
* **elements:** phase 3 — input ecosystem elements ([1e09086](https://github.com/kitn-ai/chat/commit/1e09086ea9ffe82c1a540603f4b7e647d939b508))
* **elements:** phase 4 — indicators & leaf elements ([3a3b68e](https://github.com/kitn-ai/chat/commit/3a3b68ea16b4a4d066e529b83cc66118ebc4efe0))
* **examples:** docked, collapsible event console in the showcase ([25923ec](https://github.com/kitn-ai/chat/commit/25923ec2b79b587f774175f5c5d6a519541f5526))
* **prompt-input:** disallow leading whitespace in the prompt ([0ce580b](https://github.com/kitn-ai/chat/commit/0ce580b5783602b2999f38aab3eac6e8678330a4))
* **prompt-input:** insert slash command on select; configurable suggestion submit ([4229d6b](https://github.com/kitn-ai/chat/commit/4229d6bbf4b8bf3e8cb68173c86099332f774ec4))
* **react:** generated typed React wrappers (@kitnai/chat/react) ([faa4da4](https://github.com/kitn-ai/chat/commit/faa4da432b28f6bfce116e08376012a2648c8ab6))
* **react:** wrapper verification, native-style examples/react demo, React wrapper tests ([b142cb6](https://github.com/kitn-ai/chat/commit/b142cb6a1e10a59abaa3ea38d4f076cc653864e2))
* **theme:** ship browser-ready theme.tokens.css for &lt;link&gt;/CDN consumers ([2ec93c4](https://github.com/kitn-ai/chat/commit/2ec93c459a325a0414ba345019bacdc57d99794f))
* **theme:** tokenized typography scale + consistent component sizing ([4dc46e2](https://github.com/kitn-ai/chat/commit/4dc46e2fd271803d73de42beec6ce0da22f8411a))
* **ui:** add @floating-ui/dom dep + createPresence overlay primitive ([a327a7c](https://github.com/kitn-ai/chat/commit/a327a7cd9fd1d90ed2fcdb13582f2a463d3846fa))
* **ui:** add usePosition (autoUpdate) + useDismiss + As to overlay core ([a459ec5](https://github.com/kitn-ai/chat/commit/a459ec5e872d5982734cc9fe272a524864bffa1c))
* **ui:** emit data-state on Collapsible root/trigger so consumer chevron-rotation classes work ([f4be7ad](https://github.com/kitn-ai/chat/commit/f4be7ad41550c17a92dc8dbb14ebc0be7ac03d8b))
* **ui:** reimplement Collapsible without Kobalte (grid-rows anim, inert on close) ([c9ae2a7](https://github.com/kitn-ai/chat/commit/c9ae2a71041998ab496c065eef3fce2e5910ea5c))
* **ui:** reimplement Dropdown menu on overlay core (roving focus, typeahead, no scroll-lock, follows scroll) ([3575b7c](https://github.com/kitn-ai/chat/commit/3575b7c35b699526f31f598339f98dbca34e47ee))
* **ui:** reimplement HoverCard with deterministic shared-timer machine (HC-1); migrate context.tsx ([968a1b4](https://github.com/kitn-ai/chat/commit/968a1b4af2bdf6e894d736de187d71a38dbc1cf7))
* **ui:** reimplement Tooltip on overlay core (role=tooltip, aria-describedby) ([b06c4f5](https://github.com/kitn-ai/chat/commit/b06c4f56a16913e2b98f12ece4da71fab5f106b7))
* **ui:** remove @kobalte/core dependency (replaced by DIY overlay primitives) ([a1b9e1f](https://github.com/kitn-ai/chat/commit/a1b9e1ff826eea380c50581b46fcd035594ed2cb))


### Bug Fixes

* **a11y,examples:** darken showcase --muted token to meet AA (0 axe violations, light+dark) ([18577be](https://github.com/kitn-ai/chat/commit/18577bee0859c91da1c026a72444cd237b08a337))
* **a11y,examples:** keyboard-accessible event log (scrollable-region) + update bundle figure to ~80kb ([503e821](https://github.com/kitn-ai/chat/commit/503e8218a12a906d7acea95b62651449e1d151e1))
* **a11y:** accessible names on icon buttons + visible focus (WCAG 2.1 AA, A1/A3) ([812348a](https://github.com/kitn-ai/chat/commit/812348a28f65b518c8c33d8acf7d22d0881fcb9c))
* **a11y:** raise muted/subtle text contrast to WCAG 2.1 AA (A2, light+dark) ([0668785](https://github.com/kitn-ai/chat/commit/06687852c8c8bf675e8c6f7a7564d8671874c40a))
* **checkpoint:** use a button factory so tooltip variant doesn't share a DOM node ([e5971c2](https://github.com/kitn-ai/chat/commit/e5971c2793b2838690171ccdcd188639c6db08e3))
* **components,examples:** font sizes, attachment layout, showcase polish ([7efd3e1](https://github.com/kitn-ai/chat/commit/7efd3e143cf4dc12fec88aecae64bfe6eacdc443))
* **elements:** apply flag() to existing element booleans + docs ([9cdc85b](https://github.com/kitn-ai/chat/commit/9cdc85bc0c37c2b1c7405fae5a6178c0a3898d00))
* **elements:** make --color-*/--text-* overridable from :root in shadow DOM ([b6b998e](https://github.com/kitn-ai/chat/commit/b6b998e8b19eda6c9c944deeb6768ab2e3869689))
* **examples:** composable showcase follows OS dark mode on first paint ([518bd56](https://github.com/kitn-ai/chat/commit/518bd56930fcba8844821ca302c8643c38a56bbe))
* **theme:** harmonize dark surface tokens with the warm background ([6022492](https://github.com/kitn-ai/chat/commit/60224927beebdc1586afaf1e867476524e96aec0))
* **ui:** dropdown roving focus works inside Shadow DOM ([58c4096](https://github.com/kitn-ai/chat/commit/58c4096a750f8427663bc7e66b554fe158023d26))
* **ui:** dropdown Tab closes without stealing focus; skip disabled items; clarify focus timing ([46df213](https://github.com/kitn-ai/chat/commit/46df213d2b39726fecf551cc41099dc87280d284))
* **ui:** gate Tooltip content on presence so exit animation plays; await async unmount in test ([1a12a6e](https://github.com/kitn-ai/chat/commit/1a12a6e1b5713381d5c0698f1f40ade8e53d05de))
* **ui:** guard createPresence microtask close; broaden setRef type; add docs + tests ([11b0d65](https://github.com/kitn-ai/chat/commit/11b0d652d2599f708a196bc5d4ac366d73e870e3))
* **ui:** harden Collapsible prop forwarding (id/onClick), data-closed parity, tests ([d8afc02](https://github.com/kitn-ai/chat/commit/d8afc02a191ca65e31b7b40b8950cd830802eee1))
* **ui:** hover-card safe-area (transparent-gap bridge + 300ms closeDelay) so pointer can cross to content ([726519f](https://github.com/kitn-ai/chat/commit/726519f14e8deafeed5abd65a96c87d6bf7a06de))
* **ui:** make tooltip/hover-card refs reactive so floating position computes (C-1); hover-card focus persistence + instant Escape ([8ab1f70](https://github.com/kitn-ai/chat/commit/8ab1f704b2ef3d4ff8060f0274de6fc75a3fe4a0))
* **ui:** register custom text-* size utilities with tailwind-merge; explicit thinking-bar size ([09e4e7e](https://github.com/kitn-ai/chat/commit/09e4e7e4a61a7417d4ca4e4cbdd0c9b56e7a31d2))
* **ui:** tooltip stays open while focused or hovered; clean up hover timer ([0264710](https://github.com/kitn-ai/chat/commit/0264710673a646bd98eb5e74980fe3052307f40a))

## [0.3.1](https://github.com/kitn-ai/chat/compare/chat-v0.3.0...chat-v0.3.1) (2026-06-11)


### Bug Fixes

* **elements:** inherited text color follows light/dark (attachment labels, etc.) ([e39dc1a](https://github.com/kitn-ai/chat/commit/e39dc1a305586ef613ce470a83068bb1588f9a89))
* **elements:** inherited text color follows the element's light/dark mode ([dae7f0a](https://github.com/kitn-ai/chat/commit/dae7f0a27d6b9548e2fb4ab5ec5cb6cc4ab5aaca))

## [0.3.0](https://github.com/kitn-ai/chat/compare/chat-v0.2.0...chat-v0.3.0) (2026-06-11)


### Features

* attachment support in the web-component input ([59d2c55](https://github.com/kitn-ai/chat/commit/59d2c55cbe3598fa0f8bb277212cfb7b10733aa8))
* **elements:** attachment support in the web-component input ([6cedda3](https://github.com/kitn-ai/chat/commit/6cedda328f783b33ff68a32cbe2717b50c1bec3b))
* **elements:** bring &lt;kitn-chat&gt; web component to full-chat parity ([dbd1c24](https://github.com/kitn-ai/chat/commit/dbd1c240cebf707a3ce10242a451936b2713c0e0))
* **examples:** add React + Vite example using kitn-chat web components ([5b836bb](https://github.com/kitn-ai/chat/commit/5b836bb3e43c138b549bb276df0a43238de2ddb6))
* **examples:** add SolidJS primitives example (Vite + Tailwind v4) ([6dea25f](https://github.com/kitn-ai/chat/commit/6dea25f979fc2cf00e0b147e838fd3f3030039a9))
* full story parity for &lt;kitn-chat&gt; (header, model switcher, context, scroll button, toolbar) ([aae1541](https://github.com/kitn-ai/chat/commit/aae15414bc82a35bb53ce3372947bb7087b926c0))


### Bug Fixes

* **build:** minify ES lib chunks via generateBundle esbuild pass ([ff49688](https://github.com/kitn-ai/chat/commit/ff49688475f1cde620314e2d49a5195f33b1b0f9))
* **build:** minify the library bundle (Vite skips minify for ESM lib builds) ([13cb3f5](https://github.com/kitn-ai/chat/commit/13cb3f5514f7a56967503bece53d0ed9d5f93f6a))
* **conversation-list:** smaller conversation labels; docs(web-components): full API reference ([ceff6fa](https://github.com/kitn-ai/chat/commit/ceff6fa52598ba952d6b53b0bc5d4226e2071940))
* **conversation-list:** smaller labels + docs(web-components): full API reference ([e29698e](https://github.com/kitn-ai/chat/commit/e29698e4975e9b3a59a9a8fa2a112f432b6e5e91))

## [0.2.0](https://github.com/kitn-ai/chat/compare/chat-v0.1.0...chat-v0.2.0) (2026-06-11)


### Features

* CDN full-chat example + web-component icon fix + curated highlighter defaults ([766b3e8](https://github.com/kitn-ai/chat/commit/766b3e8d8211abce9e7c41e823afb570243e6111))
* **chat-config:** add portalMount accessor for shadow-root portals ([b25e796](https://github.com/kitn-ai/chat/commit/b25e796cea2ed76db7b53a68dab715d0363af2c5))
* **chat-config:** default text size sm -&gt; base (16px) for readability ([0cf7c49](https://github.com/kitn-ai/chat/commit/0cf7c4935f43a5e46e2dc0d86d535269c10dbe3f))
* **elements:** add &lt;kitn-chat&gt; data-driven message renderer ([fc4b0a8](https://github.com/kitn-ai/chat/commit/fc4b0a8aef77154a19e6c023be8b9f9fa71321a0))
* **elements:** add &lt;kitn-conversation-list&gt; ([75ecc23](https://github.com/kitn-ai/chat/commit/75ecc237fb4f4a5d167fc3d38f02cc5cd4a249cd))
* **elements:** add &lt;kitn-prompt-input&gt; ([a69ec56](https://github.com/kitn-ai/chat/commit/a69ec5639b4ac7186668a66c7fbf77786f9339a9))
* **elements:** add defineKitnElement shadow-DOM wrapper helper ([80d049f](https://github.com/kitn-ai/chat/commit/80d049f8592fd990ce94f96f191720c4dfab4a11))
* **elements:** add registration entry, Vite library build, ./elements export ([52ff40f](https://github.com/kitn-ai/chat/commit/52ff40f692681d703ca4c4716f68a301c0f33b50))
* **elements:** compile kit Tailwind CSS to an injectable string ([ab3acd4](https://github.com/kitn-ai/chat/commit/ab3acd4508bc4bbbb71efa7f2ec00596c8aefc11))
* **elements:** light/dark/auto theme support for web components ([c8992e4](https://github.com/kitn-ai/chat/commit/c8992e4facb332d94cc83c2aa6751ac365c5d67b))
* **elements:** render message attachments in &lt;kitn-chat&gt; ([6717222](https://github.com/kitn-ai/chat/commit/6717222b39bc2730acb58c095ce0a908c5f00367))
* **elements:** shared DefaultPromptInput with suggestions + loading/disabled wiring ([85272e5](https://github.com/kitn-ai/chat/commit/85272e5b9ae9bd7c9d59aa87b45876b2dc799031))
* full-screen theme editor (light/dark, presets, live chat preview) ([c656735](https://github.com/kitn-ai/chat/commit/c656735690c5a050e61d414ddfcc73795354e564))
* **highlighter:** curate default language set (bash, javascript, html, css, json) ([c2c2492](https://github.com/kitn-ai/chat/commit/c2c24928fe55a163fbce5973eb02f6fda33f0bb4))
* **highlighter:** on-demand, no-WASM Shiki; ESM-only build ([7c121d2](https://github.com/kitn-ai/chat/commit/7c121d25521cfd32bf9d7ac623884b4124393616))
* **highlighter:** trim default languages to 5 core (js/ts/tsx/json/bash) ([c8c75bd](https://github.com/kitn-ai/chat/commit/c8c75bdd64a775f7830445a8d053eccaf8b13f80))
* **stories:** add controls/actions/autodocs convention exemplar (Button) ([b99a10c](https://github.com/kitn-ai/chat/commit/b99a10c9c198c2ae2b86ca403fca8faf372a6f23))
* **stories:** bake import-line snippets + web-component story exemplar ([072297a](https://github.com/kitn-ai/chat/commit/072297ad5236b01da20c43116b850a00df18cc57))
* **stories:** controls, actions, autodocs + copyable snippets across all components ([0045ba1](https://github.com/kitn-ai/chat/commit/0045ba1dfb118fb4899df34d5855ff3b513c5a57))
* **storybook:** sync dark/light across the whole UI via storybook-dark-mode ([53b5398](https://github.com/kitn-ai/chat/commit/53b5398830b7ecd8e5af7ea1949533c0bb909bad))
* **theme-editor:** compose editor (state, injected style, top bar) ([3315e05](https://github.com/kitn-ai/chat/commit/3315e056b18cf2537a5e4c3361a201280940b3a2))
* **theme-editor:** full-theme presets (Default/Violet/Emerald/Mono) ([f197554](https://github.com/kitn-ai/chat/commit/f197554fbc6101c0b7ef47f01b857289383e620d))
* **theme-editor:** fullscreen 'Theming/Editor' story ([7332c97](https://github.com/kitn-ai/chat/commit/7332c97d120e47007a8ca440f7ff98d7485b42f1))
* **theme-editor:** inspector panel (swatches + radius slider) ([2e28512](https://github.com/kitn-ai/chat/commit/2e2851232c7e57e175b07120304efb3b1e6b7cb0))
* **theme-editor:** pure :root/.dark CSS exporter ([cdc9d1e](https://github.com/kitn-ai/chat/commit/cdc9d1efc48ea8a0108c6cdff0d3b510afe4de57))
* **theme-editor:** realistic chat preview canvas + coverage rail ([5d27c0d](https://github.com/kitn-ai/chat/commit/5d27c0dce803758f6392c3bedbf1640417935528))
* **theme:** blue accent for inline code (borderless chip, mode-aware) ([c21b1b7](https://github.com/kitn-ai/chat/commit/c21b1b78f7df25d45ef1c92cf9a17f3c90cd9e9d))
* **ui:** route Kobalte overlays through ChatConfig.portalMount ([18f6425](https://github.com/kitn-ai/chat/commit/18f64254c4529af36646ab06916ccf51d726d85e))


### Bug Fixes

* **elements:** correct defineKitnElement component-callback typing ([b33d284](https://github.com/kitn-ai/chat/commit/b33d284446e9c3dea5524eb746a42950456442ac))
* **elements:** make custom events non-bubbling to avoid host collisions ([b90a395](https://github.com/kitn-ai/chat/commit/b90a3957a896722c17ec6f20976801b03f4b6c78))
* **elements:** render real action icons in &lt;kitn-chat&gt; ([d7a6d21](https://github.com/kitn-ai/chat/commit/d7a6d21dcf26eb67e24137799d3183cee0b9870f))
* hide Storybook addon panel on presentational stories (SB10 manager config) ([db01af2](https://github.com/kitn-ai/chat/commit/db01af27b3b2b003219f7a73be9b7f44d2c225d8))
* **stories:** dark preview toolbar + real copyable source snippets ([49dafe2](https://github.com/kitn-ai/chat/commit/49dafe2f5a6188367d2cd6e8066c7d2be87c4489))
* **storybook:** dark-mode args-table controls (select/input/toggle/button) ([72d9f7b](https://github.com/kitn-ai/chat/commit/72d9f7b2655ab50839770574437f7b874881a52a))
* **storybook:** dark-mode markdown contrast + render full-chat example inline ([350baef](https://github.com/kitn-ai/chat/commit/350baefb8a6dd4d22dbd3757bad8c44a0c43539b))
* **storybook:** hide addon panel via manager layoutCustomisations (SB10) ([b9f3337](https://github.com/kitn-ai/chat/commit/b9f3337156029423ff9bc1d0c8ac096abdd724de))
* **theme-editor:** make swatch color reactive to active mode ([046e013](https://github.com/kitn-ai/chat/commit/046e01320ea0a5917ef31d5e549d7c9512e093e0))
* **theme-editor:** re-root inherited color/color-scheme on the canvas wrapper ([5de968c](https://github.com/kitn-ai/chat/commit/5de968c44f711c66744aeea3fdc949f33eeb7676))
* **theme-editor:** recurse [@layer](https://github.com/layer) for token discovery; reuse real chat scene ([69231b3](https://github.com/kitn-ai/chat/commit/69231b32ff6c7a502bfd2a593e9c4e65babb4bf8))
* **theme-editor:** scope live preview to the canvas, independent of ancestor .dark ([d8a164f](https://github.com/kitn-ai/chat/commit/d8a164ffcf54ef278efdf4262534fd1e97be6113))
* **theme-editor:** wire radius scale to canvas; larger non-mono token labels ([836a06e](https://github.com/kitn-ai/chat/commit/836a06eafb7b824950fe691015d90e0d65130f72))


### Performance Improvements

* **code-block:** use shiki/bundle/web (~78 langs) instead of full bundle ([78b7fa9](https://github.com/kitn-ai/chat/commit/78b7fa9bfa1c55fc97db741719cc7958838b1016))
