import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { transform } from 'esbuild';
// Rollup's output types come through vite's `Rollup` namespace re-export, NOT as
// named exports: vite imports OutputBundle/OutputChunk from rollup for its own
// declarations and never re-exports them, so `import type { OutputBundle } from
// 'vite'` is TS2459 ("declares it locally, but it is not exported") and `chunk`
// silently degrades to unknown. Same fix in vite.config.elements.ts.
//
// vite.config.elements.ts carried its own copy of that note, verbatim:
//
// Via vite's `Rollup` namespace re-export — see the note in vite.config.ts; the
// named form is TS2459 and leaves `chunk` unknown.
//
// Both configs live in this file now, so the two copies are one import and one
// note. The two notes are verbatim, so they still name `vite.config.ts` (now the
// `register` target below, KAI_BUILD=register) and `vite.config.elements.ts` (now
// the `split` target below, KAI_BUILD=split). Both files are gone.
import type { Plugin, Rollup, UserConfig } from 'vite';

type OutputBundle = Rollup.OutputBundle;
type OutputChunk = Rollup.OutputChunk;

// The two web-components bundles.
//
//   KAI_BUILD=register -> dist/kai.es.js, the coarse register-all facade. This
//     is the ONLY build in the chain with emptyOutDir:true writing to dist/
//     root, which is why it runs FIRST: anything built before it is deleted.
//
//   KAI_BUILD=split -> dist/web-components/<name>.js, one self-registering module per
//     tag, driven by src/web-components/web-component-manifest.json. Runs inside
//     build:web-components, between gen-web-components-manifest.mjs (which writes the
//     manifest) and gen-web-component-dts.mjs.
//
// They stay two targets rather than one multi-entry build because their
// rollupOptions.output differ: register writes kai.[format].js at dist/ root
// with tree-shaking OFF, split writes web-components/[name].js plus hashed chunks.
// vite's output config is per build, not per entry.
//
// Selected by KAI_BUILD. See config/vite/lib.ts's header for why an env var and
// not --mode.

// This file lives two levels below the package root, so entries resolve from
// PKG rather than __dirname.
const PKG = resolve(__dirname, '../..');

// Was duplicated verbatim in vite.config.ts and vite.config.elements.ts, the two
// files now merged into the `register` and `split` targets below.
// The `import(` rewrite marks the emitted dynamic imports @vite-ignore so a
// consumer's bundler leaves the lazy chunk boundaries alone.
//
// Vite 6 skips minification for `build.lib` + ES builds; re-minify every chunk in
// generateBundle (after all renderChunk hooks) with esbuild.
function libMinifyPlugin(): Plugin {
  return {
    name: 'lib-minify',
    enforce: 'post',
    apply: 'build',
    async generateBundle(_outputOptions, bundle: OutputBundle) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          const result = await transform((chunk as OutputChunk).code, {
            minify: true,
            legalComments: 'none',
          });
          // esbuild drops /* @vite-ignore */ (not a "legal" comment). Our only template-literal
          // dynamic imports are intentional runtime-only loads (pdf.js CDN, the autoloader) that
          // must stay un-analyzed; re-annotate them so downstream bundlers don't warn.
          (chunk as OutputChunk).code = result.code.replace(/import\(`/g, 'import(/*@vite-ignore*/`');
        }
      }
    },
  };
}

