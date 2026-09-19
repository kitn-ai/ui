// Emit type declarations for the per-web-component entry modules + the autoloader into
// dist/web-components/ (run AFTER the web-components build, which creates that dir). Per-web-component
// modules are side-effect imports (they register a web component; no named exports),
// so each gets `export {};` — enough for strict-TS consumers to `import
// '@kitn.ai/ui/web-components/<file>'` without a "cannot find module" error. The autoloader
// gets real signatures.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'dist/web-components');
if (!existsSync(OUT)) {
  console.error('dist/web-components not found — run the web-components build first');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'src/web-components/web-component-manifest.json'), 'utf8'));
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
console.log(`Emitted ${n} per-web-component .d.ts + autoloader.d.ts into dist/web-components/`);
