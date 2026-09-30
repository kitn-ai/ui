// Generates `dist/theme.tokens.css` — a browser-ready token stylesheet for
// `<link>` / CDN consumers — from the Tailwind SOURCE `theme.css`.
//
// Why: `theme.css` is a Tailwind v4 source (`@theme`, `@custom-variant`,
// `@import "tw-animate-css"`). Loaded directly via `<link>` it 404s on the
// import AND applies no tokens (browsers ignore `@theme {}`). This emits the
// same tokens as plain CSS so a host page can `<link>` it: the `@theme` block
// becomes `:root {}`, its `@keyframes` are hoisted to top level, and the already-
// plain `.dark` / `.light` / `.chat-markdown` / `.kai-scrollbar-thin` rules are kept verbatim.
//
// theme.css stays the single source of truth; run on every build.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'theme.css'), 'utf8');

/** Return the body and end-index of the brace block that opens at `openIdx`. */
function matchBraces(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return { body: text.slice(openIdx + 1, i), end: i };
  }
  throw new Error('unbalanced braces');
}

/** Strip Tailwind `@utility name { … }` blocks. They're Tailwind v4 SOURCE
 *  directives (not valid CSS a browser/lightningcss understands), so in this
 *  plain-CSS token sheet they're inert leftovers — they apply nothing yet emit
 *  "Unknown at rule: @utility" warnings in every consumer build. The classes
 *  they declare (bg-surface, …) are compiled into the web components' shadow CSS
 *  (compiled.css), where they're actually used; this <link>/CDN sheet ships
 *  tokens only, so dropping them changes no rendering. */
function stripUtilities(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@utility', i);
    if (at === -1) { out += css.slice(i); break; }
    out += css.slice(i, at);
    const { end } = matchBraces(css, css.indexOf('{', at));
    i = end + 1;
  }
  return out.replace(/\n{3,}/g, '\n\n'); // collapse blank lines left where blocks were removed
}

// --- locate EVERY @theme block ---
// theme.css has more than one: the colour group is `@theme static` (emitted whole, whether or not a
// class reads a token) and the rest is a plain `@theme`. Both become the one `:root {}` here, and both
// are cut out of the pass-through tail so neither leaks into the output as an invalid at-rule.
const themeBlocks = [];
// Only a rule that STARTS a line: the word also appears inside theme.css's own comments.
for (const m of src.matchAll(/^@theme\b[^{]*\{/gm)) {
  const open = m.index + m[0].length - 1;
  themeBlocks.push({ at: m.index, ...matchBraces(src, open) });
}
if (!themeBlocks.length) throw new Error('no @theme block in theme.css');
const themeBody = themeBlocks.map((b) => b.body).join('\n');
// .dark / .light / .chat-markdown / .kai-scrollbar-thin / .kai-elevation -- already plain CSS;
// drop the trailing `@utility` blocks (Tailwind-source directives, inert here).
let tail = '';
let cursor = themeBlocks[0].end + 1;
for (const blk of themeBlocks.slice(1)) {
  tail += src.slice(cursor, blk.at);
  cursor = blk.end + 1;
}
tail += src.slice(cursor);
const afterTheme = stripUtilities(tail);

// --- split @theme body into token declarations vs hoisted @keyframes ---
const keyframes = [];
let decls = '';
let i = 0;
while (i < themeBody.length) {
  const kf = themeBody.indexOf('@keyframes', i);
  if (kf === -1) { decls += themeBody.slice(i); break; }
  decls += themeBody.slice(i, kf);
  const { body, end } = matchBraces(themeBody, themeBody.indexOf('{', kf));
  keyframes.push(`@keyframes ${themeBody.slice(kf + '@keyframes'.length, themeBody.indexOf('{', kf)).trim()} {${body}}`);
  i = end + 1;
}

const tokens = decls
  .split('\n')
  .map((l) => l.replace(/\s+$/, ''))
  .filter((l) => l.trim().length)
  .join('\n');

const out = `/* AUTO-GENERATED from theme.css by scripts/build-theme-tokens.mjs — do not edit.
   Browser-ready token stylesheet for <link>/CDN consumers (the kit's ELEMENTS
   are self-themed and don't need this; it themes host-page chrome / rebrands). */

:root {
${tokens}
}

${keyframes.join('\n')}
${afterTheme.replace(/^\n+/, '')}`;

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/theme.tokens.css'), out);
console.log('✓ wrote dist/theme.tokens.css');
