// Regression guard for the coarse register-all bundle (dist/kai.es.js, the
// `@kitn.ai/ui/elements` entry). It MUST load ./register-impl — that side effect
// is what actually defines every kai-* custom element. A result-unused dynamic
// import there is tree-shakeable, and when it gets stripped the bundle ships with
// NOTHING registered, so customElements.whenDefined('kai-chat') hangs forever in
// every consumer (and the docs site never hydrates). This asserts the built file
// still references register-impl so that regression can never silently ship again.
import { readFileSync } from 'node:fs';

const BUNDLE = 'dist/kai.es.js';
const NEEDLE = 'register-impl';

let code;
try {
  code = readFileSync(BUNDLE, 'utf8');
} catch {
  console.error(
    `✗ verify-elements-bundle: ${BUNDLE} not found — run the lib build first.`,
  );
  process.exit(1);
}

if (!code.includes(NEEDLE)) {
  console.error(
    `✗ verify-elements-bundle: ${BUNDLE} does NOT reference "${NEEDLE}".\n` +
      `  The register-all bundle is missing element registration — it was likely\n` +
      `  tree-shaken away. Consumers of @kitn.ai/ui/elements would get nothing\n` +
      `  registered. See src/elements/register.ts (keep elementsReady exported) and\n` +
      `  vite.config.ts (build.rollupOptions.treeshake: false for this entry).`,
  );
  process.exit(1);
}

console.log(`✓ verify-elements-bundle — ${BUNDLE} references ${NEEDLE}`);
