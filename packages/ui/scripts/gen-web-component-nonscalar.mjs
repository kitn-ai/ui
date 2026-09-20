// Ship the per-prop `scalar` bit to RUNTIME, as the smallest thing that carries it.
//
// WHY THIS FILE EXISTS
// --------------------
// `web-component-meta.json` already knows, for every prop on every web component,
// whether a prop's type is a scalar — `gen-web-component-api.mjs` reads it off the TS
// checker (`isScalar(t)`, written onto every prop as `scalar`). That bit is
// exactly what the web-component-layer contract check needs: a prop that is NOT a
// scalar can only be set as a JS PROPERTY, and an HTML attribute carrying one
// arrives as `[object Object]` and silently does nothing.
//
// But `web-component-meta.json` is ~390 KB and describes types, descriptions,
// defaults, slots and events. Nothing on the runtime path may import it. So this
// derives the one bit that ships: tag → the names of its non-scalar props.
// Measured on the current tree that is ~1.8 KB of JSON for 94 props across 43
// web components — the other 37 have no non-scalar prop at all and are absent
// from the map entirely, which is what makes the runtime check free for them.
//
// DERIVED, NOT TYPED. This reads `web-component-meta.json` rather than re-deriving the
// scalar bit from the TS checker, so there is exactly ONE definition of "scalar"
// in the repo and this file cannot drift from it — it can only be stale, which
// `verify:generated-sync` catches (the output is registered in its derived-file
// list) and which `web-component-nonscalar-sync.test.ts` catches without a build.
//
// Runs from `build:api`, AFTER gen-web-component-api.mjs has written the meta file.
//   node scripts/gen-web-component-nonscalar.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const META = resolve(ROOT, 'src/web-components/web-component-meta.json');
const OUT = resolve(ROOT, 'src/web-components/web-component-nonscalar.json');

/**
 * tag → sorted names of that tag's non-scalar props. Web components with none are
 * OMITTED rather than given an empty array: the runtime uses "absent" as its
 * fast path, and an empty array would cost bytes to say nothing.
 */
export function nonScalarMap(meta) {
  /** @type {Record<string, string[]>} */
  const map = {};
  for (const el of meta) {
    const names = el.props.filter((p) => !p.scalar).map((p) => p.name).sort();
    if (names.length) map[el.tag] = names;
  }
  // Sorted keys so the emitted bytes are stable across runs — a diff-based
  // drift guard is only meaningful over a deterministic output.
  return Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
}

const meta = JSON.parse(readFileSync(META, 'utf8'));
if (!Array.isArray(meta) || meta.length === 0) {
  throw new Error(`gen-web-component-nonscalar: ${META} is not a non-empty array — run build:api first`);
}

const map = nonScalarMap(meta);
if (Object.keys(map).length === 0) {
  // Emptiness here would mean every prop in the kit reads as a scalar, which
  // would silently disable the whole contract check rather than fail it.
  throw new Error(
    'gen-web-component-nonscalar: not one non-scalar prop found across ' +
      `${meta.length} web components. That is not a plausible tree — the \`scalar\` bit in ` +
      'web-component-meta.json is probably missing or inverted.',
  );
}

writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n');

const props = Object.values(map).reduce((n, v) => n + v.length, 0);
const bytes = readFileSync(OUT).length;
console.log(
  `Non-scalar props: ${props} across ${Object.keys(map).length} of ${meta.length} web components ` +
    `→ src/web-components/web-component-nonscalar.json (${bytes} bytes)`,
);