// Coarse register-all build → dist/kai.es.js (the default `@kitn.ai/ui/web-components`).
//
// This is a SINGLE-entry build, so register-impl + all web components land in ONE coarse
// chunk that loads fast — registration completes quickly. (The per-web-component / autoloader
// SPLIT build is separate, in vite.config.elements.ts → dist/web-components/. We deliberately
// keep the two builds apart: a unified build forced register-all to use the per-web-component
// chunk granularity — ~41 web-component chunks — which made registration slow enough to expose
// prop-before-upgrade races in consumers. The default path must stay coarse + fast.)
//
// Note: in this merged file the SPLIT build is the `split` target below rather than a
// separate config file. They are still two separate vite invocations, which is what
// "keep the two builds apart" means; only the file they are written in is shared.
function registerConfig(): UserConfig {
  return {
    plugins: [solidPlugin(), libMinifyPlugin()],
    build: {
      lib: {
        entry: resolve(PKG, 'src/web-components/register/register.ts'),
        name: 'Kai',
        fileName: (format) => `kai.${format}.js`,
        formats: ['es'],
      },
      // This is the register-ALL bundle: by design it must include every web component's
      // registration side effect. Rollup otherwise strips register-impl to an EMPTY
      // module — the web-component registration calls carry Solid's `/*#__PURE__*/`
      // annotations and Vite marks the web-component modules side-effect-free at resolve
      // time, which beats any `treeshake.moduleSideEffects` option. Only fully
      // disabling tree-shaking is reliable for a register-ALL entry. `allow-extension`
      // lets the entry chunk absorb its own code instead of emitting a re-export
      // facade, so kai.es.js itself holds the `import("./register-impl-*")` boundary
      // (register-impl stays a lazy chunk — it must, for SSR-import safety).
      rollupOptions: {
        treeshake: false,
        preserveEntrySignatures: 'allow-extension',
      },
      emptyOutDir: true,
    },
  };
}

