# Changelog

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
