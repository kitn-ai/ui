// Generate the per-web-component manifest: for each web-component source file (the set
// register-impl.ts imports), extract the kai-* tag(s) it registers via
// defineWebComponent, and emit:
//   - src/web-components/web-component-manifest.json  — { tag: "<entry-name>" } for the autoloader/build
// Entry name = the file's PRIMARY (last-registered) tag, which is the web component's
// own tag (event-only defineWebComponent generics are ignored — we read the
// first string arg of each call). Run from repo root: node scripts/gen-web-components-manifest.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reg = readFileSync(resolve(ROOT, 'src/web-components/register-impl.ts'), 'utf8');
const files = [...reg.matchAll(/import '\.\/([\w-]+)'/g)].map((m) => m[1]);

// tag -> source file basename (without ext)
const tagToFile = {};
// file -> [tags]
const fileToTags = {};

const callRe = /defineWebComponent\s*(?:<[\s\S]*?>)?\s*\(\s*'(kai-[a-z0-9-]+)'/g;

for (const f of files) {
  let src = null;
  for (const ext of ['tsx', 'ts']) {
    const p = resolve(ROOT, `src/web-components/${f}.${ext}`);
    if (existsSync(p)) { src = readFileSync(p, 'utf8'); break; }
  }
  if (!src) continue;
  const tags = [...src.matchAll(callRe)].map((m) => m[1]);
  if (!tags.length) continue;
  fileToTags[f] = tags;
  for (const t of tags) tagToFile[t] = f;
}

const tags = Object.keys(tagToFile).sort();
writeFileSync(
  resolve(ROOT, 'src/web-components/web-component-manifest.json'),
  JSON.stringify({ tags: tagToFile, files: fileToTags }, null, 2) + '\n',
);

console.log(`Web components: ${files.length} files → ${tags.length} tags`);
console.log('Multi-tag files:');
for (const [f, ts] of Object.entries(fileToTags)) if (ts.length > 1) console.log(`  ${f}: ${ts.join(', ')}`);
console.log('\nFirst 12 tag→file:');
tags.slice(0, 12).forEach((t) => console.log(`  ${t} → ${tagToFile[t]}`));
