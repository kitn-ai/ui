import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Resolve `@kitn.ai/chat/*` against the LOCAL source/build of this repo so the
// example exercises the wrappers we're developing (no publish needed):
//   - `@kitn.ai/chat/react`     → frameworks/react/index.tsx (generated wrappers)
//   - `@kitn.ai/chat/elements`  → the built bundle that registers the elements
//   - `@kitn.ai/chat/theme.css` → the kit's theme stylesheet
const repoRoot = resolve(__dirname, '..', '..');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kitn.ai/chat/react': resolve(repoRoot, 'frameworks/react/index.tsx'),
      '@kitn.ai/chat/elements': resolve(repoRoot, 'dist/kitn-chat.es.js'),
      '@kitn.ai/chat/theme.css': resolve(repoRoot, 'theme.css'),
    },
  },
});
