import { defineConfig, type Plugin } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';

// ─────────────────────────────────────────────────────────────────────────────
// Workaround for a packaging bug in @kitn.ai/ui@0.17.0 (remove once fixed
// upstream — see this example's README for the full write-up).
//
// The published `@kitn.ai/ui/react` wrappers register each element with a
// client-only `import('@kitn.ai/ui/elements/<element-short-name>')`. For ~11
// elements that short name does NOT match the file actually shipped in
// `dist/elements/` (the wrapper says `conversations`, the file is
// `conversation-list.js`). The package's `"./elements/*"` export maps the
// specifier to a path that doesn't exist, so any bundler that statically
// resolves dynamic-import specifiers — Vite's dev import-analysis, esbuild's dep
// optimizer, Rollup at build — hard-fails the moment ANY wrapper is imported
// (the whole `react.js` module is in the graph).
//
// This plugin rewrites those specifiers to the real files. With it, all wrappers
// resolve; without it the example 500s on the client route chunk. The element
// names below are the authoritative map from the package's own `autoloader.js`.
const SUBPATH_FIX: Record<string, string> = {
  confirm: 'confirm-card',
  context: 'context-meter',
  conversations: 'conversation-list',
  'resizable-item': 'resizable',
  'scope-picker': 'chat-scope-picker',
  skills: 'message-skills',
  sources: 'source',
  suggestions: 'prompt-suggestions',
  'toast-region': 'toast',
  workspace: 'chat-workspace',
};
// `kai-remote` ships no standalone per-element file at all; point it at an empty
// module (the example never renders it).
const MISSING = new Set(['remote']);
const EMPTY_ID = '\0kitn-empty-element';

function kitnElementsSubpathFix(): Plugin {
  return {
    name: 'kitn-elements-subpath-fix',
    enforce: 'pre',
    async resolveId(source, importer) {
      const m = source.match(/^@kitn\.ai\/ui\/elements\/([a-z-]+)$/);
      if (!m) return null;
      const name = m[1];
      if (MISSING.has(name)) return EMPTY_ID;
      const fixed = SUBPATH_FIX[name];
      if (!fixed) return null; // already-correct subpath (button, chat, …)
      const r = await this.resolve(`@kitn.ai/ui/elements/${fixed}`, importer, {
        skipSelf: true,
      });
      return r?.id ?? null;
    },
    load(id) {
      if (id === EMPTY_ID) return 'export {}';
    },
  };
}
// ─────────────────────────────────────────────────────────────────────────────

// https://tanstack.com/start/latest — TanStack Start is a full-stack React
// framework: every route is server-rendered, then hydrated on the client.
//
// `@kitn.ai/ui` is built with SolidJS but ships framework-agnostic custom
// elements. `@kitn.ai/ui/react` provides typed React wrappers that register the
// elements **client-only** (inside a layout effect) and assign array/object
// props as live DOM *properties*. SSR emits the bare `<kai-*>` tags; the client
// hydrates, registers and populates them — no work needed on the server.
//
// Consumer settings that matter:
//
//  - Leave `@kitn.ai/ui` external to the SSR build (the default — do NOT add it
//    to `ssr.noExternal`). The per-element registration imports only run in the
//    browser, so the server just renders bare tags. Forcing it into the SSR
//    bundle makes esbuild eagerly resolve those imports and trips the bug above.
//
//  - Exclude it from the dev dependency pre-bundler. esbuild's optimizer doesn't
//    run Vite plugins, so the subpath fix above wouldn't apply there; excluding
//    it routes the package through the normal plugin pipeline where the fix runs.
export default defineConfig({
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['@kitn.ai/ui'],
  },
  plugins: [
    kitnElementsSubpathFix(),
    // TanStack Start's plugin MUST come before React's.
    tanstackStart(),
    viteReact(),
  ],
});
