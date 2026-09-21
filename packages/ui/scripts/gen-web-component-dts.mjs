// Emit type declarations for the per-web-component entry modules + the autoloader into
// dist/web-components/ (run AFTER the web-components build, which creates that dir). Per-web-component
// modules are side-effect imports (they register a web component; no named exports),
// so each gets `export {};` — enough for strict-TS consumers to `import
// '@kitn.ai/ui/web-components/<file>'` without a "cannot find module" error. The autoloader
// gets real signatures.
import { writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'dist/web-components');
if (!existsSync(OUT)) {
  console.error('dist/web-components not found — run the web-components build first');
  process.exit(1);
}

// The set is DERIVED FROM THE EMITTED MODULES, not from the manifest. The manifest
// covers register-impl's facades only, so it misses every module the split build
// adds by hand -- which is how `@kitn.ai/ui/web-components/remote` ended up with a
// dist .js and no .d.ts the day the layer was folded into family folders: the
// barrel's declaration emit used to mirror src/web-components/remote.tsx to a FLAT
// dist/web-components/remote.d.ts by accident, and nesting that emit removed the
// accident without replacing it. The public per-module set IS the flat .js set.
const emitted = readdirSync(OUT)
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.slice(0, -'.js'.length))
  .filter((f) => f !== 'autoloader' && f !== 'index')
  .sort();
let n = 0;
for (const file of emitted) {
  writeFileSync(resolve(OUT, `${file}.d.ts`), 'export {};\n');
  n++;
}
writeFileSync(
  resolve(OUT, 'autoloader.d.ts'),
  `export declare function startAutoloader(root?: ParentNode): void;\n` +
    `export declare function setAutoloaderBasePath(path: string): void;\n`,
);
console.log(`Emitted ${n} per-web-component .d.ts + autoloader.d.ts into dist/web-components/`);
