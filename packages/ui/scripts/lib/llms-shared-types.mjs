// "Shared types" planning for llms-full.txt.
//
// The per-element tables print every prop type fully expanded (renderType has to:
// the same string is spliced into a no-imports .d.ts). Expanded, a recurring type is
// paid for once per ROW -- the `MessagePart` union alone sat inline in four rows, and
// `store`, `messages`, `message` and `data` together were a tenth of the file. This
// module takes the named types the generator saw while expanding (`namedTypes`:
// `{ ExportedName: [rendered variants] }`, recorded by gen-web-component-api.mjs from
// the checker, not typed here) and the type strings of every row, and decides which
// to print once, in a "Shared types" section, and refer to by name everywhere else.
//
// WHAT QUALIFIES (all derived, nothing listed by hand)
//   - the name is one the public entry exports (filtered upstream, where the checker is)
//   - its expansion is at least MIN_TYPE_LENGTH chars (a short literal is cheaper inline)
//   - it is used in 2+ rows, or it is at least BIG_TYPE_LENGTH chars on its own
//   - naming it actually saves bytes (a 70-char type used twice does not)
// Nesting counts as use: `MessagePart` lives inside `ChatMessage`, so once `ChatMessage`
// is shared `MessagePart` is referenced from its definition and is shared too.

export const MIN_TYPE_LENGTH = 60;
export const BIG_TYPE_LENGTH = 300;

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

/**
 * @param {Record<string, string[]>} namedTypes exported name -> rendered variants,
 *   most complete first
 * @param {string[]} cells every type string that will be printed in a row
 * @returns {{ rewrite: (s: string) => string, definitions: {name: string, definition: string}[] }}
 */
export function planSharedTypes(namedTypes, cells) {
  // Two exported names can expand to the SAME string (`KaiRadioOption` and
  // `KaiCheckboxOption` are structurally identical). From the string alone there is no
  // telling which one a row was authored with, and picking one would print a name the
  // prop never used, so a string claimed by 2+ names stays inline.
  const claims = new Map();
  for (const [name, variants] of Object.entries(namedTypes ?? {})) {
    for (const v of variants) claims.set(v, (claims.get(v) ?? new Set()).add(name));
  }
  const candidates = Object.entries(namedTypes ?? {})
    .map(([name, variants]) => ({
      name,
      variants: variants.filter((v) => v.length >= MIN_TYPE_LENGTH && claims.get(v).size === 1),
    }))
    .filter((c) => c.variants.length);
  const byName = new Map(candidates.map((c) => [c.name, c]));

  const rowsUsing = (c) => cells.filter((cell) => c.variants.some((v) => cell.includes(v))).length;
  const selected = new Set();
  const saves = (c, uses) => uses * (c.variants[0].length - c.name.length) > c.variants[0].length + c.name.length + 16;

  // Fixpoint: a type referenced only from inside a selected type's definition still
  // counts that reference, which is how `MessagePart` is reached through `ChatMessage`.
  for (let grew = true; grew; ) {
    grew = false;
    for (const c of candidates) {
      if (selected.has(c.name)) continue;
      let uses = rowsUsing(c);
      for (const other of selected) {
        if (other !== c.name && c.variants.some((v) => byName.get(other).variants[0].includes(v))) uses += 1;
      }
      const big = c.variants[0].length >= BIG_TYPE_LENGTH;
      if ((uses >= 2 || big) && saves(c, Math.max(uses, 1))) {
        selected.add(c.name);
        grew = true;
      }
    }
  }

  // Longest expansion first, so a type is swapped for its name before anything
  // nested inside it could be.
  const order = [...selected]
    .flatMap((name) => byName.get(name).variants.map((variant) => ({ name, variant })))
    .sort((a, b) => b.variant.length - a.variant.length);

  const used = new Set();
  const rewriteWith = (s, skip, sink) => {
    let out = s;
    for (const { name, variant } of order) {
      if (name === skip || !out.includes(variant)) continue;
      // `(A | B)[]` -> `Name[]`, `(() => X)` -> `Name`: the parens were the
      // expansion's, and a name needs none.
      for (const from of [`(${variant})[]`, `(${variant})`, variant]) {
        if (!out.includes(from)) continue;
        out = out.split(from).join(from.endsWith('[]') ? `${name}[]` : name);
        sink.add(name);
      }
    }
    return out;
  };
  const rewrite = (s) => rewriteWith(s, null, used);

  // Rewrite the cells' usage first (so `used` is populated), then the definitions,
  // transitively: only what a row reaches is emitted, so nothing dangles and nothing
  // unreferenced rides along.
  for (const cell of cells) rewrite(cell);
  const definitions = new Map();
  const queue = [...used];
  while (queue.length) {
    const name = queue.shift();
    if (definitions.has(name)) continue;
    const inner = new Set();
    definitions.set(name, rewriteWith(byName.get(name).variants[0], name, inner));
    for (const n of inner) if (!definitions.has(n)) queue.push(n);
  }
  return {
    rewrite,
    definitions: [...definitions].map(([name, definition]) => ({ name, definition })).sort((a, b) => (a.name < b.name ? -1 : 1)),
  };
}

/** Identifiers a rewritten string refers to that the plan defines, for the tests. */
export const referencedSharedNames = (text, definitions) =>
  definitions.map((d) => d.name).filter((n) => new RegExp(`(^|[^A-Za-z0-9_$])${n}([^A-Za-z0-9_$]|$)`).test(text));

/** The section body. `null` when nothing qualified (no empty section). */
export function renderSharedTypes(definitions) {
  if (!definitions.length) return null;
  return [
    `## Shared types (${definitions.length} types the reference tables above name instead of repeating)`,
    '',
    'A type written by name in a Type, `detail` or Signature cell is defined here, once, under the exported name you can `import type` from `@kitn.ai/ui`. `Name[]` is an array of it; a name inside another definition below is a reference to that entry.',
    '',
    ...definitions.map((d) => `- \`${d.name}\` = \`${d.definition}\``),
  ].join('\n');
}

/**
 * Names in `text` that are in `knownNames` (every exported type the checker expanded
 * while generating) but have no entry in `definedNames`. A row that names `ChatMessage`
 * while the Shared types section lacks it would tell an agent a type exists and give it
 * no way to learn its shape, and nothing else would notice.
 */
export function findDanglingNames(text, knownNames, definedNames) {
  const defined = new Set(definedNames);
  return [...new Set(knownNames)]
    .filter((n) => !defined.has(n) && new RegExp(`(^|[^A-Za-z0-9_$])${n}([^A-Za-z0-9_$]|$)`).test(text))
    .sort();
}
