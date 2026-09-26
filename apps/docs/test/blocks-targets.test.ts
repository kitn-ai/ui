/**
 * Spec 5.4: the path /blocks DISPLAYS equals the path `create-kai add` WRITES,
 * for every block and every framework. Both sides read src/targets.ts, so this
 * is cheap and it is the guard on the section 3.4 ruling.
 *
 * It reads the GENERATED artifacts rather than a fixture, because the page
 * reads those exact files: dist/blocks/f/<id>.<form>.json, whose FormFile.target
 * is what BlockCard renders into the tree.
 *
 * f/ CARRIES A MODE DIMENSION NOW, and that is why the completeness assertion
 * below is a NAME SET rather than a file count. The data axis (spec 4) writes
 * `<id>.<form>.<mode>.json` beside the site's trees for every mode a block
 * declares a seam source for, so the directory holds more than one file per
 * block per form and a count would answer a question nobody asked: "how many
 * files are in here" is not "is the site's family complete". The four-segment
 * names are neither expected nor forbidden here -- the COMPILE cells
 * (packages/ui/scripts/lib/block-compile-cells.mjs) are what prove a mock-free
 * tree exists and compiles, and this guard is only about the two-segment-keyed
 * trees the page fetches.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { FRAMEWORK_BLOCK_FORMS } from '@kitn.ai/blocks/forms';
import { fileTarget, isTargetFramework } from '@kitn.ai/blocks/targets';

const require = createRequire(import.meta.url);
const kitRoot = dirname(require.resolve('@kitn.ai/ui/package.json'));
const formsDir = join(kitRoot, 'dist', 'blocks', 'f');

const blockIds = (() => {
  const index = JSON.parse(readFileSync(join(kitRoot, 'dist', 'blocks', 'registry.json'), 'utf8'));
  return (index.items as { name: string }[]).map((i) => i.name);
})();

describe('the displayed path is the written path', () => {
  it('there is at least one block and one framework -- neither axis may be empty', () => {
    expect(blockIds.length).toBeGreaterThan(0);
    expect(FRAMEWORK_BLOCK_FORMS.length).toBeGreaterThan(0);
    // EXPECTED, BUILT FROM THE TWO AXES rather than typed: one site tree per
    // block per form, `<id>.<form>.json`. The count this replaced (files in the
    // directory === blocks x forms) went stale the moment the data axis added
    // `<id>.<form>.<mode>.json` beside them, and a count cannot say WHICH tree
    // is missing -- it only says the arithmetic is off. A name set can: the
    // sorted names must be exactly these, so a missing form is named by its
    // absence from the set and a mode tree cannot stand in for a site tree.
    const expected = blockIds.flatMap((id) => FRAMEWORK_BLOCK_FORMS.map((form) => `${id}.${form.id}.json`));
    // The exact shape the page fetches: `<id>.<form>.json`, three dot-separated
    // segments. A data-mode tree is four (`<id>.<form>.<mode>.json`), so an
    // exact-segment test is what keeps one from standing in for a missing site
    // tree -- and a block id or form id containing a dot would fail loudly here
    // rather than quietly matching the wrong file.
    const siteTrees = readdirSync(formsDir).filter(
      (name) => name.endsWith('.json') && name.split('.').length === 3,
    );
    expect(siteTrees.sort()).toEqual(expected.sort());
  });

  for (const id of blockIds) {
    for (const form of FRAMEWORK_BLOCK_FORMS) {
      it(`${id} x ${form.id}: every FormFile.target equals fileTarget()`, () => {
        // Narrow with the guard rather than casting: a renderer whose id is
        // not in the install-root table has no target to compare against, and
        // `as never` would hide exactly that.
        if (!isTargetFramework(form.id)) {
          throw new Error(
            `${form.id} is a renderer with no row in targets.ts INSTALL_ROOTS, so the page would display a path the CLI cannot write`,
          );
        }
        const payload = JSON.parse(readFileSync(join(formsDir, `${id}.${form.id}.json`), 'utf8'));
        expect(payload.files.length).toBeGreaterThan(0);
        for (const file of payload.files as { path: string; target: string }[]) {
          expect(file.target).toBe(fileTarget(form.id, id, file.path));
        }
      });
    }
  }
});
