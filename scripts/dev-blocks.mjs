#!/usr/bin/env node
// `pnpm dev:blocks` -- see the AUTHORED blocks in a browser, on the working tree.
//
// WHY THIS EXISTS. The loop already existed in pieces and one of them defaulted the
// wrong way: `apps/docs`'s `predev` copies `packages/ui/dist/blocks/` (written by
// `gen-blocks.mjs`, a `nx build ui` postbuild phase), but nothing set
// `KAI_BLOCKS_KIT`, which is the switch between previewing the PUBLISHED jsDelivr pin
// and previewing the working tree. Unset means production, so `pnpm dev` showed a
// developer the released 0.37.0 block and not the file they had just edited.
//
// So: regenerate the derived forms, then hand off to the docs dev server with the
// switch set to `local`. The kit build is the one slow prerequisite, and it is only
// needed once; after that this command re-derives the block forms and starts the
// server.
//
// Deliberately NOT a build system. It runs two existing commands and one script, in
// order, and gives up loudly when the first one cannot work.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT_DIST = join(ROOT, 'packages/ui/dist/index.js');
const BLOCKS_INDEX = join(ROOT, 'packages/ui/dist/blocks/registry.json');

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (!existsSync(KIT_DIST)) {
  console.error(
    'dev:blocks: the kit has no build yet, and the block forms are generated from it.\n' +
      'dev:blocks: running `nx build ui` once first.\n',
  );
  run('npx', ['nx', 'build', 'ui']);
}

// The derived forms are regenerated on every run, so an edit to a block's .html or
// .controller.ts shows up without a full kit rebuild. `apps/docs`'s own predev step
// copies them into the site's public tree.
if (existsSync(BLOCKS_INDEX)) {
  run(process.execPath, [join(ROOT, 'packages/ui/scripts/gen-blocks.mjs')]);
}

console.error('dev:blocks: starting the docs site with KAI_BLOCKS_KIT=local -> http://localhost:4321/blocks/\n');
run('pnpm', ['--filter', '@kitn.ai/docs', 'run', 'dev:blocks']);
