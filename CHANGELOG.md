# Changelog

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
