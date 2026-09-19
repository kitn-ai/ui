// Generate the per-web-component manifest: for each web-component source file (the set
// register-impl.ts imports), extract the kai-* tag(s) it registers via
// defineWebComponent, and emit:
//   - src/web-components/web-component-manifest.json  — { tag: "<entry-name>" } for the autoloader/build
// Entry name = the file's PRIMARY (last-registered) tag, which is the web component's
// own tag (event-only defineWebComponent generics are ignored — we read the
// first string arg of each call). Run from repo root: node scripts/gen-web-components-manifest.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** basename -> absolute source path, walked RECURSIVELY (the layer has family folders).
 *  A missing or duplicated basename throws: both would silently drop a web component
 *  from the manifest, and the manifest is what the autoloader and the split build read. */
function sourceFor(basename) {
  const hits = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/^(.*)\.(tsx|ts)$/.test(entry.name) && entry.name.replace(/\.(tsx|ts)$/, '') === basename) hits.push(full);
    }
  };
  walk(resolve(ROOT, 'src/web-components'));
  if (hits.length !== 1) {
    throw new Error(`gen-web-components-manifest: expected exactly one source for '${basename}', found ${hits.length}: ${hits.join(', ') || '(none)'}`);
  }
  return hits[0];
}
const reg = readFileSync(resolve(ROOT, 'src/web-components/register/register-impl.ts'), 'utf8');
// Specifiers resolve relative to register-impl.ts, which now sits one directory
// down (src/web-components/register/), so they read '../<family>/<file>' rather
// than './<file>'. The KEY stays the BASENAME: it IS the public module name
// (dist/web-components/<basename>.js = `@kitn.ai/ui/web-components/<basename>`),
// which is why folding the layer into family folders is invisible to consumers.
const files = [...reg.matchAll(/import '([^']+)'/g)]
  .map((m) => m[1])
  .filter((spec) => spec.startsWith('.'))
  .map((spec) => spec.split('/').pop());

// tag -> source file basename (without ext)
const tagToFile = {};
// file -> [tags]
const fileToTags = {};

const callRe = /defineWebComponent\s*(?:<[\s\S]*?>)?\s*\(\s*'(kai-[a-z0-9-]+)'/g;

for (const f of files) {
  let src = null;
  const p = sourceFor(f);
  if (!p) continue;
  src = readFileSync(p, 'utf8');
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
