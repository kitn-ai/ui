import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Resolve `@kitnai/chat/*` against the LOCAL source/build of this repo so the
// example exercises the wrappers we're developing (no publish needed):
//   - `@kitnai/chat/react`     → frameworks/react/index.tsx (generated wrappers)
//   - `@kitnai/chat/elements`  → the built bundle that registers the elements
//   - `@kitnai/chat/theme.css` → the kit's theme stylesheet
const repoRoot = resolve(__dirname, '..', '..');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kitnai/chat/react': resolve(repoRoot, 'frameworks/react/index.tsx'),
      '@kitnai/chat/elements': resolve(repoRoot, 'dist/kitn-chat.es.js'),
      '@kitnai/chat/theme.css': resolve(repoRoot, 'theme.css'),
    },
  },
});
