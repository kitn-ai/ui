// Emit type declarations for the per-element entry modules + the autoloader into
// dist/elements/ (run AFTER the elements build, which creates that dir). Per-element
// modules are side-effect imports (they register a custom element; no named exports),
// so each gets `export {};` — enough for strict-TS consumers to `import
// '@kitn.ai/ui/elements/<file>'` without a "cannot find module" error. The autoloader
// gets real signatures.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'dist/elements');
if (!existsSync(OUT)) {
  console.error('dist/elements not found — run the elements build first');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'src/elements/element-manifest.json'), 'utf8'));
let n = 0;
for (const file of Object.keys(manifest.files)) {
  writeFileSync(resolve(OUT, `${file}.d.ts`), 'export {};\n');
  n++;
}
writeFileSync(
  resolve(OUT, 'autoloader.d.ts'),
  `export declare function startAutoloader(root?: ParentNode): void;\n` +
    `export declare function setAutoloaderBasePath(path: string): void;\n`,
);
console.log(`Emitted ${n} per-element .d.ts + autoloader.d.ts into dist/elements/`);
