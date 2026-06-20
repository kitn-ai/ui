import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

// Fourth build (after main + provider; the MCP build can follow). Compiles the
// React subpath entry (frameworks/react/index.tsx + its ./runtime) to a compiled
// ESM bundle + generated .d.ts, so consumers resolve `@kitn.ai/ui/react` to
// JS+.d.ts — never the raw .tsx SOURCE (which, when a consumer's tsc walks it,
// would compile the wrapper under the consumer's React/Vue/Svelte JSX config and
// error — see LIB-2). The wrapper + runtime are bundled inline in the JS; only
// React is external (a peer dep the host provides).
//
// tsconfigPath: tsconfig.react.json — frameworks/ is EXCLUDED from the root
// tsconfig (which is Solid-JSX); the react tsconfig includes frameworks/**/*.tsx
// under react-jsx. Without this the dts plugin generates nothing for this build.
//
// We do NOT use rollupTypes here: api-extractor mis-resolves the entry when
// invoked alongside the Solid barrel (it followed package.json/tsconfig and
// emitted the SOLID component surface instead of the React wrappers). Instead we
// emit flat per-file .d.ts into a dedicated dist/react/ dir (entry index.d.ts +
// runtime.d.ts), which sidesteps both the api-extractor bug and any collision
// with the barrel build's dist/index.d.ts. The exports map points
// `./react` "types" at dist/react/index.d.ts.
//
// emptyOutDir: false — the main build (vite.config.ts) ran first with
// emptyOutDir: true; we must NOT clobber its dist output.
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: 'tsconfig.react.json',
      include: ['frameworks/react/**'],
      outDir: 'dist/react',
      entryRoot: 'frameworks/react',
    }),
  ],
  resolve: {
    // Map the register.ts source import to the package's own ./elements subpath.
    // The elements bundle is pre-built (vite.config.ts → dist/kitn-chat.es.js);
    // we can't re-compile Solid TSX in this build (no solid plugin). By aliasing
    // to a virtual '@kitn.ai/ui/elements' package specifier (which we then mark
    // external), the emitted react.js ships:
    //   import '@kitn.ai/ui/elements';
    // so any consumer bundler resolves it to dist/kitn-chat.es.js at install time.
    alias: {
      '../../src/elements/register': '@kitn.ai/ui/elements',
    },
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'frameworks/react/index.tsx'),
      formats: ['es'],
      fileName: () => 'react.js',
    },
    rollupOptions: {
      // React is a peer dep — the consumer provides it.
      // @kitn.ai/ui/elements (the aliased elements bundle) is also external:
      // it's a sibling subpath of this same package, pre-built separately.
      external: ['react', 'react-dom', 'react/jsx-runtime', '@kitn.ai/ui/elements'],
    },
  },
});
