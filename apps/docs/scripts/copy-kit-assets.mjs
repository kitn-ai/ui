// Copy ONLY the few raw-served kit assets the standalone demos need. The
// interactive examples now import @kitn.ai/ui directly (Vite-resolved). This is
// a deliberate, bounded copy, NOT the old sync-kit full-bundle mirror.
import { createRequire } from 'node:module';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgRoot = dirname(require.resolve('@kitn.ai/ui/package.json'));
const here = dirname(new URL(import.meta.url).pathname);
const pub = join(here, '..', 'public');

mkdirSync(join(pub, 'kitn', 'elements'), { recursive: true });
// autoloader-demo.html loads these two as raw assets (the zero-build CDN path):
cpSync(join(pkgRoot, 'dist/elements/autoloader.js'), join(pub, 'kitn/elements/autoloader.js'));
cpSync(join(pkgRoot, 'dist/theme.tokens.css'), join(pub, 'kitn/theme.tokens.css'));
// llms.txt / llms-full.txt served at the site root for AI agents:
cpSync(join(pkgRoot, 'llms.txt'), join(pub, 'llms.txt'));
cpSync(join(pkgRoot, 'llms-full.txt'), join(pub, 'llms-full.txt'));
console.log('[copy-kit-assets] copied 4 raw-served assets from @kitn.ai/ui');
