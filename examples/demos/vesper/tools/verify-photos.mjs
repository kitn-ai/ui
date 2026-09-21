// Every photograph must be actually monochrome and actually present.
//
//   node tools/verify-photos.mjs
//
// Saturation, not the JPEG component count: ffmpeg's mjpeg encoder cannot
// write a single-channel JPEG, so a correct file still reports 3 components
// with its chroma planes pinned flat. SATMAX is the property that matters.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];

for (const file of globSync('public/img/**/*.jpg', { cwd: ROOT })) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-f', 'lavfi', '-i', `movie=${file},signalstats`,
    '-show_entries', 'frame_tags=lavfi.signalstats.SATMAX',
    '-of', 'csv=p=0',
  ], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n')[0].replace(/,$/, '');
  if (Number(out) !== 0) fail.push(`${file}: not monochrome (SATMAX ${out})`);
}

for (const src of ['src/data/catalog.ts', 'src/data/looks.ts', 'src/data/atelier.ts']) {
  const text = readFileSync(resolve(ROOT, src), 'utf8');
  for (const [, path] of text.matchAll(/'(\/img\/[^']+)'/g))
    if (!existsSync(resolve(ROOT, 'public' + path)))
      fail.push(`${src} references ${path}, which does not exist`);
}

if (fail.length) {
  console.error(fail.join('\n'));
  process.exit(1);
}
console.log(`${globSync('public/img/**/*.jpg', { cwd: ROOT }).length} photographs: all monochrome, all referenced files present`);
