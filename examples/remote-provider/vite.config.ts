import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Vite config for the remote-provider dev example.
 *
 * Run via:  npm run dev:provider   (serves on http://localhost:6007)
 *
 * This example imports directly from ../../src/ so it works without a prior
 * `npm run build`. Vite handles TypeScript out-of-the-box.
 *
 * The root is set to this directory so `index.html` is served at /.
 */
export default defineConfig({
  root: resolve(__dirname),
  // No plugins needed: Vite handles .ts natively; no SolidJS/React/Vue here.
});
