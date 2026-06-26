import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Resolve `@kitn.ai/ui/*` against the LOCAL source/build of this repo so the
// example exercises the wrappers we're developing (no publish needed):
//   - `@kitn.ai/ui/react`     → frameworks/react/index.tsx (generated wrappers)
//   - `@kitn.ai/ui/elements`  → the built bundle that registers the elements
//   - `@kitn.ai/ui/theme.css` → the kit's theme stylesheet
const repoRoot = resolve(__dirname, '..', '..');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kitn.ai/ui/react': resolve(repoRoot, 'frameworks/react/index.tsx'),
      '@kitn.ai/ui/elements': resolve(repoRoot, 'dist/kai.es.js'),
      '@kitn.ai/ui/theme.css': resolve(repoRoot, 'theme.css'),
    },
  },
});
