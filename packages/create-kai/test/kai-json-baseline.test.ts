/**
 * The baseline `upgrade` reads: `kai.json`'s `files` map.
 *
 * WHAT THIS PINS, and why it is worth a test of its own rather than a line in
 * `generate.test.ts`. `upgrade` re-renders a project with the CURRENT templates
 * and has to decide, per file, whether a difference means "the template changed"
 * (safe to update) or "the user edited this" (never touch). Those are the same
 * comparison only when the bytes that were originally written are recorded, so
 * the recorded hash has to be the hash of the file that is actually on disk.
 * These cases prove exactly that, and the third one proves the map can tell the
 * two apart at all.
 *
 * EVERY HASH IS COMPUTED HERE, independently, with `node:crypto` over the file's
 * bytes, not by importing `sha256` from the generator. Asserting the map
 * against the function that produced it would pass on a map that hashed the
 * template source instead of the emitted file, which is the one mistake this
 * test exists to catch.
 *
 * Real temp directories, no mocks: a mocked copy proves nothing about the copy.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generate } from '../src/generate';
import type { ProjectPlan } from '../src/types';

const TEMPLATE_ROOT = path.resolve(__dirname, '../dist/templates');

const plan = (dir: string): ProjectPlan => ({
  dir,
  name: 'baseline-app',
  frameworkId: 'react',
  layout: 'full-screen',
  widgetStyle: null,
  featureIds: ['conversations'],
  gatewayId: 'mock',
  kit: '^9.9.9',
  kitBuiltAgainst: '9.9.9',
});

/** sha256, lowercase hex, of the bytes of a file on disk. */
const bytesHash = async (abs: string): Promise<string> =>
  createHash('sha256').update(await readFile(abs)).digest('hex');

const TEMPLATES_MISSING =
  `no templates at ${TEMPLATE_ROOT}. Run \`pnpm --filter create-kai run build\` first`;

describe('the emitted kai.json records a baseline of what was written', () => {
  let root: string;
  let dir: string;
  let files: string[];
  let kai: { files?: Record<string, string> };

  beforeAll(async () => {
    if (!existsSync(TEMPLATE_ROOT)) throw new Error(TEMPLATES_MISSING);
    root = await mkdtemp(path.join(tmpdir(), 'create-kai-baseline-'));
    dir = path.join(root, 'baseline-app');
    const result = await generate(plan(dir), { templateRoot: TEMPLATE_ROOT });
    files = result.files;
    kai = JSON.parse(await readFile(path.join(dir, 'kai.json'), 'utf8'));
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('keys the map by every emitted file except kai.json itself', () => {
    // The equality is against the files the generator REPORTED and the files on
    // disk, so it fails in both directions: a missed file and a hash for a path
    // that was never written.
    const recorded = Object.keys(kai.files ?? {}).sort();
    expect(recorded).toEqual(files.filter((file) => file !== 'kai.json').sort());
    // `kai.json` cannot hash its own content, so it is the one omission.
    expect(recorded).not.toContain('kai.json');
    // Guards the two empties above against passing vacuously.
    expect(recorded.length).toBeGreaterThan(10);
  });

  it('includes the files a user is most likely to edit, which is the point', () => {
    // A curated map would skip exactly these; the baseline exists to protect the
    // files a user touches first.
    expect(kai.files).toHaveProperty('src/App.tsx');
    expect(kai.files).toHaveProperty('package.json');
  });

  it('records the sha256 of the file actually on disk, for every entry', async () => {
    const recorded = kai.files ?? {};
    expect(Object.keys(recorded).length).toBeGreaterThan(0);
    for (const [rel, hash] of Object.entries(recorded)) {
      expect(hash, `${rel} is not a lowercase-hex sha256`).toMatch(/^[0-9a-f]{64}$/);
      // The independent hash: if the generator had recorded the TEMPLATE source
      // instead of the emitted bytes, a patched file would land here as a
      // mismatch, which is the failure this assertion owns.
      expect(await bytesHash(path.join(dir, rel)), `${rel} does not match its recorded hash`).toBe(
        hash,
      );
    }
  });
});

/**
 * The property `upgrade` will depend on: an edit after scaffolding makes the
 * file stop matching its recorded hash, while the untouched files keep matching.
 *
 * A dedicated project rather than the shared one above, because this case MUTATES
 * the tree; sharing would make the block's result depend on test order.
 */
describe('a user edit after scaffolding breaks the match, and only for that file', () => {
  let root: string;

  beforeAll(async () => {
    if (!existsSync(TEMPLATE_ROOT)) throw new Error(TEMPLATES_MISSING);
    root = await mkdtemp(path.join(tmpdir(), 'create-kai-baseline-edit-'));
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('stops matching the edited file and leaves the rest intact', async () => {
    const dir = path.join(root, 'edited-app');
    await generate(plan(dir), { templateRoot: TEMPLATE_ROOT });
    const kai: { files?: Record<string, string> } = JSON.parse(
      await readFile(path.join(dir, 'kai.json'), 'utf8'),
    );

    const edited = 'src/App.tsx';
    const untouched = 'package.json';
    const recordedEdit = kai.files?.[edited];
    const recordedUntouched = kai.files?.[untouched];
    expect(recordedEdit, `${edited} is not in the baseline`).toBeDefined();
    expect(recordedUntouched, `${untouched} is not in the baseline`).toBeDefined();

    // Before the edit, on disk it matches.
    expect(await bytesHash(path.join(dir, edited))).toBe(recordedEdit);

    const before = await readFile(path.join(dir, edited), 'utf8');
    await writeFile(path.join(dir, edited), `${before}\n// a user edit\n`, 'utf8');

    // The mismatch is what tells `upgrade` "the user changed this".
    expect(await bytesHash(path.join(dir, edited))).not.toBe(recordedEdit);
    // The baseline itself is written once and not rewritten by the edit, so the
    // recorded value is still the scaffold-time one.
    const after: { files?: Record<string, string> } = JSON.parse(
      await readFile(path.join(dir, 'kai.json'), 'utf8'),
    );
    expect(after.files?.[edited]).toBe(recordedEdit);
    // And a file nobody touched still matches, so the mismatch above is the edit
    // and not "every hash stopped matching".
    expect(await bytesHash(path.join(dir, untouched))).toBe(recordedUntouched);
  });
});
