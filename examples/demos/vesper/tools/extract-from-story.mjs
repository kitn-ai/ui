// Re-derive this site from the story it came out of.
//
//   node tools/extract-from-story.mjs
//
// `packages/ui/src/elements/v0.stories.tsx` builds the "Vesper" page it frames in
// <kai-artifact> entirely inline: the CSS in a template literal, the fonts and the
// photography as base64 data: URIs, the section markup as string builders. This
// script EVALUATES those builders (rather than re-typing their output) and writes
// the pieces out as real files. Run it after the story changes; the story is the
// source, this directory is the artifact.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// Writes into static-original/, NOT the project root. A start-mode Solid app
// must have no index.html at its root -- the plugin generates the entries --
// and leaving one there is both confusing to read and a real footgun.
const OUT = resolve(HERE, '../static-original');
const STORY = resolve(HERE, '../../../../packages/ui/src/elements/v0.stories.tsx');

// The generated-page section of the story: everything from the "framed for real"
// banner down to the version→URL map. Sliced by its own comment markers so an
// edit above or below it does not silently shift the window.
const src = readFileSync(STORY, 'utf8');
const lines = src.split('\n');
const from = lines.findIndex((l) => l.startsWith('// ── The generated app, framed for real'));
const to = lines.findIndex((l) => l.startsWith('// ── The Code tab'));
if (from < 0 || to < 0) throw new Error('story markers not found — did v0.stories.tsx change shape?');

// Strip the handful of TS annotations so Node can import the slice as an ES module.
const mod = lines.slice(from, to).join('\n')
  .replace(/\(body: string, extraHead = ''\)/, "(body, extraHead = '')")
  .replace(/\(cls: string, cap = '', tag = '', img = ''\)/, "(cls, cap = '', tag = '', img = '')")
  .replace(/\(name: string, color: string, on = false\)/, '(name, color, on = false)')
  .replace(/\(html: string\)/, '(html)')
  .replace(/const VURL: Record<string, string> =/, 'const VURL =')
  + '\nexport { FONT_FACE, IMG, nav, hero, lookbook, featured, footer, SHOP_SCRIPT };\n';
if (/:\s*(string|number|boolean)\b|Record</.test(mod)) throw new Error('an unstripped TS annotation remains');

const tmp = join(HERE, '.story-slice.mjs');
writeFileSync(tmp, mod);
let m;
try {
  m = await import(pathToFileURL(tmp).href + `?${Date.now()}`);
} finally {
  rmSync(tmp, { force: true });
}

for (const d of ['', 'css', 'js', 'img', 'fonts']) mkdirSync(join(OUT, d), { recursive: true });

// ── fonts ── pull each data:font/woff2 out of the @font-face block ──
const faces = [...m.FONT_FACE.matchAll(
  /@font-face\{[^}]*?font-weight:(\d+);[^}]*?url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)[^}]*?\}/g,
)];
if (faces.length !== 2) throw new Error(`expected 2 @font-face rules, got ${faces.length}`);
let fontCss = m.FONT_FACE;
for (const [, weight, b64] of faces) {
  const name = `playfair-display-${weight}.woff2`;
  const buf = Buffer.from(b64, 'base64');
  if (buf.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error(`${name} is not a woff2`);
  writeFileSync(join(OUT, 'fonts', name), buf);
  fontCss = fontCss.replace(`data:font/woff2;base64,${b64}`, `../fonts/${name}`);
}

// ── images ── decode each data: URI, and give it a name and real alt text ──
const NAMES = {
  hero: ['hero-opening-look', 'The opening look of the Autumn/Winter 2026 collection'],
  feature: ['campaign-lisbon', 'The AW26 campaign, shot in Lisbon'],
  g1: ['look-01-wool-coat', 'Look 01 - the wool coat'],
  g2: ['look-02-draped-knit', 'Look 02 - the draped knit'],
  g3: ['look-03-eveningwear', 'Look 03 - eveningwear'],
  panel: ['wool-coat', 'The Wool Coat in charcoal double-faced wool'],
};
const alts = {};
for (const [key, uri] of Object.entries({ ...m.IMG })) {
  const parsed = /^data:image\/([a-z]+);base64,(.+)$/s.exec(uri);
  if (!parsed) throw new Error(`IMG.${key} is not a base64 data URI`);
  const [base, alt] = NAMES[key] ?? [key, ''];
  const file = `${base}.${parsed[1] === 'jpeg' ? 'jpg' : parsed[1]}`;
  writeFileSync(join(OUT, 'img', file), Buffer.from(parsed[2], 'base64'));
  m.IMG[key] = `img/${file}`; // the section builders below now emit file paths
  alts[`img/${file}`] = alt;
}

// ── css ── the literal block between ${FONT_FACE} and </style> inside page() ──
const styleOpen = lines.indexOf('<style>');
const styleClose = lines.findIndex((l) => l.startsWith('</style>'));
if (styleOpen < 0 || lines[styleOpen + 1].trim() !== '${FONT_FACE}') throw new Error('style block not found');
const rules = lines.slice(styleOpen + 2, styleClose).map((l) => (l.startsWith('  ') ? l.slice(2) : l)).join('\n');
writeFileSync(join(OUT, 'css', 'styles.css'), `${fontCss}\n\n${rules}\n`);

// ── js ── the shop configurator, unwrapped from its <script> tags ──
const js = m.SHOP_SCRIPT.replace(/^<script>/, '').replace(/<\/script>$/, '').trim();
if (js === m.SHOP_SCRIPT.trim()) throw new Error('SHOP_SCRIPT <script> wrapper not found');
writeFileSync(join(OUT, 'js', 'shop.js'), `${js}\n`);

// ── html ── the v3 build (every section), pointed at the files written above ──
let markup = [m.nav(), m.hero(), m.lookbook(), m.featured(), m.footer()].join('\n')
  .replace(/<img src="(img\/[^"]+)" alt=""/g, (_, p) => `<img src="${p}" alt="${alts[p]}"`)
  .replace(/class="photo  /g, 'class="photo ')
  // the hero photo is the LCP element: it must not be lazy
  .replace(/(img\/hero-opening-look\.jpg"[^>]*?) loading="lazy"/, '$1 fetchpriority="high"');
for (const [re, msg] of [
  [/alt=""/, 'an image was left without alt text'],
  [/data:image/, 'a data: image URI survived into the markup'],
  [/class="photo  /, 'a double space survived in a photo class'],
]) if (re.test(markup)) throw new Error(msg);

writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vesper - Studies in Monochrome, Autumn / Winter 2026</title>
<meta name="description" content="Vesper Autumn / Winter 2026: quiet tailoring and soft volume, shot in natural light.">
<link rel="preload" href="fonts/playfair-display-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/styles.css">
<script src="js/shop.js" defer></script>
</head>
<body>
${markup.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n')}
</body>
</html>
`);
console.log('wrote index.html, css/styles.css, js/shop.js, 2 fonts, 6 images');
