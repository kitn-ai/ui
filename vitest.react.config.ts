import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// SEPARATE React test config — deliberately NOT the root vitest.config.ts.
//
// The root config registers `vite-plugin-solid` GLOBALLY, which transforms ALL
// JSX as SolidJS. React `.tsx` tests would break under that. So React wrapper
// tests live here, transformed by `@vitejs/plugin-react` instead, and run via
// `npm run test:react` (kept out of the default `npm test`).
//
// The custom elements themselves are SolidJS — we DON'T compile them here.
// Instead `@kitn.ai/ui/elements` resolves to the prebuilt bundle (already-
// compiled JS), exactly like a real consumer. Run `npm run build` first so
// `dist/kai.es.js` and the generated `frameworks/react/index.tsx` exist.
export default defineConfig({
  plugins: [react()],
  // The root tsconfig sets jsx=preserve / jsxImportSource=solid-js (for the Solid
  // build). Override esbuild here so React's automatic JSX runtime is used for
  // these tests, regardless of the inherited tsconfig.
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  resolve: {
    alias: {
      '@kitn.ai/ui/react': path.resolve(dirname, 'frameworks/react/index.tsx'),
      '@kitn.ai/ui/elements': path.resolve(dirname, 'dist/kai.es.js'),
    },
  },
  test: {
    name: 'react',
    environment: 'jsdom',
    globals: true,
    include: ['tests/react/**/*.test.tsx'],
    setupFiles: ['tests/react/setup.ts'],
  },
});