// Per-web-component build. Entries land in dist/web-components/ (one self-registering
// module per web component + the autoloader); shared code (Solid runtime,
// defineWebComponent, compiled CSS, marked, …) code-splits into lazy chunks written
// to dist/ itself — NOT dist/web-components/chunks/ — deliberately, and is shared across
// entries. outDir is `dist` (not `dist/web-components`) precisely so chunkFileNames can
// place those lazy chunks at the SAME level as the earlier lib builds' own dist/
// output: this build runs last in `build` (see package.json), and Rollup names a
// chunk from a hash of its rendered code (computed before our post-pass minifier
// runs), so the on-demand highlighter's grammar/theme chunks — shiki's
// typescript/tsx/javascript/html/css/json/bash/svelte/vue grammars, the github-*
// themes, engine-javascript — hash identically here and in the barrel/solid builds
// that also pull the highlighter in. Same hash + same directory means the file this
// build writes lands on the exact path an earlier build already wrote, so npm packs
// one copy instead of two (this is what verify-pack-weight.mjs's 2026-08-26 dedupe
// fix relies on — see its ceiling-history comment). Chunks unique to this build
// (per-web-component Solid modules) get unique hashes and just live in dist/ alongside
// everything else; nothing about their content or count changes, only their path.
//   - index.js      — registers ALL web components (the SSR-safe register.ts; the
//                     default @kitn.ai/ui/web-components behavior, unchanged)
//   - <file>.js     — one self-registering module per web component (@kitn.ai/ui/web-components/<file>)
//   - autoloader.js — the opt-in DOM autoloader (@kitn.ai/ui/autoloader)
//
// Everything is bundled (self-contained) so the modules work BOTH for bundler
// tree-shaking (import one web component → bundler includes only its chunks) AND for the
// CDN autoloader (no import map needed). Deps are shared across entries, so there
// is no per-web-component duplication of Solid/CSS/marked.
function splitConfig(): UserConfig {
  // Read LAZILY, inside this function, so the `register` target never reads the
  // `split` target's input.
  //
  // The brief for this merge said a module-scope read would break `register` on
  // a fresh tree, because the manifest does not exist until build:web-components
  // runs. That is NOT true, and it was checked rather than assumed:
  // src/web-components/web-component-manifest.json is generated by gen-web-components-manifest.mjs
  // but it is also COMMITTED, and src/web-components/web-component/web-component-diagnostics.ts imports it
  // as a source module. Moving it aside does not reach this read at all; it
  // fails the register build earlier, at rollup resolution
  // ("Could not resolve ./web-component-manifest.json from web-component-diagnostics.ts").
  //
  // So the lazy read is structure, not a fix. It keeps each target's inputs to
  // itself, which is the property that lets a target be added or reordered here
  // without a module-scope side effect firing for every other one.
  const manifest = JSON.parse(
    readFileSync(resolve(PKG, 'src/web-components/web-component-manifest.json'), 'utf8'),
  );
  const entry: Record<string, string> = {
    autoloader: resolve(PKG, 'src/web-components/autoloader/autoloader.ts'),
    // kai-remote is wrapped (React `Remote`) + exported via the `./web-components/*` subpath,
    // but it is intentionally NOT in the register-all bundle (register-impl.ts) — it's an
    // opt-in sandboxed cross-origin iframe card. It's therefore absent from
    // web-component-manifest.json (built from register-impl.ts), so build its per-web-component module
    // explicitly here so `@kitn.ai/ui/web-components/remote` resolves to a real dist file.
    remote: resolve(PKG, 'src/web-components/remote/remote.tsx'),
  };
  // The manifest's keys are BASENAMES -- they ARE the public module name
  // (dist/web-components/<basename>.js, i.e. `@kitn.ai/ui/web-components/<basename>`),
  // which is why folding the layer into family folders is invisible to consumers.
  // The sources live in those folders now, so each is located by a recursive walk
  // with a duplicate check: resolve-by-unique-basename, the rule the guards use,
  // because a basename survives a move and a deep path does not.
  const byBasename = new Map<string, string>();
  const walkSources = (dir: string): void => {
    for (const dirent of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, dirent.name);
      if (dirent.isDirectory()) { walkSources(full); continue; }
      const m = /^(.+)\.(tsx|ts)$/.exec(dirent.name);
      if (!m) continue;
      const prior = byBasename.get(m[1]);
      if (prior) throw new Error(`two sources named '${m[1]}': ${prior} and ${full}`);
      byBasename.set(m[1], full);
    }
  };
  walkSources(resolve(PKG, 'src/web-components'));
  for (const file of Object.keys(manifest.files)) {
    const p = byBasename.get(file);
    if (!p) throw new Error(`the manifest names '${file}' but no source of that basename exists under src/web-components/`);
    entry[file] = p;
  }
  return {
    plugins: [solidPlugin(), libMinifyPlugin()],
    build: {
      // The per-web-component + autoloader SPLIT build → dist/web-components/ (one self-registering
      // module per web component + the autoloader, with shared chunks deduped into dist/ —
      // see the file-header comment for why outDir is `dist` and not `dist/web-components`).
      // Runs AFTER the coarse register-all build (vite.config.ts) AND the barrel build,
      // which emits type declarations for ALL of src/** — including dist/web-components/*.d.ts
      // (e.g. dist/web-components/chat-types.d.ts, referenced by dist/index.d.ts and
      // dist/state/*.d.ts). emptyOutDir MUST stay false so this JS-only build does not
      // wipe those barrel-emitted declarations (or the earlier builds' own dist/*.js)
      // out from under the published type graph (dist is already cleared once at the
      // very start by vite.config.ts).
      //
      // Note: in this merged file the coarse register-all build is the `register` target
      // above, so "dist is already cleared once at the very start" now means
      // `KAI_BUILD=register vite build --config config/vite/web-components.ts`, the first link
      // of the `build` chain.
      outDir: 'dist',
      emptyOutDir: false,
      lib: { entry, formats: ['es'] },
      rollupOptions: {
        output: { entryFileNames: 'web-components/[name].js', chunkFileNames: '[name]-[hash].js' },
      },
    },
  };
}

const TARGETS: Record<string, () => UserConfig> = {
  register: registerConfig,
  split: splitConfig,
};

const requested = process.env.KAI_BUILD ?? '';
// Own keys only -- see the note at the same guard in config/vite/lib.ts.
if (!Object.hasOwn(TARGETS, requested)) {
  throw new Error(
    `config/vite/web-components.ts: KAI_BUILD must be one of [${Object.keys(TARGETS).join(', ')}], got ${JSON.stringify(process.env.KAI_BUILD)}`,
  );
}
const build = TARGETS[requested];

export default defineConfig(build());
