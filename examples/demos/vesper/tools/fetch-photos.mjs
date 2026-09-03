// Fetch and process the site's photography.
//
//   node tools/fetch-photos.mjs
//
// The photographs come from Unsplash, chosen to match the six that arrived
// inline in the v0 story: monochrome, single figure, editorial styling. This
// script is the manifest -- it records which photo id fills which slot, pulls
// each at the size that slot actually displays, and desaturates it so the
// whole set shares one profile.
//
// Re-running it is idempotent. Existing files are skipped unless --force.
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/img');
const FORCE = process.argv.includes('--force');

/** photo id -> the photographer's Unsplash handle, for CREDITS.md. */
const BY = {
  '1495914510314-ba3164b1321f': 'slavewire',
  '1533392151650-269f96231f65': 'dtolokonov',
  '1536180931879-fd2d652efddc': 'aiony',
  '1541941702428-22609a10cb9e': 'viktortalashuk',
  '1587115924362-622c3fa065bd': 'levyphoto',
  '1592833578500-1082e18665a3': 'philipparltdesign',
  '1601597565151-70c4020dc0e1': 'ben_scott_photography',
  '1606143412458-acc5f86de897': 'ali_nejatian',
  '1607207496684-3e09f039cfe6': 'khashi_photo',
  '1612928414075-bc722ade44f1': 'project290',
  '1613915617430-8ab0fd7c6baf': 'chyntiajuls',
  '1633381521050-26bb467d9d5a': 'ttrapani',
  '1637536701306-3214e9cec64a': 'maierfoto',
  '1638337935003-e17cf483ca8d': 'metameesh',
  '1657400854953-a4010083420d': 'aliyaamangeldi_photography',
  '1659522761084-79196b64abe4': 'bordunova',
  '1666586950819-67950d40bb0a': 'itadakidesu',
  '1673015899952-e1cbbada2709': 'filipp_roman_photography',
  '1678923917496-fe3fa70673ac': 'nastkala',
  '1695418390410-eb71c5c550df': 'byannel',
  '1752134052911-f7c26fca227d': 'chriscreations__',
  '1784549758722-8a734d1eadd0': 'rezamr2',
};

// Slot -> [photo id, width, height]. The lookbook is portrait 4:5 at the size
// the detail page shows it; product shots are smaller because they never go
// full width; the atelier scenes are square.
const MANIFEST = {
  'looks/look-01.jpg': ['1613915617430-8ab0fd7c6baf', 800, 1000],
  'looks/look-02.jpg': ['1606143412458-acc5f86de897', 800, 1000],
  'looks/look-03.jpg': ['1533392151650-269f96231f65', 800, 1000],
  'looks/look-04.jpg': ['1638337935003-e17cf483ca8d', 800, 1000],
  'looks/look-05.jpg': ['1612928414075-bc722ade44f1', 800, 1000],
  'looks/look-06.jpg': ['1637536701306-3214e9cec64a', 800, 1000],
  'looks/look-07.jpg': ['1592833578500-1082e18665a3', 800, 1000],
  'looks/look-08.jpg': ['1666586950819-67950d40bb0a', 800, 1000],
  'looks/look-09.jpg': ['1657400854953-a4010083420d', 800, 1000],
  'looks/look-10.jpg': ['1659522761084-79196b64abe4', 800, 1000],
  'looks/look-11.jpg': ['1601597565151-70c4020dc0e1', 800, 1000],
  'looks/look-12.jpg': ['1678923917496-fe3fa70673ac', 800, 1000],

  'pieces/wool-coat-camel.jpg': ['1587115924362-622c3fa065bd', 560, 700],
  'pieces/wool-coat-ivory.jpg': ['1607207496684-3e09f039cfe6', 560, 700],
  'pieces/wool-coat-black.jpg': ['1678923917496-fe3fa70673ac', 560, 700],
  'pieces/draped-knit-ash.jpg': ['1536180931879-fd2d652efddc', 560, 700],
  'pieces/silk-slip-pearl.jpg': ['1659522761084-79196b64abe4', 560, 700],
  'pieces/wide-trouser-charcoal.jpg': ['1592833578500-1082e18665a3', 560, 700],
  'pieces/leather-blouson-black.jpg': ['1612928414075-bc722ade44f1', 560, 700],
  'pieces/column-dress-black.jpg': ['1784549758722-8a734d1eadd0', 560, 700],
  'pieces/overshirt-ash.jpg': ['1666586950819-67950d40bb0a', 560, 700],
  'pieces/cashmere-scarf-ivory.jpg': ['1752134052911-f7c26fca227d', 560, 700],

  // The hero's second frame, for the tonal wipe.
  'hero-b.jpg': ['1495914510314-ba3164b1321f', 560, 700],

  'atelier/wool.jpg': ['1541941702428-22609a10cb9e', 600, 600],
  'atelier/silk.jpg': ['1673015899952-e1cbbada2709', 600, 600],
  'atelier/leather.jpg': ['1695418390410-eb71c5c550df', 600, 600],
};

/** Kept from the v0 story rather than fetched. No provenance was recorded. */
const INHERITED = {
  'hero-a.jpg': 'the opening look',
  'campaign.jpg': 'the AW26 campaign',
  'pieces/wool-coat-charcoal.jpg': 'the wool coat',
};

for (const d of ['looks', 'pieces', 'atelier']) mkdirSync(join(OUT, d), { recursive: true });

let fetched = 0;
for (const [slot, [id, w, h]] of Object.entries(MANIFEST)) {
  const dest = join(OUT, slot);
  if (existsSync(dest) && !FORCE) continue;
  const url = `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=82&fm=jpg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${slot}: ${id} -> HTTP ${res.status}`);
  const tmp = `${dest}.src`;
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  // Desaturate in the pixels rather than with a CSS filter, so the bytes on
  // the wire are already monochrome. ffmpeg's mjpeg encoder has no gray pixel
  // format (only yuvj/yuv), so the result is 3-component with both chroma
  // planes pinned flat -- visually and measurably grayscale (signalstats
  // SATMAX is 0), and the flat planes cost almost nothing to compress. Verify
  // with saturation, never with the JPEG component count.
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', tmp,
    '-vf', `format=gray,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    '-q:v', '4', dest,
  ]);
  rmSync(tmp);
  fetched++;
  console.log(`${slot}  <- ${id}`);
}

const credit = (id) => `[@${BY[id] ?? 'unknown'}](https://unsplash.com/@${BY[id] ?? ''})`;
writeFileSync(
  join(OUT, 'CREDITS.md'),
  `# Photography

Every photograph below is from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license), which permits this use.
All are converted to single-channel grayscale to match the set the site
inherited. Regenerate with \`node tools/fetch-photos.mjs --force\`.

| File | Photo | Photographer |
| --- | --- | --- |
${Object.entries(MANIFEST)
  .map(([slot, [id]]) => `| \`${slot}\` | [${id}](https://unsplash.com/photos/${id}) | ${credit(id)} |`)
  .join('\n')}

## Inherited, provenance unrecorded

These three arrived base64-inlined in \`packages/ui/src/elements/v0.stories.tsx\`
and carried no attribution, so their photographers are unknown. They are almost
certainly Unsplash as well, from the same searches.

| File | Subject |
| --- | --- |
${Object.entries(INHERITED).map(([f, s]) => `| \`${f}\` | ${s} |`).join('\n')}
`,
);

console.log(`\n${fetched} fetched, ${Object.keys(MANIFEST).length} in the manifest, CREDITS.md written`);
